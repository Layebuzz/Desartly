import {Zip,ZipPassThrough,Unzip,UnzipInflate,strToU8,strFromU8} from 'fflate';
import {validateManifest,checksum} from './media-backup-format.js';
export async function createMediaArchive(manifest,load,onProgress=()=>{}){
 const chunks=[];let failure;const zip=new Zip((error,data)=>{if(error)failure=error;else chunks.push(data);});
 const add=(path,bytes)=>{const entry=new ZipPassThrough(path);zip.add(entry);entry.push(bytes,true);if(failure)throw failure;};
 let done=0;const total=manifest.media.reduce((n,m)=>n+m.variants.length,0);const copy=structuredClone(manifest);
 for(const m of copy.media)for(let i=0;i<m.variants.length;i++){const v=m.variants[i],bytes=new Uint8Array(await load(m,i,v));if(bytes.length!==v.size)throw Error('A file changed or could not be downloaded. Please retry.');v.sha256=await checksum(bytes);delete v.source;add(v.path,bytes);onProgress(++done,total);}
 validateManifest(copy);add('manifest.json',strToU8(JSON.stringify(copy)));zip.end();if(failure)throw failure;return new Blob(chunks,{type:'application/zip'});
}
export async function readMediaArchive(file){
 if(file.size>510*1024*1024)throw Error('Backup exceeds the 500 MB limit.');
 const entries=new Map();let total=0,error;const unzip=new Unzip(entry=>{
 if(entries.size>=40001||entries.has(entry.name)||entry.name.length>900||entry.name.split('/').some(p=>!p||p==='.'||p==='..')||/[\\\x00-\x1f]/.test(entry.name)||!/^manifest\.json$|^files\/.+\/[a-zA-Z0-9-]{1,80}--[0-7]--[^/]+$/.test(entry.name)){error=Error('Invalid or duplicate archive path.');return;}
 const limit=entry.name==='manifest.json'?600000:12*1024*1024;if(entry.originalSize>limit){error=Error('Archive entry exceeds the size limit.');return;}
 const parts=[];let size=0;entries.set(entry.name,null);entry.ondata=(e,data,final)=>{if(e){error=e;return;}size+=data.length;total+=data.length;if(size>limit||total>501*1024*1024){error=Error('Archive exceeds the size limit.');entry.terminate();return;}parts.push(data);if(final){const bytes=new Uint8Array(size);let p=0;for(const part of parts){bytes.set(part,p);p+=part.length;}entries.set(entry.name,bytes);}};entry.start();
 });unzip.register(UnzipInflate);const reader=file.stream().getReader();try{for(;;){const {done,value}=await reader.read();if(done)break;unzip.push(value,false);if(error)throw error;}unzip.push(new Uint8Array(),true);if(error)throw error;}finally{await reader.cancel();}
 if(!entries.get('manifest.json'))throw Error('Backup manifest is missing.');
 const manifest=validateManifest(JSON.parse(strFromU8(entries.get('manifest.json'))));let expected=1;
 for(const m of manifest.media)for(const v of m.variants){expected++;const bytes=entries.get(v.path);if(!bytes||bytes.length!==v.size||await checksum(bytes)!==v.sha256)throw Error('Backup is incomplete or a file checksum does not match.');}
 if(entries.size!==expected)throw Error('Archive contains unexpected files.');return {manifest,entries};
}
