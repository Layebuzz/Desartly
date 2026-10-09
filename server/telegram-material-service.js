import {staticAssetResponse} from './static-assets.js';
import {MediaStorage} from './media-storage.js';
import {D1Store} from './content-store.js';
import {materialize} from '../src/cms/materialize.js';
import {presentationVersion,projectImages} from '../src/cms/telegram-materials.js';
import {s3Request} from './s3.js';
import {isOwner} from './owner-auth.js';
const origin='https://desartly.layebuzz.workers.dev';
export async function telegramProject(env,id){const state=await new D1Store(env.DB).read();const project=materialize(structuredClone(state.draft)).projects.find(p=>p.id===id&&!p.archived);if(!project)throw Error('پروژه پیدا نشد.');return project;}
const storageConfig=env=>({endpoint:env.S3_ENDPOINT,bucket:env.S3_BUCKET,region:env.S3_REGION,accessKey:env.S3_ACCESS_KEY,secretKey:env.S3_SECRET_KEY});
async function fileKey(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode('desartly:private-pdf:'+env.OWNER_SESSION_SECRET)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function privateFile(env,key){
 const ivHex=key?.match(/-([a-f0-9]{24})\.enc$/)?.[1];if(!key?.startsWith('desartly/private/telegram/')||!ivHex)throw Error('Invalid encrypted private file.');
 const response=await s3Request(storageConfig(env),'GET',key);if(!response.ok)throw Error('فایل خصوصی در دسترس نیست.');
 const iv=Uint8Array.from(ivHex.match(/../g),x=>parseInt(x,16));const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv},await fileKey(env),await response.arrayBuffer());return new Response(bytes,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store'}});
}
export async function projectImage(env,project,url,{original=false}={}){
 if(url!==project.coverImage&&!projectImages(project).includes(url))throw Error('Image is not part of this project.');
 const state=await new D1Store(env.DB).read();
 const mediaId=url.match(/^\/api\/media\/([^/?]+)(?:\?.*)?$/)?.[1];
 if(mediaId){const asset=state.media.find(m=>m.id===mediaId&&!m.trashedAt);if(!asset)throw Error('تصویر در کتابخانه موجود نیست.');const selected=original?[...(asset.variants||[])].sort((a,b)=>(b.width||0)-(a.width||0))[0]:asset.variants?.find(v=>v.width===1280)||asset.variants?.[0];const stored=selected?.asset||selected||asset;if(!stored.key?.startsWith('desartly/'))throw Error('Invalid media storage reference.');const response=await s3Request(storageConfig(env),'GET',stored.key);if(!response.ok)throw Error('تصویر در دسترس نیست.');return response;}
 const parsed=new URL(url,origin);
 if(parsed.origin!==origin||!/^\/(projects|assets|uploads)\//.test(parsed.pathname)||parsed.search)throw Error('این تصویر باید ابتدا به کتابخانهٔ CMS منتقل شود.');
 const imageRequest=new Request(parsed);const response=await staticAssetResponse(imageRequest,env,new MediaStorage(env))||await env.ASSETS.fetch(imageRequest);if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error('تصویر قابل دریافت نیست.');return response;
}
export async function savePresentation(env,project,format,bytes,versionOverride){
 if(!['linkedin','instagram'].includes(format)||bytes.length>48*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid PDF.');
 const version=versionOverride||await presentationVersion(project,format),iv=crypto.getRandomValues(new Uint8Array(12)),ivHex=Array.from(iv,x=>x.toString(16).padStart(2,'0')).join(''),key=`desartly/private/telegram/${encodeURIComponent(project.id)}/${format}/${version}-${ivHex}.enc`;
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await fileKey(env),bytes));const response=await s3Request({...storageConfig(env),contentType:'application/octet-stream'},'PUT',key,encrypted);if(!response.ok)throw Error('ذخیرهٔ خصوصی PDF ناموفق بود.');
 const previous=await env.DB.prepare('SELECT storage_key FROM telegram_exports WHERE project_id=? AND format=?').bind(project.id,format).first();
 await env.DB.prepare('INSERT INTO telegram_exports(project_id,format,version,storage_key,byte_size,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(project_id,format) DO UPDATE SET version=excluded.version,storage_key=excluded.storage_key,byte_size=excluded.byte_size,created_at=excluded.created_at').bind(project.id,format,version,key,bytes.length,Date.now()).run();
 if(previous?.storage_key?.startsWith('desartly/private/telegram/')&&previous.storage_key.endsWith('.pdf')){const removed=await s3Request(storageConfig(env),'DELETE',previous.storage_key);if(!removed.ok)throw Error('Encrypted file saved; legacy export cleanup needs review.');}
 return {storage_key:key,version,byte_size:bytes.length};
}
export async function presentationFile(env,project,format,{old=false}={}){
 const version=await presentationVersion(project,format),existing=await env.DB.prepare('SELECT * FROM telegram_exports WHERE project_id=? AND format=?').bind(project.id,format).first();
 if(existing&&existing.storage_key.startsWith('desartly/private/telegram/')&&existing.storage_key.endsWith('.pdf')&&(existing.version===version||old)){const legacy=await s3Request(storageConfig(env),'GET',existing.storage_key);if(!legacy.ok)throw Error('Stored export is unavailable.');const bytes=new Uint8Array(await legacy.arrayBuffer());const saved=await savePresentation(env,project,format,bytes,existing.version);return {...saved,stale:existing.version!==version,response:new Response(bytes,{headers:{'Content-Type':'application/pdf'}})};}
 if(existing&&existing.storage_key.endsWith('.enc')&&(existing.version===version||old))return {...existing,stale:existing.version!==version,response:await privateFile(env,existing.storage_key)};
 if(!env.PRESENTATION_BROWSER)throw Error('تولید PDF آماده نیست؛ از Presentation studio خروجی را آماده کن.');
 const {default:puppeteer}=await import('@cloudflare/puppeteer');let browser;const job=crypto.randomUUID();
 await env.DB.prepare("INSERT INTO telegram_actions(id,owner_id,kind,payload,expires_at,created_at) VALUES(?,'renderer','browser-render',?,?,?)").bind(job,JSON.stringify({projectId:project.id,format}),Date.now()+300000,Date.now()).run();
 try{
 browser=await puppeteer.launch(env.PRESENTATION_BROWSER);const page=await browser.newPage();
 await page.setCookie({name:'desartly_render',value:job,domain:new URL(origin).hostname,path:'/',secure:true,httpOnly:true,sameSite:'Strict'});
 const loaded=await page.goto(origin+'/_presentation-render',{waitUntil:'networkidle0',timeout:60000});if(!loaded?.ok())throw Error('Private renderer page returned HTTP '+loaded?.status());
 await page.waitForFunction('window.desartlyRenderResult !== undefined',{timeout:180000});
 const result=await page.evaluate(()=>({error:window.desartlyRenderResult.error,length:window.desartlyRenderResult.base64?.length||0}));if(result.error)throw Object.assign(Error('تولید PDF ناموفق بود؛ تصاویر پروژه را در CMS بررسی کن.'),{renderReason:result.error});
 if(result.length>64*1024*1024)throw Error('PDF exceeds the private delivery size limit.');
 const chunks=[];for(let offset=0;offset<result.length;offset+=1024*1024){const part=await page.evaluate(start=>window.desartlyRenderResult.base64.slice(start,start+1024*1024),offset);chunks.push(Uint8Array.from(atob(part),c=>c.charCodeAt(0)));}
 const bytes=new Uint8Array(chunks.reduce((sum,part)=>sum+part.length,0));let position=0;for(const part of chunks){bytes.set(part,position);position+=part.length;}
 const latest=await telegramProject(env,project.id);if(await presentationVersion(latest,format)!==version)throw Error('محتوای پروژه هنگام تولید تغییر کرد. دوباره درخواست بده.');
 const saved=await savePresentation(env,project,format,bytes);return {...saved,stale:false,response:new Response(bytes,{headers:{'Content-Type':'application/pdf'}})};
 }catch(error){if(error.status===429||/429|rate limit|acquisition/i.test(error.message||''))throw Object.assign(Error('تولید PDF در صف محدودیت سرویس قرار گرفت.'),{rejected:true,retryAfter:60});throw error;}finally{if(browser)await browser.close().catch(()=>{});await env.DB.prepare("DELETE FROM telegram_actions WHERE id=? AND kind='browser-render'").bind(job).run();}
}
export async function presentationRenderResponse(request,env){
 const url=new URL(request.url),internal=['/_presentation-render','/api/internal/presentation'].includes(url.pathname),image=url.pathname.startsWith('/api/media/')&&request.headers.get('cookie')?.includes('desartly_render=');if(!internal&&!image)return null;
 const code=request.headers.get('cookie')?.match(/(?:^|;\s*)desartly_render=([a-f0-9-]{36})(?:;|$)/)?.[1],record=code?await env.DB.prepare("SELECT payload FROM telegram_actions WHERE id=? AND kind='browser-render' AND expires_at>?").bind(code,Date.now()).first():null,job=record?JSON.parse(record.payload):null;
 if(!job)return new Response('Private render request expired.',{status:403,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const project=await telegramProject(env,job.projectId);
 if(image){const imageUrl=url.pathname+url.search;const response=await projectImage(env,project,imageUrl,{original:true});return new Response(response.body,{headers:{'Content-Type':response.headers.get('Content-Type'),'Cache-Control':'private, no-store'}});}
 if(url.pathname==='/api/internal/presentation')return Response.json({project,format:job.format},{headers:{'Cache-Control':'private, no-store'}});
 const response=await env.ASSETS.fetch(new Request(origin+'/presentation-render.html'));const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('X-Robots-Tag','noindex, nofollow');return new Response(response.body,{status:response.status,headers});
}
export async function processRenderJobs(env){
 await env.DB.prepare("UPDATE telegram_actions SET status='pending' WHERE kind='render' AND status='processing' AND expires_at<?").bind(Date.now()).run();
 const jobs=await env.DB.prepare("SELECT * FROM telegram_actions WHERE kind='render' AND status='pending' ORDER BY created_at LIMIT 1").all();
 for(const job of jobs.results){const claim=await env.DB.prepare("UPDATE telegram_actions SET status='processing',expires_at=? WHERE id=? AND status='pending'").bind(Date.now()+240000,job.id).run();if(!claim.meta?.changes)continue;
 try{const payload=JSON.parse(job.payload);await presentationFile(env,await telegramProject(env,payload.projectId),payload.format);await env.DB.prepare("UPDATE telegram_actions SET status='done' WHERE id=?").bind(job.id).run();}catch(error){const payload=JSON.parse(job.payload);payload.error=String(error.renderReason||error.message||'Render failed').replace(/\d{5,15}:[A-Za-z0-9_-]+|[a-f0-9]{32,}/g,'[redacted]').slice(0,300);await env.DB.prepare("UPDATE telegram_actions SET status=?,payload=? WHERE id=?").bind(error.retryAfter?'pending':'failed',JSON.stringify(payload),job.id).run();}}
}
export async function materialResponse(request,env,ctx){
 const url=new URL(request.url);if(url.pathname!=='/api/studio/telegram/materials')return null;
 if(!await isOwner(request,env))return Response.json({error:'Owner sign-in required.'},{status:401});
 const headers={'Cache-Control':'private, no-store'};
 if(request.method==='GET'&&url.searchParams.has('projectId')){const row=await env.DB.prepare('SELECT * FROM telegram_exports WHERE project_id=? AND format=?').bind(url.searchParams.get('projectId'),url.searchParams.get('format')).first();if(!row)return Response.json({error:'Presentation not prepared.'},{status:404});const file=await privateFile(env,row.storage_key);return new Response(file.body,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+row.project_id.replace(/[^a-zA-Z0-9_-]/g,'')+'-'+row.format+'.pdf"'}});}
 if(request.method==='GET'){const rows=await env.DB.prepare('SELECT project_id,format,version,byte_size,created_at FROM telegram_exports ORDER BY created_at DESC').all(),state=await new D1Store(env.DB).read(),projects=materialize(structuredClone(state.draft)).projects.filter(p=>!p.archived),jobs=await env.DB.prepare("SELECT id,payload,status,created_at FROM telegram_actions WHERE kind='render' ORDER BY created_at DESC LIMIT 20").all();return Response.json({exports:rows.results,projects:projects.map(p=>({id:p.id,title:p.title})),jobs:jobs.results},{headers});}
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});if(request.headers.get('Origin')!==url.origin)return Response.json({error:'Request origin rejected.'},{status:403});
 try{const raw=await request.text();if(raw.length>2000)throw Error('Request too large.');const body=JSON.parse(raw);const p=await telegramProject(env,body.projectId);if(!['linkedin','instagram','both'].includes(body.format))throw Error('Choose a presentation format.');for(const format of body.format==='both'?['linkedin','instagram']:[body.format])await env.DB.prepare("INSERT INTO telegram_actions(id,owner_id,kind,payload,status,expires_at,created_at) VALUES(?,'studio','render',?,'pending',?,?)").bind(crypto.randomUUID().replaceAll('-',''),JSON.stringify({projectId:p.id,format}),Date.now()+240000,Date.now()).run();return Response.json({ok:true},{status:202,headers});}catch(error){return Response.json({error:error.message},{status:400,headers});}
}
