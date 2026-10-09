import {D1Store} from './content-store.js';
import {scheduleMarketingTask} from './marketing-schedule.js';
import {marketingAction} from './marketing-service.js';
import {telegramCall} from './telegram-client.js';
import {enqueueDelivery} from './telegram-delivery.js';
const cmsUrl='https://studio.desartly.info/studio/marketing';
export async function changeMarketing(env,change){const store=new D1Store(env.DB);for(let i=0;i<3;i++){const state=await store.readMarketing(),result=change(state.marketing,state.revision);if(!result)return state.marketing;try{await store.writeMarketing(state.marketing,state.revision);return state.marketing;}catch(e){if(e.status!==409||i===2)throw e;}}}
export function marketingCallbackId(id){if(/^[a-zA-Z0-9-]{1,45}$/.test(id))return id;let a=2166136261,b=3339675911;for(const c of id){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),2246822519);}return 'k'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export const marketingButtons=t=>[[{text:'▶️ شروع / Start',callback_data:'mk:start:'+marketingCallbackId(t.id)},{text:'📝 گزارش / Report',callback_data:'mk:report:'+marketingCallbackId(t.id)}],[{text:'Studio',url:cmsUrl}]];
export async function queueMarketingNotifications(env,now=Date.now()){
 const settings=await env.DB.prepare('SELECT owner_id FROM telegram_settings WHERE id=1').first();if(!settings?.owner_id)return;
 const m=await changeMarketing(env,m=>scheduleMarketingTask(m,now)),queued=await env.DB.prepare("SELECT id FROM telegram_deliveries WHERE kind='marketing'").all(),ids=new Set(queued.results.map(r=>r.id));let added=0;
 for(const t of m.tasks.filter(t=>t.scheduleId&&!t.archived&&!t.done&&m.programs.some(p=>p.id===t.programId&&!p.archived))){
  const deadline=new Intl.DateTimeFormat(t.language==='en'?'en-GB':'fa-IR',{timeZone:'Asia/Tehran',dateStyle:'medium',timeStyle:'short'}).format(t.deadlineAt);
  if(added>=8)break;
  if(!ids.has('marketing:assign:'+t.id)){added++;await enqueueDelivery(env,'marketing:assign:'+t.id,'marketing',{taskId:t.id,phase:'assignment',text:(t.language==='en'?'Your next marketing action':'قدم بعدی مارکتینگ')+'\n\n'+t.title+'\n'+t.brief+'\n\n'+(t.language==='en'?'Report due: ':'موعد گزارش: ')+deadline+' · Tehran',rows:marketingButtons(t)});}
  if(!ids.has('marketing:deadline:'+t.id)&&t.deadlineAt<=now&&!t.reports?.some(r=>Date.parse(r.at)>=t.deadlineAt)){added++;await enqueueDelivery(env,'marketing:deadline:'+t.id,'marketing',{taskId:t.id,phase:'deadline',text:(t.language==='en'?'How did it go? Report completed work, progress or a blocker.':'موعد گزارش رسید. کار انجام شد، هنوز در جریان است یا مانعی داری؟ گزارش کوتاهت را ثبت کن.')+'\n\n'+t.title,rows:marketingButtons(t)});}
 }
}
export async function marketingDeliveryCurrent(env,payload){const {marketing:m}=await new D1Store(env.DB).readMarketing(),t=m.tasks.find(t=>t.id===payload.taskId);return !!t&&!t.archived&&!t.done&&m.programs.some(p=>p.id===t.programId&&!p.archived)&&(payload.phase!=='deadline'||!t.reports?.some(r=>Date.parse(r.at)>=t.deadlineAt));}
export async function marketingBotAction(env,owner,action,{callback=false,now=Date.now()}={}){
 const send=(text,rows=[])=>telegramCall(env,'sendMessage',{chat_id:owner,text,reply_markup:{inline_keyboard:rows}});
 const {marketing:m}=await new D1Store(env.DB).readMarketing();
 if(action==='/marketing'||action==='marketing'){
  const tasks=m.tasks.filter(t=>!t.archived&&!t.done&&m.programs.some(p=>p.id===t.programId&&!p.archived)).slice(-8);
  await send('🎯 مارکتینگ / Marketing\n'+(tasks.length?'تسک را برای شروع یا ثبت گزارش انتخاب کن.':'تسک فعالی نداری. برنامه و زمان‌بندی را در Studio تنظیم کن.'),[...tasks.map(t=>[{text:t.title.slice(0,60),callback_data:'mk:report:'+marketingCallbackId(t.id)}]),[{text:'Marketing workspace',url:cmsUrl}]]);return true;
 }
 if(action==='mk:cancel'){await changeMarketing(env,m=>{delete m.pendingReport;return true;});await send('ثبت گزارش لغو شد. / Report cancelled.');return true;}
 if(action.startsWith('mk:')){
  const [,kind,key]=action.split(':'),matches=m.tasks.filter(t=>marketingCallbackId(t.id)===key&&!t.archived&&m.programs.some(p=>p.id===t.programId&&!p.archived)),task=matches.length===1?matches[0]:null,id=task?.id;if(!task)throw Error('این تسک فعال نیست. / This task is unavailable.');
  if(kind==='start'){await changeMarketing(env,(m,revision)=>{const t=m.tasks.find(t=>t.id===id);if(t.done)throw Error('این تسک قبلاً تکمیل شده.');Object.assign(m,marketingAction({revision,marketing:m},{action:'update-task',revision,taskId:id,status:'doing'},new Date(now)).marketing);return true;});await send('▶️ شروع ثبت شد. / Task started.\n'+task.title,marketingButtons(task));return true;}
  if(kind==='report'){await changeMarketing(env,m=>{m.pendingReport={taskId:id,owner,expires:now+3600000,status:'doing'};return true;});await send(task.title+'\n\nوضعیت را انتخاب کن؛ سپس گزارش کوتاهت را بفرست.\nChoose a status, then send your report (up to 600 characters).',[[{text:'✅ انجام شد / Done',callback_data:'mk:done:'+marketingCallbackId(id)},{text:'⏳ در جریان / Progress',callback_data:'mk:progress:'+marketingCallbackId(id)},{text:'⚠️ مانع / Blocked',callback_data:'mk:blocked:'+marketingCallbackId(id)}],[{text:'انصراف / Cancel',callback_data:'mk:cancel'}]]);return true;}
  if(['done','progress','blocked'].includes(kind)){await changeMarketing(env,m=>{m.pendingReport={taskId:id,owner,expires:now+3600000,status:kind==='done'?'done':'doing',blocked:kind==='blocked'};return true;});await send('گزارش '+(kind==='done'?'انجام کار':kind==='blocked'?'مانع':'پیشرفت')+' را در پیام بعدی بنویس. حداکثر ۶۰۰ کاراکتر.\nSend the report in your next message. Nothing is marked complete until you submit it.',[[{text:'انصراف / Cancel',callback_data:'mk:cancel'}]]);return true;}
  return false;
 }
 if(!callback&&!action.startsWith('/')&&m.pendingReport?.owner===owner&&m.pendingReport.expires>now){
  if(!action.trim()||action.length>600)throw Error('گزارش باید بین ۱ و ۶۰۰ کاراکتر باشد. / Use 1–600 characters.');
  await changeMarketing(env,(m,revision)=>{const pending=m.pendingReport;if(!pending||pending.owner!==owner||pending.expires<=now)throw Error('فرم گزارش منقضی شده. دوباره تسک را انتخاب کن.');const t=m.tasks.find(t=>t.id===pending.taskId&&!t.archived);if(!t||!m.programs.some(p=>p.id===t.programId&&!p.archived))throw Error('این تسک فعال نیست.');if((t.reports||[]).length>=20)throw Error('این تسک ۲۰ گزارش دارد؛ برای ادامه یک تسک جدید بساز.');Object.assign(m,marketingAction({revision,marketing:m},{action:'update-task',revision,taskId:t.id,status:pending.status,note:action.trim()},new Date(now)).marketing);const updated=m.tasks.find(v=>v.id===t.id);updated.reports=[...(updated.reports||[]),{at:new Date(now).toISOString(),status:pending.blocked?'blocked':pending.status,text:action.trim(),source:'telegram'}];delete m.pendingReport;return true;});await send('✅ گزارش در CMS ثبت شد. / Report saved in CMS.',[[{text:'View reports',url:cmsUrl+'?view=results'}]]);return true;
 }
 // A different command or callback exits the report conversation so later project searches are not captured.
 if(m.pendingReport&&(callback||action.startsWith('/')))await changeMarketing(env,m=>{delete m.pendingReport;return true;});
 return false;
}
