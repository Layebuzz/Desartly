const enc=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async bytes=>hex(await crypto.subtle.digest('SHA-256',bytes));
async function hmac(key,text){const k=await crypto.subtle.importKey('raw',typeof key==='string'?enc.encode(key):key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return crypto.subtle.sign('HMAC',k,enc.encode(text));}
const escape=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export async function s3Request(config,method,key='',body,query={}){
 const url=new URL(config.endpoint);if(url.protocol!=='https:')throw Error('Storage requires HTTPS.');
 url.pathname='/'+[config.bucket,key].filter(Boolean).join('/').split('/').map(escape).join('/');
 const qs=Object.entries(query).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>escape(k)+'='+escape(String(v))).join('&');url.search=qs;
 const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),region=config.region||'us-east-1';
 const payload=body??new Uint8Array(),digest=await hash(payload),headers=new Headers({'x-amz-date':date,'x-amz-content-sha256':digest});
 const names='host;x-amz-content-sha256;x-amz-date',canonicalHeaders='host:'+url.host+'\nx-amz-content-sha256:'+digest+'\nx-amz-date:'+date+'\n';
 const canonical=[method,url.pathname,qs,canonicalHeaders,names,digest].join('\n');
 const scope=day+'/'+region+'/s3/aws4_request',toSign='AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+await hash(enc.encode(canonical));
 const signing=await hmac(await hmac(await hmac(await hmac('AWS4'+config.secretKey,day),region),'s3'),'aws4_request');
 if(body)headers.set('Content-Type',config.contentType||'application/octet-stream');
 headers.set('Authorization','AWS4-HMAC-SHA256 Credential='+config.accessKey+'/'+scope+', SignedHeaders='+names+', Signature='+hex(await hmac(signing,toSign)));
 const response=await fetch(url,{method,headers,...(body?{body}:{}),redirect:'manual',signal:AbortSignal.timeout(30000)});
 if(response.status>=300&&response.status<400)throw Object.assign(Error('Storage redirect rejected.'),{status:503});
 return response;
}

async function checked(response){
 if(!response.ok){let code='unknown';try{const text=await response.text();const match=text.match(/<Code>([a-zA-Z0-9_]{1,80})<\/Code>/);if(match)code=match[1];}catch{}throw Object.assign(Error('Media storage is temporarily unavailable.'),{status:503,storageCode:code});}
 return response;
}
export class S3Media{
 constructor(env){this.config={endpoint:env.S3_ENDPOINT,bucket:env.S3_BUCKET,region:env.S3_REGION||'us-east-1',accessKey:env.S3_ACCESS_KEY,secretKey:env.S3_SECRET_KEY};}
 async put(id,bytes,type){const key='desartly/'+id;await checked(await s3Request({...this.config,contentType:type},'PUT',key,bytes));return {storage:'s3',key};}
 async get(asset){
  if(asset.storage!=='s3'||typeof asset.key!=='string'||!asset.key.startsWith('desartly/')||asset.key.includes('..'))throw Object.assign(Error('Invalid media asset.'),{status:503});
  const cache=globalThis.caches?.default;
  const cacheKey=new Request('https://desartly.layebuzz.workers.dev/__stored-s3/'+encodeURIComponent(this.config.endpoint+'/'+this.config.bucket+'/'+asset.key));
  const cached=cache?await cache.match(cacheKey).catch(()=>null):null;if(cached)return cached;
  const response=await checked(await s3Request(this.config,'GET',asset.key));
  if(cache){const copy=response.clone();const headers=new Headers(copy.headers);headers.set('Cache-Control','public, max-age=3600');headers.delete('Set-Cookie');await cache.put(cacheKey,new Response(copy.body,{status:200,headers})).catch(()=>{});}
  return response;
 }
}
