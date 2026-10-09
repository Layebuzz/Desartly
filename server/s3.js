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
 if(config.range)headers.set('Range',config.range);
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
 async usage(){let token='',used=0,count=0;const groups={library:{bytes:0,count:0},static:{bytes:0,count:0},private:{bytes:0,count:0},other:{bytes:0,count:0}};for(let page=0;page<200;page++){const query={'list-type':'2','max-keys':'1000',...(token?{'continuation-token':token}:{})};const response=await checked(await s3Request(this.config,'GET','',undefined,query));const xml=await response.text();for(const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)){const key=match[1].match(/<Key>([\s\S]*?)<\/Key>/)?.[1]||'',size=Number(match[1].match(/<Size>(\d+)<\/Size>/)?.[1]);if(!Number.isSafeInteger(size))throw Error('Storage returned an invalid object size.');used+=size;count++;const group=key.startsWith('desartly/static/')?'static':key.startsWith('desartly/private/')?'private':key.startsWith('desartly/')?'library':'other';groups[group].bytes+=size;groups[group].count++;}if(!/<IsTruncated>true<\/IsTruncated>/.test(xml))return {used,count,groups,checkedAt:new Date().toISOString(),source:'S3 ListObjectsV2',scope:'All objects in the storage bucket, including static assets, exports, retained files and Trash.'};const next=xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];if(!next||next===token)throw Error('Storage pagination was incomplete.');token=next.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");}throw Error('Storage inventory exceeded the scan limit.');}
 async put(id,bytes,type){const key='desartly/'+id;await checked(await s3Request({...this.config,contentType:type},'PUT',key,bytes));return {storage:'s3',key};}
 async authorizeStatic(asset){const key='desartly/'+asset.key;return {download:await signStaticRequest(this.config,'GET',key,asset.sha256,asset.type)};}
 async discardStaged(id){if(!/^private\/static-staging\/[a-f0-9]{64}\/\d+$/.test(id))throw Error('Invalid staged asset.');await checked(await s3Request(this.config,'DELETE','desartly/'+id));}
 async get(asset,range){
  if(range&&!/^bytes=\d+-\d+$/.test(range))throw Error('Invalid media range.');
  if(asset.storage!=='s3'||typeof asset.key!=='string'||!asset.key.startsWith('desartly/')||asset.key.includes('..'))throw Object.assign(Error('Invalid media asset.'),{status:503});
  const cache=range||asset.key.startsWith('desartly/private/')?null:globalThis.caches?.default;
  const cacheKey=new Request('https://desartly.layebuzz.workers.dev/__stored-s3/'+encodeURIComponent(this.config.endpoint+'/'+this.config.bucket+'/'+asset.key));
  const cached=cache?await cache.match(cacheKey).catch(()=>null):null;if(cached)return cached;
  const response=await checked(await s3Request({...this.config,range},'GET',asset.key));
  if(cache){const copy=response.clone();const headers=new Headers(copy.headers);headers.set('Cache-Control','public, max-age=3600');headers.delete('Set-Cookie');await cache.put(cacheKey,new Response(copy.body,{status:200,headers})).catch(()=>{});}
  return response;
 }
}

// A scoped signature for one known public asset; long-lived S3 secrets stay on the Worker.
export async function signStaticRequest(config,method,key,sha256,type){
 if(['.','..'].includes(key.split('/').at(-1))||!['GET','PUT'].includes(method)||!/^desartly\/static\/[a-f0-9]{64}\/[a-zA-Z0-9_.-]+$/.test(key)||! /^[a-f0-9]{64}$/.test(sha256))throw Error('Invalid static transfer.');
 const url=new URL(config.endpoint);if(url.protocol!=='https:')throw Error('Storage requires HTTPS.');
 url.pathname='/'+[config.bucket,key].join('/').split('/').map(escape).join('/');
 const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),region=config.region||'us-east-1';
 const digest=method==='PUT'?sha256:await hash(new Uint8Array());
 const names='host;x-amz-content-sha256;x-amz-date';
 const canonical=[method,url.pathname,'','host:'+url.host+'\nx-amz-content-sha256:'+digest+'\nx-amz-date:'+date+'\n',names,digest].join('\n');
 const scope=day+'/'+region+'/s3/aws4_request',toSign='AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+await hash(enc.encode(canonical));
 const signing=await hmac(await hmac(await hmac(await hmac('AWS4'+config.secretKey,day),region),'s3'),'aws4_request');
 return {url:url.href,headers:{'x-amz-date':date,'x-amz-content-sha256':digest,...(method==='PUT'?{'Content-Type':type}:{}),Authorization:'AWS4-HMAC-SHA256 Credential='+config.accessKey+'/'+scope+', SignedHeaders='+names+', Signature='+hex(await hmac(signing,toSign))}};
}
