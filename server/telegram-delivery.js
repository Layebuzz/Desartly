import {telegramCall,sendPrivateFile} from './telegram-client.js';
import {telegramProject,presentationFile,projectImage,processRenderJobs} from './telegram-material-service.js';
import {projectImages} from '../src/cms/telegram-materials.js';
export const tehranTime=value=>new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' (تهران)';
export async function enqueueDelivery(env,id,kind,payload,{bookingId=null,version=null}={}){await env.DB.prepare("INSERT OR IGNORE INTO telegram_deliveries(id,kind,booking_id,version,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").bind(id,kind,bookingId,version,JSON.stringify(payload),Date.now(),Date.now()).run();}
export async function queueBookingNotifications(env){
 const settings=await env.DB.prepare('SELECT * FROM telegram_settings WHERE id=1').first();if(!settings?.owner_id)return;
 const rows=await env.DB.prepare("SELECT * FROM calendar_bookings WHERE status='confirmed' AND signature NOT LIKE 'reschedule:%' AND end_at>? ORDER BY start_at LIMIT 500").bind(Date.now()).all();
 for(const row of rows.results){
  const b=JSON.parse(row.brief),c=JSON.parse(row.confirmation||'{}');
  if(settings.notifications&&Date.parse(row.created_at)>=settings.notifications_since)await enqueueDelivery(env,'booking:'+row.id,'booking',{text:`📅 رزرو تأییدشده — ${b.meetingType==='mentorship'?'منتورشیپ':'جلسهٔ پروژه'}\n${b.name}\n${b.email}\n${tehranTime(row.start_at)}\n۳۰ دقیقه\n${String(b.message||'').slice(0,1500)}\n${c.meetingUrl||'لینک Meet هنوز آماده نیست.'}`},{bookingId:row.id,version:String(row.start_at)});
  const lead=settings.reminder_minutes*60000;if(settings.reminders&&row.start_at>Date.now()&&row.start_at-Date.now()<=lead)await enqueueDelivery(env,`reminder:${row.id}:${row.start_at}:${settings.reminder_minutes}`,'reminder',{text:`⏰ یادآوری جلسه\n${b.name}\n${tehranTime(row.start_at)}\n${c.meetingUrl||'لینک جلسه در Google Calendar'}`,minutes:settings.reminder_minutes},{bookingId:row.id,version:String(row.start_at)});
 }
 const notes=await env.DB.prepare('SELECT * FROM telegram_client_notes WHERE follow_up_at IS NOT NULL AND follow_up_at<=?').bind(Date.now()).all();
 if(settings.reminders)for(const n of notes.results)await enqueueDelivery(env,`followup:${n.booking_id}:${n.updated_at}`,'followup',{text:'👥 پیگیری مشتری\n'+n.note,updatedAt:n.updated_at},{bookingId:n.booking_id});
}
async function sendAsset(env,owner,payload,preparedFile){
 const project=await telegramProject(env,payload.projectId),kind=payload.material;
 if(['linkedin','instagram'].includes(kind)){
  const file=preparedFile||await presentationFile(env,project,kind,{old:payload.old===true});const result=await sendPrivateFile(env,owner,file.response,`${project.id}-${kind}.pdf`,{caption:project.title+(file.stale?' — نیازمند بازتولید؛ نسخهٔ قدیمی به درخواست شما':' — '+(kind==='instagram'?'پرزنتیشن عمودی':'پرزنتیشن افقی'))});return String(result.message_id);
 }
 if(kind==='cover'){const image=project.heroImage||project.coverImage;if(!image)throw Object.assign(Error('کاور پروژه آماده نیست.'),{rejected:true});const response=await projectImage(env,project,image);const result=await sendPrivateFile(env,owner,response,project.id+'-cover.webp',{caption:project.title+' — کاور اصلی'});return String(result.message_id);}
 // Albums have durable chunk rows. Retrying a later chunk cannot resend earlier ones.
 const all=projectImages(project);if(!all.length)throw Object.assign(Error('تصویری برای این پروژه موجود نیست.'),{rejected:true});
 const chunk=all.slice(payload.offset||0,(payload.offset||0)+10),form=new FormData(),media=[];
 for(const [i,url] of chunk.entries()){const response=await projectImage(env,project,url),bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>9*1024*1024)throw Object.assign(Error('یکی از تصاویر برای آلبوم بزرگ است. از کاور یا فایل پروژه استفاده کن.'),{rejected:true});form.set('image'+i,new Blob([bytes],{type:response.headers.get('content-type')||'image/webp'}),`${i+1}.webp`);media.push({type:'document',media:'attach://image'+i,...(i===0?{caption:project.title+' — آلبوم '+(Math.floor((payload.offset||0)/10)+1)}:{})});}
 if(media.length===1){return String((await sendPrivateFile(env,owner,await projectImage(env,project,chunk[0]),project.id+'-image.webp',{caption:project.title})).message_id);}
 form.set('chat_id',owner);form.set('media',JSON.stringify(media));const result=await telegramCall(env,'sendMediaGroup',form);return result.map(x=>x.message_id).join(',');
}
export async function flushTelegramDeliveries(env){
 if(!env.DB||!env.DESARTLY_AUTH)return;const settings=await env.DB.prepare('SELECT * FROM telegram_settings WHERE id=1').first();if(!settings?.owner_id)return;
 await env.DB.prepare("UPDATE telegram_deliveries SET status='uncertain' WHERE status='sending' AND updated_at<?").bind(Date.now()-600000).run();
 await env.DB.prepare("UPDATE telegram_deliveries SET status='pending' WHERE status='preparing' AND updated_at<?").bind(Date.now()-240000).run();
 const pending=await env.DB.prepare("SELECT * FROM telegram_deliveries WHERE status='pending' AND next_attempt<=? ORDER BY created_at,rowid LIMIT 4").bind(Date.now()).all();
 for(const job of pending.results){
  const payload=JSON.parse(job.payload||'{}');
  if(job.booking_id){const row=await env.DB.prepare('SELECT * FROM calendar_bookings WHERE id=?').bind(job.booking_id).first();const note=job.kind==='followup'?await env.DB.prepare('SELECT * FROM telegram_client_notes WHERE booking_id=?').bind(job.booking_id).first():null;
   if(!row||(job.kind!=='followup'&&(row.status!=='confirmed'||String(row.start_at)!==job.version||row.start_at<=Date.now()||(job.kind==='booking'&&!settings.notifications)||(job.kind==='reminder'&&(!settings.reminders||payload.minutes!==settings.reminder_minutes))))||(job.kind==='followup'&&(!settings.reminders||note?.updated_at!==payload.updatedAt||!note.follow_up_at))){await env.DB.prepare("UPDATE telegram_deliveries SET status='obsolete',updated_at=? WHERE id=? AND status='pending'").bind(Date.now(),job.id).run();continue;}}
  const preparation=job.kind==='asset'&&['linkedin','instagram'].includes(payload.material);
  const claim=await env.DB.prepare("UPDATE telegram_deliveries SET status=?,attempts=attempts+1,updated_at=? WHERE id=? AND status='pending'").bind(preparation?'preparing':'sending',Date.now(),job.id).run();if(!claim.meta?.changes)continue;
  let sending=false;
  try{
   let preparedFile;if(preparation){preparedFile=await presentationFile(env,await telegramProject(env,payload.projectId),payload.material,{old:payload.old===true});const ready=await env.DB.prepare("UPDATE telegram_deliveries SET status='sending',updated_at=? WHERE id=? AND status='preparing'").bind(Date.now(),job.id).run();if(!ready.meta?.changes)continue;}
   let messageId;if(job.kind==='asset'){sending=true;messageId=await sendAsset(env,settings.owner_id,payload,preparedFile);}else{sending=true;const result=await telegramCall(env,'sendMessage',{chat_id:settings.owner_id,text:payload.text.slice(0,3900),reply_markup:{inline_keyboard:[[{text:'مشاهدهٔ جلسه و مشتری',callback_data:'booking:'+job.booking_id}]]}});messageId=String(result.message_id);}
   await env.DB.prepare("UPDATE telegram_deliveries SET status='sent',message_id=?,updated_at=? WHERE id=?").bind(messageId,Date.now(),job.id).run();
  }catch(error){const retry=error.rejected&&error.retryAfter&&job.attempts<3;const status=retry?'pending':error.uncertain?'uncertain':'failed';await env.DB.prepare('UPDATE telegram_deliveries SET status=?,next_attempt=?,updated_at=? WHERE id=?').bind(status,Date.now()+(error.retryAfter||60)*1000,Date.now(),job.id).run();try{await telegramCall(env,'sendMessage',{chat_id:settings.owner_id,text:status==='uncertain'?'نتیجهٔ تحویل فایل/اعلان نامشخص است. برای جلوگیری از تکرار، خودکار دوباره ارسال نمی‌شود. وضعیت را در Studio بررسی کن.':status==='pending'?'تلگرام محدودیت موقت گذاشته؛ درخواست در صف می‌ماند.':'تحویل انجام نشد. اتصال یا فایل پروژه را در Studio بررسی کن؛ سپس دوباره درخواست بده.'});}catch{}}
 }
}
export async function processTelegramQueue(env){await processRenderJobs(env);await queueBookingNotifications(env);await flushTelegramDeliveries(env);}
