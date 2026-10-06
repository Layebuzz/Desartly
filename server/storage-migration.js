import {B2Media} from './b2.js';
import {S3Media,s3Request} from './s3.js';

const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
// Migration changes only asset locations after an exact-byte round trip.
export async function migrateMedia(store,env,ids){
 const source=new B2Media(env),target=new S3Media(env),results=[];
 const snapshot=await store.read();
 for(const id of ids){
  const item=snapshot.media.find(m=>m.id===id);if(!item){results.push({id,status:'missing'});continue;}
  const replacements=[];
  for(let i=0;i<item.variants.length;i++){
   const variant=item.variants[i];if(variant.asset.storage==='s3')continue;
   if(!variant.asset.fileId)throw Object.assign(Error('Unsupported source asset.'),{status:422});
   const bytes=new Uint8Array(await(await source.get(variant.asset)).arrayBuffer());
   if(variant.size!==bytes.byteLength)throw Object.assign(Error('Source file size does not match the media library.'),{status:422});
   const checksum=await digest(bytes);
   const extension=item.type==='image/webp'?'.webp':item.type==='image/svg+xml'?'.svg':item.type==='application/pdf'?'.pdf':'';
   const asset=await target.put(`${item.id}-${variant.width}-${variant.asset.fileId}${extension}`,bytes,item.type);
   // Bypass the delivery cache to verify the actual destination object.
   const readback=await s3Request(target.config,'GET',asset.key);
   if(!readback.ok||checksum!==await digest(await readback.arrayBuffer()))throw Object.assign(Error('Destination file verification failed.'),{status:422});
   replacements.push({index:i,before:variant.asset,after:asset,sha256:checksum});
  }
  if(replacements.length){
   let saved=false;
   for(let attempt=0;attempt<3&&!saved;attempt++){
    const current=await store.read(),live=current.media.find(m=>m.id===id);
    if(!live)throw Object.assign(Error('Media changed during migration.'),{status:409});
    for(const change of replacements){
     const existing=live.variants[change.index]?.asset;
     if(JSON.stringify(existing)!==JSON.stringify(change.before)&&JSON.stringify(existing)!==JSON.stringify(change.after))throw Object.assign(Error('Media changed during migration.'),{status:409});
     live.variants[change.index].asset=change.after;
    }
    try{await store.write(current,current.revision);saved=true;}catch(error){if(error.status!==409||attempt===2)throw error;}
   }
  }
  results.push({id,status:replacements.length?'migrated':'already-migrated',variants:replacements});
 }
 return results;
}

export async function migrationResponse(request,env,store){
 const url=new URL(request.url);
 if(url.pathname!=='/api/__media-migration')return null;
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 if(!env.MEDIA_MIGRATION_TOKEN||env.MEDIA_MIGRATION_TOKEN.length<40||request.headers.get('Authorization')!=='Bearer '+env.MEDIA_MIGRATION_TOKEN)return new Response('{}',{status:404,headers});
 if(request.method!=='POST')return new Response('{}',{status:405,headers});
 try{
  const text=await request.text();if(text.length>1000)throw Object.assign(Error('Request too large.'),{status:413});
  const {ids}=JSON.parse(text);if(!Array.isArray(ids)||!ids.length||ids.length>3||ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id)))throw Object.assign(Error('Invalid media IDs.'),{status:400});
  return new Response(JSON.stringify({results:await migrateMedia(store,env,ids)}),{headers});
 }catch(error){return new Response(JSON.stringify({error:error.message,code:error.storageCode}),{status:error.status||500,headers});}
}
