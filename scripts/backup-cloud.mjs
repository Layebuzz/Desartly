// Offline recovery bundle: database schema/rows plus durable KV settings.
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {resolve} from 'node:path';
const destination=resolve(process.argv[2]||'../backups'),keyPath=resolve(process.argv[3]||'../backup-recovery.key');
await mkdir(destination,{recursive:true,mode:0o700});
const wrangler=JSON.parse((await readFile('wrangler.jsonc','utf8')).replace(/^\s*\/\/.*$/gm,''));
const account='f4b1108ab283470d34628c2f3d67c77a',db=wrangler.d1_databases[0].database_id,namespace=wrangler.kv_namespaces[0].id;
const login=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'whoami'],{encoding:'utf8',timeout:60000});if(login.status!==0)throw Error('Cloudflare authentication refresh failed.');
const config=await readFile('/Users/ali/.wrangler/config/default.toml','utf8'),token=config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];if(!token)throw Error('Sign in using wrangler login first.');
function request(path,body,raw=false){
 const cfg=['silent','show-error','fail','max-time = 40','url = '+JSON.stringify('https://api.cloudflare.com/client/v4/accounts/'+account+'/'+path),'header = '+JSON.stringify('Authorization: Bearer '+token)];
 if(body!==undefined)cfg.push('request = "POST"','header = "Content-Type: application/json"','data = '+JSON.stringify(JSON.stringify(body)));
 const result=spawnSync('curl',['--config','-'],{input:cfg.join('\n'),encoding:'utf8',maxBuffer:40*1024*1024});if(result.status!==0)throw Error('Cloudflare backup request failed. No new backup committed.');
 if(raw)return result.stdout;const data=JSON.parse(result.stdout);if(!data.success)throw Error('Cloudflare rejected the backup request.');return data.result;
}
const query=sql=>request('d1/database/'+db+'/query',{sql})[0].results;
const schema=query("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
const bundle={format:'desartly-cloud-recovery-v1',createdAt:new Date().toISOString(),schema,tables:{},kv:{},secretNames:['OWNER_PASSWORD','OWNER_SESSION_SECRET','S3_ACCESS_KEY','S3_SECRET_KEY','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],limitations:['Worker secret values cannot be exported by Cloudflare. Restore them separately.','Media bytes are in the media ZIP, not this bundle.']};
const before=query('SELECT revision FROM portfolio_state WHERE id=1')[0].revision;
for(const {name}of schema){if(!/^[\w]+$/.test(name))throw Error('Invalid table name');bundle.tables[name]=query('SELECT * FROM '+name);}
for(const item of request('storage/kv/namespaces/'+namespace+'/keys'))if(item.name.startsWith('google-calendar:')||item.name.startsWith('owner:'))bundle.kv[item.name]=request('storage/kv/namespaces/'+namespace+'/values/'+encodeURIComponent(item.name),undefined,true);
for(const {name}of schema)if(JSON.stringify(bundle.tables[name])!==JSON.stringify(query('SELECT * FROM '+name)))throw Error('Database changed during backup. Retry.');
if(before!==query('SELECT revision FROM portfolio_state WHERE id=1')[0].revision)throw Error('Content changed during backup. Retry.');
const plain=Buffer.from(JSON.stringify(bundle));
// Independently restore every SQL table into isolated SQLite before accepting the bundle.
const verify=spawnSync('python3',['-c',`import sys,json,sqlite3
b=json.load(sys.stdin);db=sqlite3.connect(':memory:')
for t in b['schema']:
 db.execute(t['sql'])
 for row in b['tables'][t['name']]:
  cols=list(row);db.execute('INSERT INTO "'+t['name']+'" ('+','.join('"'+c+'"' for c in cols)+') VALUES ('+','.join('?' for c in cols)+')',[row[c] for c in cols])
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
print('ok')`],{input:plain,encoding:'utf8',maxBuffer:1024*1024});if(verify.status!==0)throw Error('Independent database restore check failed: '+verify.stderr);
let key;try{key=await readFile(keyPath);}catch(e){if(e.code!=='ENOENT')throw e;key=randomBytes(32);await writeFile(keyPath,key,{mode:0o600,flag:'wx'});}if(key.length!==32)throw Error('Recovery key must contain 32 bytes.');await chmod(keyPath,0o600);
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(plain),cipher.final()]),tag=cipher.getAuthTag();
const unpack=createDecipheriv('aes-256-gcm',key,iv);unpack.setAuthTag(tag);const restored=Buffer.concat([unpack.update(encrypted),unpack.final()]);if(!restored.equals(plain))throw Error('Encryption recovery check failed.');
const output=resolve(destination,'desartly-cloud-'+bundle.createdAt.replace(/[:.]/g,'-')+'.enc.json');
await writeFile(output,JSON.stringify({format:bundle.format,cipher:'aes-256-gcm',iv:iv.toString('base64'),tag:tag.toString('base64'),data:encrypted.toString('base64')}),{mode:0o600,flag:'wx'});
const proof={createdAt:bundle.createdAt,file:output,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),tables:schema.map(t=>({name:t.name,rows:bundle.tables[t.name].length})),kvKeys:Object.keys(bundle.kv),contentRevision:before,sqliteIntegrity:'ok',encryptionRoundTrip:true,limitations:bundle.limitations};
await writeFile(output+'.proof.json',JSON.stringify(proof,null,2),{mode:0o600});console.log(JSON.stringify(proof,null,2));
