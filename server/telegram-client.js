const enc=new TextEncoder();
async function key(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(env.OWNER_SESSION_SECRET)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function token(env){if(env.TELEGRAM_BOT_TOKEN)return env.TELEGRAM_BOT_TOKEN;const value=await env.DESARTLY_AUTH.get('telegram:token');if(!value)return null;const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await key(env),bytes.slice(12)));}
export async function putToken(env,value){const iv=crypto.getRandomValues(new Uint8Array(12)),body=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),enc.encode(value))),bytes=new Uint8Array(iv.length+body.length);bytes.set(iv);bytes.set(body,12);await env.DESARTLY_AUTH.put('telegram:token',btoa(String.fromCharCode(...bytes)));}
export async function telegramCall(env,method,body){
 const secret=await token(env);if(!secret)throw Object.assign(Error('Connect your Telegram bot first.'),{rejected:true});
 let response,data;try{response=await fetch(`https://api.telegram.org/bot${secret}/${method}`,{method:'POST',...(body instanceof FormData?{}:{headers:{'Content-Type':'application/json'}}),body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(body instanceof FormData?45000:15000)});data=await response.json();}catch{throw Object.assign(Error('Telegram did not confirm the request. Check connection before retrying.'),{uncertain:true});}
 if(!response.ok||!data.ok)throw Object.assign(Error('Telegram rejected the request. Check bot access and connection.'),{rejected:response.status<500,retryAfter:data.parameters?.retry_after});return data.result;
}
export async function sendPrivateFile(env,chatId,response,name,{photo=false,caption=''}={}){
 const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>48*1024*1024)throw Object.assign(Error('فایل از محدودیت تلگرام بزرگ‌تر است.'),{rejected:true});
 const field=photo?'photo':'document',form=new FormData();form.set('chat_id',String(chatId));form.set('caption',caption.slice(0,1000));form.set(field,new Blob([bytes],{type:response.headers.get('Content-Type')||'application/octet-stream'}),name);
 return telegramCall(env,photo?'sendPhoto':'sendDocument',form);
}
