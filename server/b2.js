async function checked(response){if(!response.ok){let code='unknown';try{const body=await response.json();if(/^[a-z0-9_]{1,80}$/i.test(body.code||''))code=body.code;}catch{}console.warn('Media storage request failed',{status:response.status,code});throw Object.assign(Error('Media storage is temporarily unavailable.'),{status:503,storageCode:code});}return response.json();}
function providerUrl(value){const u=new URL(value);if(u.protocol!=='https:'||!(/\.(backblazeb2|backblaze)\.com$/.test(u.hostname)))throw Error('Invalid storage endpoint');return u;}
const authorizations=new WeakMap();
async function authorize(env){
 if(!env.B2_KEY_ID||!env.B2_APP_KEY||!env.B2_BUCKET_ID)throw Object.assign(Error('Backblaze B2 is not configured.'),{status:503});
 const previous=authorizations.get(env);
 if(previous&&previous.expires>Date.now())return previous.pending;
 const entry={expires:Date.now()+15*60*1000};
 entry.pending=(async()=>{try{const result=await checked(await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account',{headers:{Authorization:'Basic '+btoa(env.B2_KEY_ID+':'+env.B2_APP_KEY)}}));const storage=result.apiInfo.storageApi;return {token:result.authorizationToken,api:providerUrl(storage.apiUrl).origin,download:providerUrl(storage.downloadUrl).origin};}catch(error){if(error.storageCode==='transaction_cap_exceeded')entry.expires=Date.now()+60000;else authorizations.delete(env);throw error;}})();
 authorizations.set(env,entry);return entry.pending;
}
export class B2Media{
 constructor(env){this.env=env;}
 async put(id,bytes,type){const auth=await authorize(this.env);const upload=await checked(await fetch(auth.api+'/b2api/v3/b2_get_upload_url',{method:'POST',headers:{Authorization:auth.token,'Content-Type':'application/json'},body:JSON.stringify({bucketId:this.env.B2_BUCKET_ID})}));providerUrl(upload.uploadUrl);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-1',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');const result=await checked(await fetch(upload.uploadUrl,{method:'POST',headers:{Authorization:upload.authorizationToken,'X-Bz-File-Name':encodeURIComponent('desartly/'+id),'Content-Type':type,'X-Bz-Content-Sha1':hash},body:bytes}));return {fileId:result.fileId};}
 async get(asset){
  // The content API checks owner/public references before calling this cache.
  const cache=globalThis.caches?.default;
  const cacheKey=new Request('https://desartly.layebuzz.workers.dev/__stored-media/'+encodeURIComponent(asset.fileId));
  const cached=cache?await cache.match(cacheKey).catch(()=>null):null;if(cached)return cached;
  let auth=await authorize(this.env);
  const download=()=>fetch(auth.download+'/b2api/v3/b2_download_file_by_id?fileId='+encodeURIComponent(asset.fileId),{headers:{Authorization:auth.token}});
  let result=await download();
  if(result.status===401){authorizations.delete(this.env);auth=await authorize(this.env);result=await download();}
  if(!result.ok){let code='unknown';try{const body=await result.json();if(/^[a-z0-9_]{1,80}$/i.test(body.code||''))code=body.code;}catch{}console.warn('Media storage download failed',{status:result.status,code});throw Object.assign(Error('Media storage is temporarily unavailable.'),{status:503});}
  if(cache){const copy=result.clone();const headers=new Headers(copy.headers);headers.set('Cache-Control','public, max-age=3600');headers.delete('Set-Cookie');await cache.put(cacheKey,new Response(copy.body,{status:200,headers})).catch(()=>{});}
  return result;
 }
}
