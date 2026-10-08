import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://desartly.layebuzz.workers.dev';
const sessionFile=process.argv[2];if(!sessionFile)throw Error('Provide a temporary existing owner-session JSON file; never commit it.');
await mkdir(new URL('../.pol-data/',import.meta.url),{recursive:true});
const {cookies}=JSON.parse(await readFile(sessionFile,'utf8'));
const cookie=cookies.filter(c=>c.name==='pol_owner').map(c=>c.name+'='+c.value).join('; ');if(!cookie)throw Error('Missing owner session');
const manifest=JSON.parse(await readFile(new URL('../server/static-assets.json',import.meta.url),'utf8'));
let receipt;try{receipt=JSON.parse(await readFile(new URL('../.pol-data/static-migration-progress.json',import.meta.url),'utf8'));}catch{receipt={assets:{}};}receipt.verifiedAt=new Date().toISOString();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function request(url,options={}){let last;for(let attempt=0;attempt<3;attempt++){try{return await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(120000)});}catch(error){last=error;}}throw last;}
async function verify(signed,asset){
 const size=1024*1024;
 async function part(start,end){let last;for(let attempt=0;attempt<3;attempt++){try{const r=await request(signed.url,{headers:{...signed.headers,Range:'bytes='+start+'-'+end}});if(!r.ok){await r.arrayBuffer();return null;}if(r.status!==206)throw Error('Storage range support is required.');const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length!==end-start+1)throw Error('Incomplete range.');return bytes;}catch(error){last=error;}}throw last;}
 const first=await part(0,Math.min(size,asset.size)-1);if(!first)return false;const hash=createHash('sha256');hash.update(first);
 for(let offset=size;offset<asset.size;offset+=4*size){const starts=[];for(let i=0;i<4&&offset+i*size<asset.size;i++)starts.push(offset+i*size);const results=await Promise.allSettled(starts.map(start=>part(start,Math.min(start+size,asset.size)-1)));for(const r of results){if(r.status==='rejected')throw r.reason;if(!r.value)return false;hash.update(r.value);}}
 return hash.digest('hex')===asset.sha256;
}
async function upload(path,input){const target=origin+'/api/studio/static-assets?asset='+encodeURIComponent(path),headers={Cookie:cookie,Origin:origin,'Content-Type':'application/octet-stream'};
 if(input.length<=256*1024){const r=await request(target,{method:'POST',headers,body:input});await r.arrayBuffer();if(!r.ok)throw Error('Upload failed '+r.status);return;}
 console.log('Uploading bounded file:',path);
 for(let offset=0,chunk=0;offset<input.length;offset+=256*1024,chunk++){const r=await request(target+'&chunk='+chunk,{method:'POST',headers,body:input.subarray(offset,offset+256*1024)});await r.arrayBuffer();if(!r.ok)throw Error('Chunk upload failed '+r.status);}
 const r=await request(target+'&complete=1',{method:'POST',headers});await r.arrayBuffer();if(!r.ok)throw Error('Assembly failed '+r.status);
}

const entries=Object.entries(manifest);let done=0;
for(let start=0;start<entries.length;start+=4){const results=await Promise.allSettled(entries.slice(start,start+4).map(async ([path,asset])=>{
 if(receipt.assets[path]!==asset.sha256){
  const auth=await request(origin+'/api/studio/static-assets?asset='+encodeURIComponent(path)+'&direct=1',{method:'POST',headers:{Cookie:cookie,Origin:origin}});if(!auth.ok)throw Error('Static authorization failed: '+auth.status);const signed=await auth.json();
  if(!await verify(signed.download,asset)){
   const input=await readFile(new URL('../public'+path,import.meta.url));if(digest(input)!==asset.sha256)throw Error('Source changed: '+path);
   await upload(path,input);
   if(!await verify(signed.download,asset))throw Error('ParsPack round-trip checksum failed: '+path);
  }
  receipt.assets[path]=asset.sha256;console.log('Verified:',path);
  if(asset.size>256*1024){const cleared=await request(origin+'/api/studio/static-assets?asset='+encodeURIComponent(path)+'&discard=1',{method:'POST',headers:{Cookie:cookie,Origin:origin}});await cleared.arrayBuffer();}
 }
 done++;
}));for(const result of results)if(result.status==='rejected')throw result.reason;await writeFile(new URL('../.pol-data/static-migration-progress.json',import.meta.url),JSON.stringify(receipt,null,2));}
await writeFile(new URL('../server/static-migration.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log({complete:true,files:done});
