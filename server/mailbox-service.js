import {isOwner} from './owner-auth.js';
const address='Komeili@desartly.info';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
const encoder=new TextEncoder();
export async function verifyMailWebhook(raw,headers,secret,now=Date.now()){
 try{
 const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp');
 if(!id||!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)return false;
 const bytes=Uint8Array.from(atob(secret.replace(/^whsec_/,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const signature of (headers.get('svix-signature')||'').split(' ')){
 if(!signature.startsWith('v1,'))continue;
 if(await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(signature.slice(3)),c=>c.charCodeAt(0)),encoder.encode(`${id}.${timestamp}.${raw}`)))return true;
 }return false;
 }catch{return false;}
}
async function provider(env,path,options={}){
 const response=await fetch('https://api.resend.com'+path,{...options,headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Email provider could not complete this request.');return response.json();
}
export function validateMail(body){
 const value={recipient:String(body.recipient||'').trim(),subject:String(body.subject||'').trim(),body:String(body.body||'')};
 if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value.recipient)||value.recipient.length>254||/[\r\n]/.test(value.subject)||!value.subject||value.subject.length>250||!value.body.trim()||value.body.length>100000)throw Error('Enter one email address, a subject and a message.');return value;
}
export async function mailboxResponse(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/mail/inbound'){
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!env.RESEND_WEBHOOK_SECRET||!env.RESEND_API_KEY)return json({error:'Email receiving is not connected.'},503);
 if(Number(request.headers.get('Content-Length')||0)>262144)return json({error:'Payload too large'},413);
 const raw=await request.text();if(raw.length>262144)return json({error:'Payload too large'},413);
 if(!await verifyMailWebhook(raw,request.headers,env.RESEND_WEBHOOK_SECRET))return json({error:'Invalid signature'},401);
 try{const event=JSON.parse(raw);if(event.type!=='email.received')return json({ok:true});
 const data=event.data;if(!data?.email_id||!Array.isArray(data.to)||!data.to.some(to=>String(to).toLowerCase()===address.toLowerCase()))return json({ok:true});
 if(await env.DB.prepare('SELECT id FROM mailbox_messages WHERE provider_id=?').bind(data.email_id).first())return json({ok:true});
 const received=await provider(env,'/emails/receiving/'+encodeURIComponent(data.email_id));
 const text=received.text||String(received.html||'').replace(/<[^>]*>/g,' ');
 await env.DB.prepare('INSERT OR IGNORE INTO mailbox_messages(id,provider_id,direction,folder,sender,recipient,subject,body,created_at,unread,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),data.email_id,'inbound','inbox',String(received.from||data.from).slice(0,500),address,String(received.subject||data.subject||'(No subject)').slice(0,250),String(text).slice(0,100000),Date.now(),1,'received').run();return json({ok:true});
 }catch{return json({error:'Receiving failed. Retry delivery.'},503);}
 }
 if(!path.startsWith('/api/studio/mail'))return null;
 if(!await isOwner(request,env))return json({error:'Owner sign-in required.'},401);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Request origin rejected.'},403);
 try{
 if(path==='/api/studio/mail'&&request.method==='GET'){
 const folder=['inbox','sent','drafts','trash'].includes(url.searchParams.get('folder'))?url.searchParams.get('folder'):'inbox';
 const rows=await env.DB.prepare('SELECT * FROM mailbox_messages WHERE folder=? ORDER BY created_at DESC LIMIT 100').bind(folder).all();
 return json({address,configured:!!env.RESEND_API_KEY,receivingConfigured:!!env.RESEND_WEBHOOK_SECRET,messages:rows.results});
 }
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(Number(request.headers.get('Content-Length')||0)>150000)return json({error:'Message too large'},413);
 const body=await request.json();if(JSON.stringify(body).length>150000)return json({error:'Message too large'},413);
 const id=String(body.id||'');if(!/^[a-zA-Z0-9-]{16,64}$/.test(id))return json({error:'Invalid message ID'},400);
 if(path==='/api/studio/mail/update'){
 if(!['read','trash','restore'].includes(body.action))return json({error:'Invalid action'},400);
 if(body.action==='read')await env.DB.prepare('UPDATE mailbox_messages SET unread=0 WHERE id=?').bind(id).run();
 else await env.DB.prepare("UPDATE mailbox_messages SET folder=CASE WHEN ?='trash' THEN 'trash' WHEN direction='inbound' THEN 'inbox' WHEN status='draft' THEN 'drafts' ELSE 'sent' END WHERE id=?").bind(body.action,id).run();
 return json({ok:true});
 }
 const mail=validateMail(body);
 if(path==='/api/studio/mail/draft'){
 await env.DB.prepare("INSERT INTO mailbox_messages(id,direction,folder,sender,recipient,subject,body,created_at,status) VALUES(?,'outbound','drafts',?,?,?,?,?,'draft') ON CONFLICT(id) DO UPDATE SET recipient=excluded.recipient,subject=excluded.subject,body=excluded.body WHERE mailbox_messages.status='draft'").bind(id,address,mail.recipient,mail.subject,mail.body,Date.now()).run();return json({ok:true});
 }
 if(path==='/api/studio/mail/send'){
 if(!env.RESEND_API_KEY)return json({error:'Connect domain email before sending.'},409);
 if(!env.OWNER_RATE_LIMITER||!(await env.OWNER_RATE_LIMITER.limit({key:'mailbox-send'})).success)return json({error:'Try again in a minute.'},429);
 const existing=await env.DB.prepare('SELECT * FROM mailbox_messages WHERE id=?').bind(id).first();
 if(existing&&existing.status!=='draft')return existing.status==='sent'?json({ok:true}):json({error:'This send is awaiting verification. Do not send it again.'},409);
 const claimed=await env.DB.prepare("INSERT INTO mailbox_messages(id,direction,folder,sender,recipient,subject,body,created_at,status) VALUES(?,'outbound','sent',?,?,?,?,?,'sending') ON CONFLICT(id) DO UPDATE SET recipient=excluded.recipient,subject=excluded.subject,body=excluded.body,folder='sent',status='sending' WHERE mailbox_messages.status='draft'").bind(id,address,mail.recipient,mail.subject,mail.body,Date.now()).run();
 if(!claimed.meta.changes)return json({error:'Message is already being sent.'},409);
 try{const result=await provider(env,'/emails',{method:'POST',headers:{'Idempotency-Key':'mailbox-'+id},body:JSON.stringify({from:'Ali Komeili · Desartly <'+address+'>',to:[mail.recipient],subject:mail.subject,text:mail.body})});
 await env.DB.prepare("UPDATE mailbox_messages SET status='sent',provider_id=? WHERE id=?").bind(result.id,id).run();return json({ok:true});
 }catch{await env.DB.prepare("UPDATE mailbox_messages SET status='uncertain' WHERE id=?").bind(id).run();return json({error:'Delivery is unconfirmed. Check the provider before sending again.'},503);}
 }return json({error:'Not found'},404);
 }catch(error){return json({error:error.message||'Mail request failed.'},400);}
}
