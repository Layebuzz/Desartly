import assets from './static-assets.json' with {type:'json'};
import {isOwner} from './owner-auth.js';
import {bounded} from './content-api.js';
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
// Only previously-public, content-addressed files in the manifest can be migrated.
export async function staticAssetResponse(request,env,media,{manifest=assets,owner=isOwner}={}){
 const url=new URL(request.url),upload=url.pathname==='/api/studio/static-assets';
 const path=url.pathname==='/api/static'?url.searchParams.get('asset'):url.pathname;
 if(!upload&&url.pathname!=='/api/static'&&!Object.hasOwn(manifest,path))return null;
 try{
  if(upload){
   if(!await owner(request,env))return Response.json({error:'Owner sign-in required.'},{status:401});
   if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
   if(request.headers.get('Origin')!==url.origin)return Response.json({error:'Request origin rejected.'},{status:403});
   const name=url.searchParams.get('asset');const asset=Object.hasOwn(manifest,name)?manifest[name]:null;if(!asset)return Response.json({error:'Unknown static asset.'},{status:404});
   if(url.searchParams.get('direct')==='1')return Response.json(await media.authorizeStatic(asset),{headers:{'Cache-Control':'private, no-store'}});
   const chunkSize=256*1024,chunkCount=Math.ceil(asset.size/chunkSize);
   const staged=part=>'private/static-staging/'+asset.sha256+'/'+part;
   if(url.searchParams.get('discard')==='1'){const results=await Promise.allSettled(Array.from({length:chunkCount},(_,part)=>media.discardStaged(staged(part))));return Response.json({ok:results.every(r=>r.status==='fulfilled')});}
   if(url.searchParams.has('chunk')){
    const part=Number(url.searchParams.get('chunk'));
    if(!Number.isInteger(part)||part<0||part>=chunkCount)return Response.json({error:'Invalid chunk.'},{status:400});
    const expected=Math.min(chunkSize,asset.size-part*chunkSize),bytes=await bounded(request,expected);
    if(bytes.length!==expected)return Response.json({error:'Incomplete chunk.'},{status:422});
    await media.put(staged(part),bytes,'application/octet-stream');return Response.json({ok:true,chunk:part});
   }
   if(url.searchParams.get('complete')==='1'){
    const bytes=new Uint8Array(asset.size);
    for(let part=0;part<chunkCount;part++){
     const response=await media.get({storage:'s3',key:'desartly/'+staged(part)});
     const chunk=new Uint8Array(await response.arrayBuffer());
     if(chunk.length!==Math.min(chunkSize,asset.size-part*chunkSize))return Response.json({error:'Incomplete staged file.'},{status:422});
     bytes.set(chunk,part*chunkSize);
    }
    if(await digest(bytes)!==asset.sha256)return Response.json({error:'Static asset checksum mismatch.'},{status:422});
    await media.put(asset.key,bytes,asset.type);
    return Response.json({ok:true,sha256:asset.sha256,size:asset.size});
   }
   const bytes=await bounded(request,asset.size);if(bytes.length!==asset.size||await digest(bytes)!==asset.sha256)return Response.json({error:'Static asset checksum mismatch.'},{status:422});
   await media.put(asset.key,bytes,asset.type);return Response.json({ok:true,sha256:asset.sha256,size:asset.size});
  }
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const asset=Object.hasOwn(manifest,path)?manifest[path]:null;if(!asset)return new Response('Not found',{status:404});
  let range;const requested=request.headers.get('Range');
  if(requested){const match=requested.match(/^bytes=(\d+)-(\d*)$/);if(!match)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+asset.size}});const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):asset.size-1,asset.size-1);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+asset.size}});range={start,end};}
  const headers=new Headers({'Content-Type':asset.type,'Content-Length':String(asset.size),'Cache-Control':'public, max-age=3600','ETag':'"'+asset.sha256+'"','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','X-Desartly-Storage':'parspack','Accept-Ranges':'bytes'});
  if(request.headers.get('If-None-Match')===headers.get('ETag'))return new Response(null,{status:304,headers});
  const stored=await media.get({storage:'s3',key:'desartly/'+asset.key},range?'bytes='+range.start+'-'+range.end:request.method==='HEAD'?'bytes=0-0':undefined);
  if(range){headers.set('Content-Range','bytes '+range.start+'-'+range.end+'/'+asset.size);headers.set('Content-Length',String(range.end-range.start+1));const upstream=new Uint8Array(await stored.arrayBuffer());const body=stored.status===206?upstream:upstream.slice(range.start,range.end+1);if(body.length!==range.end-range.start+1)throw Error('Incomplete storage range.');return new Response(request.method==='HEAD'?null:body,{status:206,headers});}
  if(request.method==='HEAD'){await stored.arrayBuffer();return new Response(null,{headers});}
  return new Response(stored.body,{headers});
 }catch(error){return Response.json({error:'Static media temporarily unavailable.'},{status:error.status||503,headers:{'Cache-Control':'no-store'}});}
}
