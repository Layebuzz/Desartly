import {isOwner} from './owner-auth.js';
import {bounded} from './content-api.js';
import {formatBrief} from '../src/booking-config.js';

const CONNECTION='google-calendar:connection',SCHEDULE='google-calendar:schedule';
const SCOPES=['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.freebusy'];
export const defaultSchedule={timeZone:'Asia/Tehran',days:[0,1,2,3,6],startHour:10,endHour:16,duration:30,noticeHours:12,horizonDays:30,calendarId:'primary',bufferMinutes:0,holidays:[]};
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=503)=>Object.assign(Error(message),{status});
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const un64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function encryptionKey(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(env.OWNER_SESSION_SECRET)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function saveConnection(env,value){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(env),enc.encode(JSON.stringify(value)));await env.DESARTLY_AUTH.put(CONNECTION,JSON.stringify({iv:b64(iv),data:b64(data)}));}
async function connection(env){const stored=await env.DESARTLY_AUTH?.get(CONNECTION,'json');if(!stored)return null;try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(stored.iv)},await encryptionKey(env),un64(stored.data))));}catch{return null;}}
async function schedule(env){return {...defaultSchedule,...await env.DESARTLY_AUTH?.get(SCHEDULE,'json')};}
export function validateSchedule(body){
 const s={...defaultSchedule,...body};
 if(!Number.isInteger(s.bufferMinutes)||s.bufferMinutes<0||s.bufferMinutes>120||!Array.isArray(s.holidays)||s.holidays.length>100||s.holidays.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d+'T00:00:00Z'))||new Date(d+'T00:00:00Z').toISOString().slice(0,10)!==d))throw fail('Choose valid holidays and a buffer from 0 to 120 minutes.',400);
 if(s.timeZone!=='Asia/Tehran'||!Array.isArray(s.days)||!s.days.length||s.days.some(d=>!Number.isInteger(d)||d<0||d>6)||!Number.isInteger(s.startHour)||!Number.isInteger(s.endHour)||s.startHour<0||s.endHour>24||s.startHour>=s.endHour||s.duration!==30||!Number.isInteger(s.noticeHours)||s.noticeHours<1||s.noticeHours>168||s.horizonDays!==30||typeof s.calendarId!=='string'||s.calendarId.length>250||!s.calendarId.trim())throw fail('Choose valid working days and hours.',400);
 return {timeZone:s.timeZone,days:[...new Set(s.days)],startHour:s.startHour,endHour:s.endHour,duration:30,noticeHours:s.noticeHours,horizonDays:30,calendarId:s.calendarId.trim(),bufferMinutes:s.bufferMinutes,holidays:[...new Set(s.holidays)].sort()};
}
async function token(env){
 const c=await connection(env);if(!c?.refreshToken||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)throw fail('The booking calendar is not connected yet.');
 if(c.expires>Date.now()+60000)return c.accessToken;
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:c.refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw fail('The calendar connection needs to be renewed.');const data=await response.json();
 if(!data.access_token)throw fail('The calendar connection needs to be renewed.');
 await saveConnection(env,{...c,accessToken:data.access_token,expires:Date.now()+Number(data.expires_in||3600)*1000});return data.access_token;
}
async function google(env,path,options={}){
 const response=await fetch('https://www.googleapis.com/calendar/v3/'+path,{...options,headers:{Authorization:'Bearer '+await token(env),'Content-Type':'application/json'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Object.assign(fail(response.status===409?'This booking already exists.':'The calendar could not be reached. Please try again.',response.status===409?409:503),{googleStatus:response.status});
 return response.status===204?{}:response.json();
}
const zoneFormatters=new Map();
function zonedStart(date,hour,minute,timeZone){
 const utc=Date.parse(`${date}T${String(hour).padStart(2,'0')}:${minute?'30':'00'}:00Z`);let guess=utc;
 let formatter=zoneFormatters.get(timeZone);if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});zoneFormatters.set(timeZone,formatter);}
 for(let i=0;i<2;i++){const p=Object.fromEntries(formatter.formatToParts(guess).map(x=>[x.type,x.value]));guess+=utc-Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));}
 return guess;
}
export function candidateSlots(s,month,now=Date.now()){
 if(!/^\d{4}-\d{2}$/.test(month))throw fail('Choose a valid month.',400);
 const [year,m]=month.split('-').map(Number);if(m<1||m>12||year<2025||year>2100)throw fail('Choose a valid month.',400);
 const starts=[];const count=new Date(Date.UTC(year,m,0)).getUTCDate();
 for(let day=1;day<=count;day++){
  if(!s.days.includes(new Date(Date.UTC(year,m-1,day)).getUTCDay()))continue;
  const date=`${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if(s.holidays?.includes(date))continue;
  for(let hour=s.startHour;hour<s.endHour;hour++)for(const minute of [0,30]){
   const start=zonedStart(date,hour,minute,s.timeZone),end=start+s.duration*60000;
   if(start<now+s.noticeHours*3600000||start>now+s.horizonDays*86400000)continue;
   starts.push({date,start:new Date(start).toISOString(),end:new Date(end).toISOString()});
  }
 }
 return starts;
}
export function availableSlots(candidates,busy,bufferMinutes=0){const buffer=bufferMinutes*60000;return candidates.filter(slot=>!busy.some(b=>Date.parse(b.start)<Date.parse(slot.end)+buffer&&Date.parse(b.end)>Date.parse(slot.start)-buffer));}
async function freeBusy(env,s,starts){
 if(!starts.length)return [];
 const data=await google(env,'freeBusy',{method:'POST',body:JSON.stringify({timeMin:new Date(Date.parse(starts[0].start)-(s.bufferMinutes||0)*60000).toISOString(),timeMax:new Date(Date.parse(starts.at(-1).end)+(s.bufferMinutes||0)*60000).toISOString(),timeZone:s.timeZone,items:[{id:s.calendarId}]})});
 const calendar=data.calendars?.[s.calendarId];if(!calendar||calendar.errors?.length||!Array.isArray(calendar.busy))throw fail('Availability could not be verified. Please try again.');return calendar.busy;
}
export function validateBrief(input){
 const b={};for(const key of ['name','email','company','industry','message'])b[key]=String(input?.[key]||'').trim();
 b.services=Array.isArray(input?.services)?input.services.filter(s=>typeof s==='string'&&s.length<=100).slice(0,8):[];
 if(!b.name||b.name.length>100||!/^\S+@\S+\.\S+$/.test(b.email)||b.email.length>254||!b.company||b.company.length>150||!b.industry||b.industry.length>100||b.message.length<10||b.message.length>1500||!b.services.length)throw fail('Complete your name, email and project brief.',400);return b;
}
function confirmation(event,slot,s){return {confirmed:true,start:slot.start,end:slot.end,timeZone:s.timeZone,meetingUrl:event.hangoutLink||event.conferenceData?.entryPoints?.find(e=>e.entryPointType==='video')?.uri||null};}
async function createBooking(env,s,body){
 const brief=validateBrief(body.brief),id=String(body.requestId||'').replaceAll('-','');
 if(!/^[a-f0-9]{32}$/.test(id)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(body.start||''))throw fail('Choose an available time.',400);
 const requested=Date.parse(body.start),localDate=new Intl.DateTimeFormat('en-CA',{timeZone:s.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(requested);
 const existing=await env.DB.prepare('SELECT * FROM calendar_bookings WHERE id=?').bind(id).first();
 if(existing)s={...s,calendarId:existing.calendar_id};
 const currentSlot=candidateSlots(s,localDate.slice(0,7)).find(x=>x.start===body.start);
 const slot=currentSlot||(existing?{date:localDate,start:body.start,end:new Date(requested+s.duration*60000).toISOString()}:null);if(!slot)throw fail('This time is no longer available. Choose another.',409);
 const signature=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(JSON.stringify({brief,start:slot.start})))),b=>b.toString(16).padStart(2,'0')).join('');
 if(existing){
  if(existing.signature!==signature)throw fail('Choose a new booking request.',409);
  if(existing.status==='cancelled')throw fail('This booking was cancelled. Choose another time.',409);
  if(existing.status==='confirmed'&&existing.confirmation)return JSON.parse(existing.confirmation);
  try{
   const event=await google(env,`calendars/${encodeURIComponent(s.calendarId)}/events/${id}`);
   if(event.status==='cancelled')throw fail('This booking was cancelled. Choose another time.',409);
   const result=confirmation(event,slot,s);
   await env.DB.prepare("UPDATE calendar_bookings SET status='confirmed', confirmation=? WHERE id=?").bind(JSON.stringify(result),id).run();
   return result;
  }catch(error){if(error.googleStatus!==404)throw error;}
 }
 if(!currentSlot)throw fail('This time is no longer available. Choose another.',409);
 const busy=await freeBusy(env,s,[slot]);if(!availableSlots([slot],busy,s.bufferMinutes).length)throw fail('This time was just booked. Choose another.',409);
 const previous=await env.DB.prepare("SELECT id,calendar_id FROM calendar_bookings WHERE status='confirmed' AND start_at<? AND end_at>?").bind(Date.parse(slot.end),Date.parse(slot.start)).all();
 for(const row of previous.results){
  let cancelled=false;
  try{const event=await google(env,`calendars/${encodeURIComponent(row.calendar_id)}/events/${row.id}`);cancelled=event.status==='cancelled'||(event.start?.dateTime&&event.end?.dateTime&&(Date.parse(event.start.dateTime)>=Date.parse(slot.end)||Date.parse(event.end.dateTime)<=Date.parse(slot.start)));}catch(error){if(error.googleStatus===404||error.googleStatus===410)cancelled=true;else throw error;}
  if(cancelled)await env.DB.prepare("UPDATE calendar_bookings SET status='cancelled' WHERE id=?").bind(row.id).run();
 }
 const lockEnd=Date.parse(slot.end)+(s.bufferMinutes||0)*60000,lockStart=Date.parse(slot.start)-(s.bufferMinutes||0)*60000;
 const now=Date.now();await env.DB.prepare("DELETE FROM calendar_bookings WHERE status='pending' AND expires_at<? AND id!=?").bind(now,id).run();
 if(existing){
  const renewed=await env.DB.prepare("UPDATE calendar_bookings SET expires_at=? WHERE id=? AND status='pending' AND NOT EXISTS (SELECT 1 FROM calendar_bookings WHERE id!=? AND status IN ('pending','confirmed') AND start_at<? AND end_at>?)").bind(now+20*60000,id,id,lockEnd,lockStart).run();
  if(!renewed.meta.changes)throw fail('This time was just booked. Choose another.',409);
 }else{
 const locked=await env.DB.prepare("INSERT INTO calendar_bookings(id,calendar_id,start_at,end_at,status,expires_at,signature,brief,created_at) SELECT ?,?,?,?,'pending',?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM calendar_bookings WHERE status IN ('pending','confirmed') AND start_at<? AND end_at>?)").bind(id,s.calendarId,Date.parse(slot.start),Date.parse(slot.end),now+20*60000,signature,JSON.stringify(brief),new Date(now).toISOString(),lockEnd,lockStart).run();
 if(!locked.meta.changes){const retry=await env.DB.prepare('SELECT signature FROM calendar_bookings WHERE id=?').bind(id).first();if(retry?.signature===signature)throw fail('Your confirmation is in progress. Try again in a moment.');throw fail('This time was just booked. Choose another.',409);}
 }
 try{
  const event=await google(env,`calendars/${encodeURIComponent(s.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,{method:'POST',body:JSON.stringify({id,summary:`Briefing — ${brief.company}`,description:formatBrief(brief),start:{dateTime:slot.start,timeZone:s.timeZone},end:{dateTime:slot.end,timeZone:s.timeZone},attendees:[{email:brief.email,displayName:brief.name}],conferenceData:{createRequest:{requestId:id,conferenceSolutionKey:{type:'hangoutsMeet'}}},extendedProperties:{private:{desartlyBooking:id}}})});
  const result=confirmation(event,slot,s);await env.DB.prepare("UPDATE calendar_bookings SET status='confirmed', confirmation=? WHERE id=?").bind(JSON.stringify(result),id).run();return result;
 }catch(error){
  // A failed response can follow a successful Google insert. Keep the hold and
  // stable event ID so retries cannot send duplicate calendar invitations.
  if(error.googleStatus===409){const event=await google(env,`calendars/${encodeURIComponent(s.calendarId)}/events/${id}`);if(event.status==='cancelled')throw fail('This booking was cancelled.',409);const result=confirmation(event,slot,s);await env.DB.prepare("UPDATE calendar_bookings SET status='confirmed', confirmation=? WHERE id=?").bind(JSON.stringify(result),id).run();return result;}
  throw error;
 }
}
async function manageBooking(env,s,body){
 const id=String(body.id||'');if(!/^[a-f0-9]{32}$/.test(id))throw fail('Choose a website appointment.',400);
 const row=await env.DB.prepare('SELECT * FROM calendar_bookings WHERE id=?').bind(id).first();
 if(!row)throw fail('Appointment not found.',404);
 s={...s,calendarId:row.calendar_id};
 const path=`calendars/${encodeURIComponent(row.calendar_id)}/events/${id}`;
 if(body.action==='cancel'){
  if(row.status==='cancelled')return {ok:true,cancelled:true};
  try{await google(env,path+'?sendUpdates=all',{method:'DELETE'});}catch(e){if(e.googleStatus!==404&&e.googleStatus!==410)throw e;}
  await env.DB.prepare("UPDATE calendar_bookings SET status='cancelled' WHERE id=?").bind(id).run();
  return {ok:true,cancelled:true};
 }
 if(body.action!=='reschedule'||row.status!=='confirmed')throw fail('Choose a confirmed appointment and a valid action.',400);
 const start=String(body.start||'');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(start)||!Number.isFinite(Date.parse(start)))throw fail('Choose an available time.',400);
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:s.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.parse(start)).slice(0,7);
 const slot=candidateSlots(s,month).find(x=>x.start===start);if(!slot)throw fail('This time is no longer available.',409);
 const live=await google(env,path);if(live.status==='cancelled')throw fail('This appointment was cancelled in Google Calendar.',409);
 const finish=async event=>{
  const result=confirmation(event,slot,s);
  await env.DB.prepare("UPDATE calendar_bookings SET start_at=?,end_at=?,confirmation=? WHERE id=?").bind(Date.parse(slot.start),Date.parse(slot.end),JSON.stringify(result),id).run();
  await env.DB.prepare("UPDATE calendar_bookings SET status='cancelled' WHERE status='pending' AND signature=?").bind('reschedule:'+id).run();
  return {ok:true,...result};
 };
 // Recover a successful Google update whose response or database write was lost.
 if(live.start?.dateTime&&Date.parse(live.start.dateTime)===Date.parse(start))return finish(live);
 const buffer=(s.bufferMinutes||0)*60000,lockStart=Date.parse(slot.start)-buffer,lockEnd=Date.parse(slot.end)+buffer;
 const query=new URLSearchParams({timeMin:new Date(lockStart).toISOString(),timeMax:new Date(lockEnd).toISOString(),singleEvents:'true',maxResults:'2500'});
 const events=await google(env,`calendars/${encodeURIComponent(row.calendar_id)}/events?${query}`);
 if(events.nextPageToken||!Array.isArray(events.items))throw fail('Availability could not be verified.');
 const busy=events.items.filter(e=>e.id!==id&&e.status!=='cancelled'&&e.transparency!=='transparent').map(e=>({start:e.start?.dateTime||(e.start?.date+'T00:00:00+03:30'),end:e.end?.dateTime||(e.end?.date+'T00:00:00+03:30')}));
 if(busy.some(e=>!Number.isFinite(Date.parse(e.start))||!Number.isFinite(Date.parse(e.end)))||!availableSlots([slot],busy,s.bufferMinutes).length)throw fail('This time is busy. Choose another.',409);
 const hold='move'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(id+start))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,28);
 await env.DB.prepare("DELETE FROM calendar_bookings WHERE status='pending' AND expires_at<?").bind(Date.now()).run();
 const existing=await env.DB.prepare('SELECT * FROM calendar_bookings WHERE id=?').bind(hold).first();
 if(!existing){
  const locked=await env.DB.prepare("INSERT INTO calendar_bookings(id,calendar_id,start_at,end_at,status,expires_at,signature,brief,created_at) SELECT ?,?,?,?,'pending',?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM calendar_bookings WHERE id!=? AND status IN ('pending','confirmed') AND ((start_at<? AND end_at>?) OR signature=?))").bind(hold,row.calendar_id,Date.parse(slot.start),Date.parse(slot.end),Date.now()+20*60000,'reschedule:'+id,row.brief,new Date().toISOString(),id,lockEnd,lockStart,'reschedule:'+id).run();
  if(!locked.meta.changes)throw fail('This time was just booked. Choose another.',409);
 }
 const event=await google(env,path+'?sendUpdates=all&conferenceDataVersion=1',{method:'PATCH',body:JSON.stringify({start:{dateTime:slot.start,timeZone:s.timeZone},end:{dateTime:slot.end,timeZone:s.timeZone}})});
 const result=await finish(event);
 await env.DB.prepare("UPDATE calendar_bookings SET status='cancelled' WHERE id=?").bind(hold).run();
 return result;
}
export async function calendarResponse(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/calendar/')&&!path.startsWith('/api/studio/calendar'))return null;
 try{
  const ownerPath=path.startsWith('/api/studio/calendar');// OAuth state and PKCE authenticate the cross-site callback; Strict owner cookies are absent there.
  if(ownerPath&&path!=='/api/studio/calendar/callback'&&!(await isOwner(request,env)))return json({error:'Owner sign-in required.'},401);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Request origin rejected.'},403);
  const s=await schedule(env),c=await connection(env),configured=!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.DESARTLY_AUTH);
  if(path==='/api/studio/calendar'&&request.method==='GET')return json({configured,connected:!!c?.refreshToken,schedule:s});
  if(path==='/api/studio/calendar/manage'&&request.method==='POST')return json(await manageBooking(env,s,JSON.parse(new TextDecoder().decode(await bounded(request,2000)))));
  if(path==='/api/studio/calendar/schedule'&&request.method==='POST'){
   const body=JSON.parse(new TextDecoder().decode(await bounded(request,8000)));const next=validateSchedule(body);await env.DESARTLY_AUTH.put(SCHEDULE,JSON.stringify(next));return json({ok:true,schedule:next});
  }
  if(path==='/api/studio/calendar/bookings'&&request.method==='GET'){
   const rows=await env.DB.prepare("SELECT id,start_at,end_at,status,brief,confirmation,created_at FROM calendar_bookings WHERE status!='cancelled' AND signature NOT LIKE 'reschedule:%' AND end_at>? ORDER BY start_at LIMIT 100").bind(Date.now()-86400000).all();return json({bookings:rows.results.map(r=>({...r,brief:JSON.parse(r.brief),confirmation:r.confirmation?JSON.parse(r.confirmation):null}))});
  }
  if(path==='/api/studio/calendar/connect'&&request.method==='GET'){
   if(!configured)throw fail('Google Calendar API credentials need to be configured.');
   const state=crypto.randomUUID(),verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   await env.DESARTLY_AUTH.put('google-calendar:state:'+state,JSON.stringify({verifier}),{expirationTtl:600});
   const challenge=b64(await crypto.subtle.digest('SHA-256',enc.encode(verifier))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   const params=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.GOOGLE_REDIRECT_URI||'https://desartly.vercel.app/api/studio/calendar/callback',response_type:'code',scope:SCOPES.join(' '),access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});
   return new Response(null,{status:302,headers:{Location:'https://accounts.google.com/o/oauth2/v2/auth?'+params,'Cache-Control':'no-store'}});
  }
  if(path==='/api/studio/calendar/callback'&&request.method==='GET'){
   const state=url.searchParams.get('state');if(!/^[a-f0-9-]{36}$/.test(state||''))throw fail('Calendar connection expired. Try again.',400);
   const stored=await env.DESARTLY_AUTH.get('google-calendar:state:'+state,'json');if(!stored)throw fail('Calendar connection expired. Try again.',400);
   await env.DESARTLY_AUTH.delete('google-calendar:state:'+state);
   if(url.searchParams.has('error'))return new Response(null,{status:302,headers:{Location:'/studio/calendar?connection=cancelled','Cache-Control':'no-store'}});
   const code=url.searchParams.get('code');if(!code||code.length>2000)throw fail('Calendar connection failed. Try again.',400);
   const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.GOOGLE_REDIRECT_URI||'https://desartly.vercel.app/api/studio/calendar/callback',code,code_verifier:stored.verifier,grant_type:'authorization_code'}),signal:AbortSignal.timeout(10000)});
   const data=await response.json();if(!response.ok||!data.refresh_token||!data.access_token||SCOPES.some(scope=>!String(data.scope||'').split(' ').includes(scope)))throw fail('Allow both calendar permissions to connect.',400);
   await saveConnection(env,{refreshToken:data.refresh_token,accessToken:data.access_token,expires:Date.now()+Number(data.expires_in||3600)*1000});
   return new Response(null,{status:302,headers:{Location:'/studio/calendar?connection=success','Cache-Control':'no-store'}});
  }
  if(path==='/api/calendar/availability'&&request.method==='GET'){
   if(!configured||!c?.refreshToken)return json({connected:false,timeZone:s.timeZone,duration:s.duration,slots:[]});
   if(!env.PUBLIC_RATE_LIMITER||!(await env.PUBLIC_RATE_LIMITER.limit({key:'availability:'+(request.headers.get('CF-Connecting-IP')||'local')})).success)return json({error:'Please try again in a minute.'},429);
   const candidates=candidateSlots(s,url.searchParams.get('month')||new Intl.DateTimeFormat('en-CA',{timeZone:s.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now()).slice(0,7));
   const busy=await freeBusy(env,s,candidates);
   const holds=await env.DB.prepare("SELECT start_at,end_at FROM calendar_bookings WHERE status='pending' AND expires_at>?").bind(Date.now()).all();
   busy.push(...holds.results.map(r=>({start:new Date(r.start_at).toISOString(),end:new Date(r.end_at).toISOString()})));
   return json({connected:true,timeZone:s.timeZone,duration:s.duration,slots:availableSlots(candidates,busy,s.bufferMinutes)});
  }
  if(path==='/api/calendar/book'&&request.method==='POST'){
   if(!env.PUBLIC_RATE_LIMITER||!(await env.PUBLIC_RATE_LIMITER.limit({key:'booking:'+(request.headers.get('CF-Connecting-IP')||'local')})).success)return json({error:'Please try again in a minute.'},429);
   if(!configured||!c?.refreshToken)throw fail('The booking calendar is not connected yet.');
   const body=JSON.parse(new TextDecoder().decode(await bounded(request,6000)));if(body.website_trap)return json({error:'Booking could not be confirmed.'},400);
   return json(await createBooking(env,s,body));
  }
  return json({error:'Not found'},404);
 }catch(error){return json({error:error.status?error.message:'The calendar could not be reached. Please try again.'},error.status||503);}
}
