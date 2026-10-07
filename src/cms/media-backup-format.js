import {libraryFolders} from './media-architecture.js';
export const checksum=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const safeFolder=s=>typeof s==='string'&&s.length<=500&&!s.split('/').some(p=>!p||p==='.'||p==='..')&&!/[\\\x00-\x1f]/.test(s);
const types=new Set(['image/webp','image/jpeg','image/png','image/gif','image/svg+xml','image/avif','application/pdf']);
export const mediaArchivePath=(m,i)=>`files/${m.folder}/${m.id}--${i}--${m.name.replace(/[\\/\x00-\x1f<>:"|?*]/g,'_').slice(0,180)||'file'}`;
export function backupManifest(state){return {format:'desartly-media',version:1,createdAt:new Date().toISOString(),folders:libraryFolders(state),locations:state.mediaFolderLocations||{},media:state.media.map(m=>({...Object.fromEntries(['id','name','alt','folder','type','createdAt','trashedAt'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]])),variants:m.variants.map((v,i)=>({width:v.width,size:v.size,path:mediaArchivePath(m,i),source:JSON.stringify(v.asset)}))}))};}
export function validateManifest(value){
 if(value?.format!=='desartly-media'||value.version!==1||!Array.isArray(value.media)||value.media.length>5000||!Array.isArray(value.folders)||value.folders.length>5000)fail('Invalid Desartly backup.');
 const ids=new Set();let total=0;
 const media=value.media.map(m=>{if(!/^[a-zA-Z0-9-]{1,80}$/.test(m.id)||ids.has(m.id)||!safeFolder(m.folder)||!types.has(m.type)||typeof m.name!=='string'||m.name.length>180||!Array.isArray(m.variants)||!m.variants.length||m.variants.length>8)fail('Invalid media metadata.');if((m.alt!==undefined&&(typeof m.alt!=='string'||m.alt.length>1000))||['createdAt','trashedAt'].some(k=>m[k]!==undefined&&m[k]!==null&&(typeof m[k]!=='string'||m[k].length>100)))fail('Invalid media details.');ids.add(m.id);return {...Object.fromEntries(['id','name','alt','folder','type','createdAt','trashedAt'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]])),variants:m.variants.map((v,i)=>{if(v.path!==mediaArchivePath(m,i)||!Number.isInteger(v.size)||v.size<1||v.size>12*1024*1024||!Number.isFinite(v.width)||v.width<0||v.width>40000||!/^\w{64}$/.test(v.sha256)||!/^[0-9a-f]+$/.test(v.sha256))fail('Invalid file metadata.');total+=v.size;return {path:v.path,width:v.width,size:v.size,sha256:v.sha256};})};});
 if(total>500*1024*1024||value.folders.some(f=>!safeFolder(f)))fail('Backup exceeds supported limits.');
 const locations=value.locations||{};if(typeof locations!=='object'||Array.isArray(locations)||Object.entries(locations).some(([k,v])=>k.length>180||['__proto__','constructor','prototype'].includes(k)||!safeFolder(v)))fail('Invalid folder locations.');
 return {format:value.format,version:1,media,folders:value.folders,locations};
}
