import {encodeStoredStateAsync,stateStorageLimit} from './state-storage.js';
import {validateFolder,organiseMedia,libraryFolders} from '../src/cms/media-architecture.js';
import {mediaAction} from './media-service.js';
import {webpSize} from './webp-size.js';
import {proposalPayload,telegramProposalText} from './proposal-payload.js';
import {materialize} from '../src/cms/materialize.js';
import {isOwner} from './owner-auth.js';
import {validateSite,publicSite,references} from '../src/cms/schema.js';
function versionedSite(site,previous){const next=materialize(validateSite(site));for(const field of ['projects','blogPosts']){next[field]=(next[field]||[]).map(doc=>{const before=(previous[field]||[]).find(d=>d.id===doc.id);if(before&&JSON.stringify(before)!==JSON.stringify(doc))return {...doc,_version:(before._version||0)+1,updatedAt:new Date().toISOString()};return doc;});}return next;}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function bounded(request,limit){const reader=request.body?.getReader();if(!reader)return new Uint8Array();let size=0,parts=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Object.assign(Error('Upload exceeds the size limit.'),{status:413});}parts.push(value);}const bytes=new Uint8Array(size);let n=0;for(const part of parts){bytes.set(part,n);n+=part.length;}return bytes;}
export async function contentResponse(request,env,store,media,transform,trustedAccess={}){
 const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/'))return null;if(path.startsWith('/api/owner/'))return null;
 try{
 if(!store)throw Object.assign(Error('Content database is not connected.'),{status:503});
 const owner=await isOwner(request,env)||(trustedAccess.upload&&path==='/api/studio/upload');const privatePath=path.startsWith('/api/studio');
 if(privatePath&&!owner)return json({error:'Owner sign-in required.'},401);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Request origin rejected.'},403);
 const mediaOnly=owner&&(path.startsWith('/api/media/')||['/api/studio/upload','/api/studio/media-state'].includes(path))&&store.readMedia;
 let state=mediaOnly?await store.readMedia():await store.read();
 const libraryWrite=['/api/studio/upload','/api/studio/media-action','/api/studio/media','/api/studio/media-text'].includes(path)&&store.writeMedia;
 const save=async next=>{const organised=libraryWrite?{...next,mediaFolders:libraryFolders(next)}:organiseMedia(next);if(mediaOnly)organised.customMediaFolders=next._registeredCustomMediaFolders??next.customMediaFolders;state=await (libraryWrite?store.writeMedia(organised,state.revision):store.write(organised,state.revision));return state;};
 if(path==='/api/studio/media-state'&&request.method==='GET')return json({...state,mediaFolders:libraryFolders(state),mediaCanUndo:Boolean(state.mediaUndo?.length)});
 if(path==='/api/site'&&request.method==='GET')return json({site:state.publishedAt?publicSite(state.published):null,revision:state.revision});
 if(path==='/api/studio'&&request.method==='GET')return json({...state,capabilities:{storage:env.LOCAL?'local-server':'cloud',s3:!!(env.S3_ENDPOINT&&env.S3_BUCKET&&env.S3_ACCESS_KEY&&env.S3_SECRET_KEY),images:!!transform,turnstile:!!env.TURNSTILE_SECRET_KEY}});
 if(path==='/api/studio/storage'&&request.method==='GET'){
  const assets=new Map();let unknown=0;for(const item of state.media||[])for(const variant of item.variants||[]){const key=JSON.stringify(variant.asset||{id:item.id,width:variant.width});if(!Number.isFinite(variant.size)){unknown++;continue;}assets.set(key,variant.size);}const libraryBytes=[...assets.values()].reduce((a,b)=>a+b,0),storedBytes=store.storageUsage?await store.storageUsage():new TextEncoder().encode(state.historyStorageVersion===1?await encodeStoredStateAsync(state):JSON.stringify(state)).length;
  let cloud=null,cloudError=null;try{if(media.usage)cloud=await media.usage({refresh:url.searchParams.has('refresh')});}catch(error){cloudError=error.message;}const capacity=Number(env.S3_STORAGE_CAPACITY_BYTES)||state.mediaStorageCapacity||null;
  return json({cms:{used:storedBytes,capacity:stateStorageLimit,remaining:Math.max(0,stateStorageLimit-storedBytes)},library:{used:cloud?.used??null,indexedBytes:libraryBytes,capacity,capacitySource:env.S3_STORAGE_CAPACITY_BYTES?'server configuration':'owner-entered plan capacity',remaining:cloud&&capacity?Math.max(0,capacity-cloud.used):null,unknown,...cloud,error:cloudError,scope:cloud?.scope||'Cloud usage could not be verified. Indexed files are not total storage usage.'}});
 }
 if(path==='/api/studio/upload'&&request.method==='POST'){
  const replacement=request.headers.get('X-Replace-Media'),previous=replacement?state.media.find(m=>m.id===replacement&&!m.trashedAt):null;if(replacement&&!previous)return json({error:'Replacement file no longer exists.'},409);
  const folder=validateFolder(state,decodeURIComponent(request.headers.get('X-Media-Folder')||'Site assets'));
  const bytes=await bounded(request,12*1024*1024);const type=request.headers.get('Content-Type')||'';const id=crypto.randomUUID();const name=decodeURIComponent(request.headers.get('X-File-Name')||'Upload').slice(0,180);let variants=[];
  if(['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(type)){
   if(!transform){if(type!=='image/webp'||new TextDecoder().decode(bytes.slice(0,4))!=='RIFF'||new TextDecoder().decode(bytes.slice(8,12))!=='WEBP')throw Object.assign(Error('Upload an optimized WebP image.'),{status:415});variants=[{...webpSize(bytes),bytes}];}else variants=await transform(bytes);for(const v of variants){Object.assign(v,webpSize(v.bytes));v.asset=await media.put(id+'-'+v.width+'.webp',v.bytes,'image/webp');v.size=v.bytes.byteLength;delete v.bytes;}
  }else if(type==='image/svg+xml'){const svg=new TextDecoder().decode(bytes);if(bytes.length>2000000||!/<svg[\s>]/i.test(svg)||/<(?:script|foreignObject|iframe|object|embed|style|animate|set)\b|<!|<\?|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i.test(svg))return json({error:'Use a self-contained SVG without scripts or external resources.'},415);variants=[{width:0,size:bytes.length,asset:await media.put(id+'.svg',bytes,type)}];
  }else if(type==='application/pdf'&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')variants=[{width:0,size:bytes.length,asset:await media.put(id+'.pdf',bytes,type)}];
  else if((type==='video/mp4'&&new TextDecoder().decode(bytes.slice(4,8))==='ftyp')||(type==='video/webm'&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3))variants=[{width:0,size:bytes.length,asset:await media.put(id,bytes,type)}];
  else if(type==='text/plain'&&bytes.length<=512*1024){const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))return json({error:'Choose a UTF-8 text file without binary controls.'},415);variants=[{width:0,size:bytes.length,asset:await media.put(id,bytes,type)}];}
  else if((type==='audio/mpeg'&&(new TextDecoder().decode(bytes.slice(0,3))==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)))||(type==='audio/wav'&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WAVE')||(type==='audio/ogg'&&new TextDecoder().decode(bytes.slice(0,4))==='OggS'))variants=[{width:0,size:bytes.length,asset:await media.put(id,bytes,type)}];
  else return json({error:'Choose an image, PDF, MP4/WebM, MP3/WAV/Ogg or UTF-8 text file.'},415);
  const sourceSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');for(const variant of variants)variant.sourceSha256=sourceSha256;


  const item={...previous,id:previous?.id||id,name,type:variants[0].width?'image/webp':type,url:'/api/media/'+id,variants,alt:decodeURIComponent(request.headers.get('X-Media-Alt')||'').slice(0,300),folder,uploadedAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(previous){item.url='/api/media/'+previous.id;item.createdAt=previous.createdAt;item.fileVersions=[{variants:previous.variants,name:previous.name,type:previous.type,date:previous.updatedAt||previous.createdAt},...(previous.fileVersions||[])].slice(0,5);}await save({...state,media:previous?state.media.map(m=>m.id===previous.id?item:m):[...state.media,item],mediaActivity:[{id:crypto.randomUUID(),action:previous?'replace':'upload',date:new Date().toISOString(),count:1,folder,actor:'Owner'},...(state.mediaActivity||[])].slice(0,100)});return json({item,revision:state.revision});
 }
 if(path.startsWith('/api/media/')&&request.method==='GET'){
  const id=path.slice('/api/media/'.length);const item=state.media.find(m=>m.id===id);if(!item||(!owner&&(item.trashedAt||!references(state.published,id))))return json({error:'Media not found.'},404);
  const width=Number(url.searchParams.get('w'))||1920;const variant=item.variants.find(v=>v.width>=width)||item.variants.at(-1);const response=await media.get(variant.asset);return new Response(response.body,{headers:{'Content-Type':item.type,'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox",'X-Content-Type-Options':'nosniff','Cache-Control':owner?'private, no-store':'public, max-age=3600',...(item.type==='application/pdf'?{'Content-Disposition':(owner&&url.searchParams.has('preview')?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(item.name)}:{})}});
 }
 if(path==='/api/studio/media-text'){
  if(!owner)return json({error:'Owner access required.'},401);
  const body=request.method==='POST'?JSON.parse(new TextDecoder().decode(await bounded(request,600000))):null;const item=state.media.find(m=>m.id===(body?.id||url.searchParams.get('id'))&&!m.trashedAt);if(!item||item.type!=='text/plain')return json({error:'Choose an existing text file.'},404);
  if(!body){const response=await media.get(item.variants.at(-1).asset);return json({id:item.id,text:await response.text(),revision:state.revision});}
  if(body.revision!==state.revision)return json({error:'The library changed. Refresh before saving.'},409);if(typeof body.text!=='string'||new TextEncoder().encode(body.text).length>512*1024||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body.text))return json({error:'Use UTF-8 text up to 512 KB.'},400);
  const previous={variants:item.variants,name:item.name,type:item.type,date:item.updatedAt||item.createdAt};const bytes=new TextEncoder().encode(body.text);item.fileVersions=[previous,...(item.fileVersions||[])].slice(0,5);item.variants=[{width:0,size:bytes.length,asset:await media.put('text-'+crypto.randomUUID(),bytes,'text/plain')}];item.updatedAt=new Date().toISOString();await save(state);return json({ok:true,revision:state.revision});
 }
 if(path==='/api/config'&&request.method==='GET')return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY||'',local:!!env.LOCAL,deliveryReady:!!(env.LOCAL||(env.PUBLIC_RATE_LIMITER&&env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY))});
 if(path==='/api/inquiry'&&request.method==='POST'){
  if(!env.PUBLIC_RATE_LIMITER||!(await env.PUBLIC_RATE_LIMITER.limit({key:'inquiry:'+ (request.headers.get('CF-Connecting-IP')||'local')})).success)return json({error:'Please try again in a minute.'},429);
  const body=JSON.parse(new TextDecoder().decode(await bounded(request,16000)));
  if(body.website_trap)return json({ok:true});
  if(!env.LOCAL){if(!env.TURNSTILE_SECRET_KEY)return json({error:'Contact delivery is being configured. Please try again later.'},503);const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:body.token||''})}).then(r=>r.json());if(!result.success||result.hostname!==url.hostname)return json({error:'Please complete the verification.'},400);}
  const fields=body.fields||{};if(!String(fields.name||'').trim()||!/^\S+@\S+\.\S+$/.test(fields.email||''))return json({error:'Please provide your name and a valid email.'},400);
  if(body.reason==='proposal'&&(!String(fields.company||'').trim()||!String(fields.services||'').trim()||!String(fields.industry||'').trim()||String(fields.message||'').trim().length<10))return json({error:'Add your company, choose services and industry, and describe the project.'},400);
  const item={id:crypto.randomUUID(),reason:body.reason==='proposal'?'proposal':body.reason==='hr'?'hr':'client',fields:Object.fromEntries(Object.entries(fields).slice(0,20).filter(([k])=>/^[\w-]{1,50}$/.test(k)).map(([k,v])=>[k,String(v).slice(0,4000)])),createdAt:new Date().toISOString(),status:'new'};if(item.reason==='proposal'){item.proposal=proposalPayload(item);item.delivery={channel:'telegram',status:'not_configured',text:telegramProposalText(item.proposal)};}await save({...state,inbox:[item,...state.inbox].slice(0,1000)});return json({ok:true});
 }
 if(path==='/api/event'&&request.method==='POST'){
  if(!state.published.settings.analytics)return json({ok:true});
  if(!env.PUBLIC_RATE_LIMITER||!(await env.PUBLIC_RATE_LIMITER.limit({key:'event:'+(request.headers.get('CF-Connecting-IP')||'local')})).success)return json({ok:true});
  const body=JSON.parse(new TextDecoder().decode(await bounded(request,1000)));if(!['page','resume','contact-start','contact-submit'].includes(body.event)||typeof body.path!=='string'||!/^\/[a-zA-Z0-9/_-]*$/.test(body.path)||body.path.length>150)return json({error:'Invalid event'},400);
  const key=new Date().toISOString().slice(0,10)+'|'+body.event+'|'+body.path;const events={...state.events};if(!events[key]&&Object.keys(events).length>=5000)return json({ok:true});events[key]=(events[key]||0)+1;await save({...state,events});return json({ok:true});
 }
 if(privatePath&&request.method==='POST'){
  const body=JSON.parse(new TextDecoder().decode(await bounded(request,8*1024*1024)));
  // Activate only after every deployed reader supports the lossless history codec.
  if(path==='/api/studio/storage'){
   if(body.action==='media-capacity'){if(body.revision!==state.revision)return json({error:'The library changed. Refresh before trying again.'},409);if(body.bytes!==null&&(!Number.isSafeInteger(body.bytes)||body.bytes<=0||body.bytes>10**15))return json({error:'Use a valid storage capacity.'},400);await save({...state,mediaStorageCapacity:body.bytes});return json({ok:true,revision:state.revision});}
   if(body.action!=='compact-history')return json({error:'Choose a supported storage action.'},400);
   if(body.revision!==state.revision)return json({error:'Content changed. Reload before compacting history.'},409);
   await save({...state,historyStorageVersion:1});return json({ok:true,revision:state.revision,historyStorageVersion:1});
  }
  // Draft writes use a draft-specific revision so inbox/events cannot invalidate edits.
  if(['save','publish','restore','import'].includes(path.split('/').at(-1))&&body.draftVersion!==(state.draftVersion||0))return json({error:'A newer draft exists. Reload before saving.'},409);
  if(path==='/api/studio/save'||path==='/api/studio/import'){
   const draft=versionedSite(body.site,state.draft);await save({...state,draft,draftVersion:(state.draftVersion||0)+1});return json({draftVersion:state.draftVersion});
  }
  if(path==='/api/studio/publish'){
   const draft=versionedSite(body.site,state.draft);const history=[{id:crypto.randomUUID(),date:new Date().toISOString(),site:state.published},...state.history].slice(0,3);await save({...state,draft,published:structuredClone(draft),publishedAt:new Date().toISOString(),history,draftVersion:(state.draftVersion||0)+1});return json({draftVersion:state.draftVersion});
  }
  if(path==='/api/studio/restore'){
   const version=state.history.find(v=>v.id===body.id);if(!version)return json({error:'Version not found'},404);await save({...state,draft:structuredClone(validateSite(version.site)),draftVersion:(state.draftVersion||0)+1});return json({draft:state.draft,draftVersion:state.draftVersion});
  }
  if(path==='/api/studio/media-action'){await save(mediaAction(state,body));return json({ok:true,revision:state.revision});}
  if(path==='/api/studio/media'){
   const item=state.media.find(m=>m.id===body.id);if(!item)return json({error:'Media not found'},404);item.alt=String(body.alt||'').slice(0,300);item.folder=validateFolder(state,String(body.folder||item.folder||'Site assets'));item.name=String(body.name||item.name).slice(0,180);await save(state);return json({ok:true});
  }
  if(path==='/api/studio/inquiry'){
   await save({...state,inbox:body.remove?state.inbox.filter(i=>i.id!==body.id):state.inbox.map(i=>i.id===body.id?{...i,status:body.status==='done'?'done':'new'}:i)});return json({ok:true});
  }
 }
 return json({error:'Not found'},404);
 }catch(error){return json({error:error.status?error.message:'The operation could not be completed. Please retry.'},error.status||500);}
}
