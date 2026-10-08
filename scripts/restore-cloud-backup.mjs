import{readFile,writeFile,mkdir}from'node:fs/promises';import{createDecipheriv}from'node:crypto';import{spawnSync}from'node:child_process';import{resolve}from'node:path';
const [file,keyFile,output]=process.argv.slice(2);if(!file||!keyFile||!output)throw Error('Usage: node scripts/restore-cloud-backup.mjs BACKUP KEY ISOLATED_OUTPUT_DIRECTORY');
const destination=resolve(output);await mkdir(destination,{recursive:true,mode:0o700});
const envelope=JSON.parse(await readFile(file)),key=await readFile(keyFile);if(envelope.format!=='desartly-cloud-recovery-v1'||envelope.cipher!=='aes-256-gcm')throw Error('Unsupported backup.');
const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));const plain=Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]);const bundle=JSON.parse(plain);
const database=resolve(destination,'recovered.sqlite');
const result=spawnSync('python3',['-c',`import sys,json,sqlite3,os
b=json.load(sys.stdin);path=sys.argv[1]
if os.path.exists(path): raise RuntimeError('Refusing to overwrite existing database')
db=sqlite3.connect(path)
for t in b['schema']:
 db.execute(t['sql'])
 for row in b['tables'][t['name']]:
  cols=list(row);db.execute('INSERT INTO "'+t['name']+'" ('+','.join('"'+c+'"' for c in cols)+') VALUES ('+','.join('?' for c in cols)+')',[row[c] for c in cols])
db.commit();assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
print('SQLite integrity: ok')`,database],{input:plain,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);
await writeFile(resolve(destination,'kv.json'),JSON.stringify(bundle.kv,null,2),{mode:0o600,flag:'wx'});await writeFile(resolve(destination,'restore-notes.json'),JSON.stringify({createdAt:bundle.createdAt,secretNames:bundle.secretNames,limitations:bundle.limitations},null,2),{mode:0o600,flag:'wx'});console.log(result.stdout.trim());console.log('Isolated restore complete. No production changes.');
