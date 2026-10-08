import {isOwner} from './owner-auth.js';
import {bounded} from './content-api.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
import {backupManifest,validateManifest,checksum} from '../src/cms/media-backup-format.js';
export {backupManifest,validateManifest,checksum};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function backupReader(request,env){
 if(request.method!=='GET'||!env.BACKUP_READ_TICKET)return false;
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return false;
 try{const ticket=JSON.parse(env.BACKUP_READ_TICKET);if(Date.parse(ticket.expiresAt)<=Date.now())return false;const digest=await checksum(new TextEncoder().encode(token));return digest===ticket.hash;}catch{return false;}
}
export async function mediaBackupResponse(request,env,store,storage){
 const url=new URL(request.url),base='/api/studio/media-backup';if(!url.pathname.startsWith(base))return null;
 if(!await isOwner(request,env)&&!await backupReader(request,env))return json({error:'Owner access required.'},401);
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Request origin rejected.'},403);
 try{
 const read=()=>store.readMedia?store.readMedia():store.read();
 if(url.pathname===base&&request.method==='GET')return json(backupManifest(await read()));
 if(url.pathname===base+'/file'&&request.method==='GET'){
 const state=await read(),m=state.media.find(m=>m.id===url.searchParams.get('id')),v=m?.variants[Number(url.searchParams.get('variant'))];if(!v)fail('File no longer exists.',404);
 if(url.searchParams.get('source')!==JSON.stringify(v.asset))fail('Media changed. Start a new backup.',409);
 const response=await storage.get(v.asset),bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==v.size)fail('File verification failed.',422);
 return new Response(bytes,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 const kv=env.DESARTLY_AUTH;if(!kv)fail('Backup service unavailable.',503);
 if(url.pathname===base+'/restore'&&request.method==='POST'){
 const manifest=validateManifest(JSON.parse(new TextDecoder().decode(await bounded(request,600000)))),state=await read(),id=crypto.randomUUID();
 const baseline=Object.fromEntries(manifest.media.map(m=>[m.id,JSON.stringify(state.media.find(x=>x.id===m.id)||null)]));
 await kv.put('media-restore:'+id,JSON.stringify({manifest,baseline}),{expirationTtl:86400});return json({session:id});
 }
 const session=url.searchParams.get('session');if(!/^[a-f0-9-]{36}$/.test(session||''))fail('Invalid restore session.');
 const plan=await kv.get('media-restore:'+session,'json');if(!plan)fail('Restore session expired. Please start again.',410);
 if(url.pathname===base+'/restore-file'&&request.method==='POST'){
 const m=plan.manifest.media.find(m=>m.id===url.searchParams.get('id')),i=Number(url.searchParams.get('variant')),v=m?.variants[i];if(!v)fail('Unknown backup file.');
 const bytes=await bounded(request,v.size);if(bytes.length!==v.size||await checksum(bytes)!==v.sha256)fail('Backup checksum failed.',422);
 const asset=await storage.put(`restore-${session}-${m.id}-${i}`,bytes,m.type),response=await storage.get(asset);if(await checksum(await response.arrayBuffer())!==v.sha256)fail('Restored file verification failed.',422);
 await kv.put(`media-restore-file:${session}:${m.id}:${i}`,JSON.stringify(asset),{expirationTtl:86400});return json({saved:true});
 }
 if(url.pathname===base+'/commit'&&request.method==='POST'){
 if(plan.completed)return json({restored:plan.manifest.media.length});
 const restored=[];for(const m of plan.manifest.media){const variants=[];for(let i=0;i<m.variants.length;i++){const asset=await kv.get(`media-restore-file:${session}:${m.id}:${i}`,'json');if(!asset)fail('Upload all backup files before restoring.',409);const v=m.variants[i];variants.push({width:v.width,size:v.size,asset});}restored.push({...m,url:'/api/media/'+m.id,variants});}
 const state=await read();for(const m of restored)if(JSON.stringify(state.media.find(x=>x.id===m.id)||null)!==plan.baseline[m.id])fail('Media changed during restore. Start again to keep your latest edits.',409);
 const byId=new Map(restored.map(m=>[m.id,m]));state.media=state.media.map(m=>byId.get(m.id)||m);for(const m of restored)if(!state.media.some(x=>x.id===m.id))state.media.push(m);
 state.customMediaFolders=[...new Set([...(state.customMediaFolders||[]),...plan.manifest.folders,...restored.map(m=>m.folder)])];state.mediaFolderLocations={...state.mediaFolderLocations,...plan.manifest.locations};
 await (store.writeMedia?store.writeMedia(state,state.revision):store.write(state,state.revision));await kv.put('media-restore:'+session,JSON.stringify({...plan,completed:true}),{expirationTtl:86400});return json({restored:restored.length});
 }
 return json({error:'Unsupported backup action.'},405);
 }catch(e){return json({error:e.status?e.message:'Backup operation failed. Please retry.'},e.status||500);}
}
