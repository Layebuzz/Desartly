import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {candidateSlots,availableSlots,defaultSchedule,validateSchedule,validateBrief,calendarResponse} from '../server/calendar-service.js';
const brief={name:'Test Visitor',email:'visitor@example.test',company:'Fixture Co',industry:'Design',message:'A test-only design project briefing.',services:['Branding']};
const dbFixture=()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../server/migrations/0002_calendar.sql',import.meta.url),'utf8'));
 return {prepare(sql){return {bind(...values){return {async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}};}};}};
};
async function fixture(){
 const map=new Map(),secret='fixture-owner-secret';
 const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['encrypt']);const iv=new Uint8Array(12);
 const value={refreshToken:'fixture-refresh',accessToken:'fixture-access',expires:Date.now()+3600000};
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));
 map.set('google-calendar:connection',JSON.stringify({iv:Buffer.from(iv).toString('base64'),data:Buffer.from(data).toString('base64')}));
 return {env:{OWNER_SESSION_SECRET:secret,GOOGLE_CLIENT_ID:'fixture-client',GOOGLE_CLIENT_SECRET:'fixture-secret',DESARTLY_AUTH:{get:async k=>map.has(k)?JSON.parse(map.get(k)):null,put:async(k,v)=>map.set(k,v),delete:async k=>map.delete(k)},DB:dbFixture(),PUBLIC_RATE_LIMITER:{limit:async()=>({success:true})}},map};
}
function nextSlot(){const now=Date.now();for(let i=0;i<3;i++){const month=new Date(now+i*28*86400000).toISOString().slice(0,7);const slots=candidateSlots(defaultSchedule,month,now);if(slots.length)return slots[0];}throw Error('No fixture slot');}
const bookingRequest=(slot,id=crypto.randomUUID())=>new Request('https://site.test/api/calendar/book',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'application/json'},body:JSON.stringify({start:slot.start,requestId:id,brief})});
test('availability respects Tehran working days, lead time, horizon and busy overlaps',()=>{
 const now=Date.parse('2026-10-06T00:00:00Z'),slots=candidateSlots(defaultSchedule,'2026-10',now);
 assert(slots.length);assert(slots.every(s=>Date.parse(s.start)>=now+12*3600000&&Date.parse(s.start)<=now+30*86400000));
 assert(slots.every(s=>!['Thu','Fri'].includes(new Intl.DateTimeFormat('en',{timeZone:'Asia/Tehran',weekday:'short'}).format(new Date(s.start)))));
 assert(slots.some(s=>s.start.slice(11,16)==='06:30')); 
 assert.equal(availableSlots([slots[0]], [{start:slots[0].end,end:slots[1].end}]).length,1);
 assert.equal(availableSlots([slots[0]], [{start:slots[0].start,end:slots[0].end}]).length,0);
 assert.throws(()=>candidateSlots(defaultSchedule,'2026-13',now));
});
test('invalid schedules and incomplete briefs are rejected',()=>{
 assert.throws(()=>validateSchedule({...defaultSchedule,days:[]}));assert.throws(()=>validateSchedule({...defaultSchedule,startHour:16,endHour:10}));assert.throws(()=>validateBrief({...brief,email:'bad'}));assert.throws(()=>validateBrief({...brief,message:'tiny'}));assert.deepEqual(validateBrief(brief),brief);
});
test('unconnected calendar returns no fabricated slots or Google credentials',async()=>{
 const response=await calendarResponse(new Request('https://site.test/api/calendar/availability?month=2026-10'),{});assert.equal(response.status,200);const body=await response.json();assert.equal(body.connected,false);assert.deepEqual(body.slots,[]);assert(!JSON.stringify(body).includes('Token'));
});
test('owner calendar routes and cross-origin booking are protected',async()=>{
 assert.equal((await calendarResponse(new Request('https://site.test/api/studio/calendar'),{})).status,401);
 const response=await calendarResponse(new Request('https://site.test/api/calendar/book',{method:'POST',headers:{Origin:'https://other.test'}}),{});assert.equal(response.status,403);
});
test('upstream freebusy errors never become available time slots',async t=>{
 const {env}=await fixture();t.mock.method(globalThis,'fetch',async()=>Response.json({calendars:{primary:{errors:[{reason:'notFound'}]}}}));const slot=nextSlot();const response=await calendarResponse(new Request('https://site.test/api/calendar/availability?month='+slot.date.slice(0,7)),env);assert.equal(response.status,503);assert.equal((await response.json()).slots,undefined);
});
test('confirmed booking sends one Google event and idempotent retries send no duplicates',async t=>{
 const {env}=await fixture();let inserted=0;const slot=nextSlot(),id=crypto.randomUUID();
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});
  inserted++;const event=JSON.parse(options.body);assert.equal(event.attendees[0].email,brief.email);assert(event.description.includes(brief.message));assert(event.conferenceData.createRequest);return Response.json({...event,hangoutLink:'https://meet.google.com/fixture'});
 });
 const first=await calendarResponse(bookingRequest(slot,id),env);assert.equal(first.status,200);assert.equal((await first.json()).confirmed,true);
 const second=await calendarResponse(bookingRequest(slot,id),env);assert.equal(second.status,200);assert.equal(inserted,1);
});
test('concurrent visitors cannot both reserve the same time',async t=>{
 const {env}=await fixture();let inserted=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});inserted++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({...JSON.parse(options.body)});});
 const slot=nextSlot(),responses=await Promise.all([calendarResponse(bookingRequest(slot),env),calendarResponse(bookingRequest(slot),env)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(inserted,1);
});
test('a booking lost after upstream creation is recovered using its stable event ID',async t=>{
 const {env}=await fixture();let inserted=0,event;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});
  if(options.method==='POST'){inserted++;event=JSON.parse(options.body);throw Error('Network response lost');}
  return Response.json(event);
 });
 const slot=nextSlot(),id=crypto.randomUUID();assert.equal((await calendarResponse(bookingRequest(slot,id),env)).status,503);const retried=await calendarResponse(bookingRequest(slot,id),env);assert.equal(retried.status,200);assert.equal(inserted,1);
});
test('upstream booking failures cannot produce a false confirmation',async t=>{
 const {env}=await fixture();t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('freeBusy')?Response.json({calendars:{primary:{busy:[]}}}):Response.json({error:'fixture'},{status:500}));const response=await calendarResponse(bookingRequest(nextSlot()),env);assert.equal(response.status,503);assert.equal((await response.json()).confirmed,undefined);
});

function ownerCookie(env){const body=Buffer.from(JSON.stringify({role:'owner',exp:Date.now()+3600000,origin:'https://site.test'})).toString('base64url');return 'pol_owner='+body+'.'+createHmac('sha256',env.OWNER_SESSION_SECRET).update(body).digest('base64url');}
test('OAuth uses single-use state, PKCE, encrypted tokens and accepts the Strict-cookie callback',async t=>{
 const {env,map}=await fixture();map.delete('google-calendar:connection');
 const started=await calendarResponse(new Request('https://site.test/api/studio/calendar/connect',{headers:{Cookie:ownerCookie(env)}}),env);assert.equal(started.status,302);const location=new URL(started.headers.get('Location'));assert.equal(location.searchParams.get('code_challenge_method'),'S256');assert.equal(location.searchParams.get('access_type'),'offline');const state=location.searchParams.get('state');
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(String(url),'https://oauth2.googleapis.com/token');assert(options.body.get('code_verifier'));return Response.json({access_token:'new-fixture-access',refresh_token:'new-fixture-refresh',expires_in:3600,scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy'});});
 const callback=()=>new Request('https://site.test/api/studio/calendar/callback?state='+state+'&code=fixture-code');
 const completed=await calendarResponse(callback(),env);assert.equal(completed.status,302);assert.equal(completed.headers.get('Location'),'/studio/calendar?connection=success');assert(!map.get('google-calendar:connection').includes('new-fixture-refresh'));assert(!map.has('google-calendar:state:'+state));assert.equal((await calendarResponse(callback(),env)).status,400);
});
test('OAuth callbacks without a valid state never exchange a code',async t=>{
 const {env}=await fixture();let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('must not call');});const response=await calendarResponse(new Request('https://site.test/api/studio/calendar/callback?state='+crypto.randomUUID()+'&code=invalid'),env);assert.equal(response.status,400);assert.equal(calls,0);
});

test('recovery uses the original calendar after the owner changes the target calendar',async t=>{
 const {env,map}=await fixture();let event,inserted=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});
  assert(String(url).includes('/calendars/primary/events'));
  if(options.method==='POST'){inserted++;event=JSON.parse(options.body);throw Error('Lost response');}
  return Response.json(event);
 });
 const slot=nextSlot(),id=crypto.randomUUID();assert.equal((await calendarResponse(bookingRequest(slot,id),env)).status,503);
 map.set('google-calendar:schedule',JSON.stringify({...defaultSchedule,calendarId:'changed-calendar'}));
 assert.equal((await calendarResponse(bookingRequest(slot,id),env)).status,200);assert.equal(inserted,1);
});

test('holidays remove whole days and buffers block adjacent busy events',()=>{
 const now=Date.parse('2026-10-06T00:00:00Z');const s=validateSchedule({...defaultSchedule,holidays:['2026-10-06'],bufferMinutes:15});
 assert(candidateSlots(s,'2026-10',now).every(x=>x.date!=='2026-10-06'));
 const slot=candidateSlots(defaultSchedule,'2026-10',now)[0];
 assert.equal(availableSlots([slot],[{start:slot.end,end:new Date(Date.parse(slot.end)+1800000).toISOString()}],15).length,0);
 assert.throws(()=>validateSchedule({...defaultSchedule,holidays:['2026-02-30']}));
 assert.throws(()=>validateSchedule({...defaultSchedule,bufferMinutes:-1}));
});
const manageRequest=(env,body)=>new Request('https://site.test/api/studio/calendar/manage',{method:'POST',headers:{Cookie:ownerCookie(env),Origin:'https://site.test','Content-Type':'application/json'},body:JSON.stringify(body)});
async function confirmedFixture(t){
 const x=await fixture(),id=crypto.randomUUID(),slot=nextSlot();let event;
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});event=JSON.parse(options.body);return Response.json({...event,hangoutLink:'https://meet.google.com/fixture'});});
 assert.equal((await calendarResponse(bookingRequest(slot,id),x.env)).status,200);
 t.mock.restoreAll();return {...x,id:id.replaceAll('-',''),slot,event};
}
test('owner cancellation is confirmed only after Google succeeds, and retries are safe',async t=>{
 const x=await confirmedFixture(t);let calls=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.equal(options.method,'DELETE');assert(String(url).includes('sendUpdates=all'));return new Response(null,{status:204});});
 const body={id:x.id,action:'cancel'};assert.equal((await calendarResponse(manageRequest(x.env,body),x.env)).status,200);
 assert.equal((await calendarResponse(manageRequest(x.env,body),x.env)).status,200);assert.equal(calls,1);
 assert.equal((await x.env.DB.prepare('SELECT status FROM calendar_bookings WHERE id=?').bind(x.id).first()).status,'cancelled');
});
test('Google cancellation failures keep the appointment confirmed',async t=>{
 const x=await confirmedFixture(t);t.mock.method(globalThis,'fetch',async()=>Response.json({error:'unavailable'},{status:500}));
 assert.equal((await calendarResponse(manageRequest(x.env,{id:x.id,action:'cancel'}),x.env)).status,503);
 assert.equal((await x.env.DB.prepare('SELECT status FROM calendar_bookings WHERE id=?').bind(x.id).first()).status,'confirmed');
});
test('reschedule preserves the original event and brief and sends guest updates',async t=>{
 const x=await confirmedFixture(t),slots=candidateSlots(defaultSchedule,x.slot.date.slice(0,7)),target=slots.find(s=>Date.parse(s.start)>Date.parse(x.slot.end)+3600000);assert(target);
 let patches=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='PATCH'){patches++;assert(String(url).includes('/events/'+x.id+'?sendUpdates=all'));const update=JSON.parse(options.body);assert.equal(update.start.dateTime,target.start);return Response.json({...x.event,...update});}if(String(url).includes('/events?'))return Response.json({items:[]});return Response.json(x.event);});
 const response=await calendarResponse(manageRequest(x.env,{id:x.id,action:'reschedule',start:target.start}),x.env);assert.equal(response.status,200);assert.equal(patches,1);
 const row=await x.env.DB.prepare('SELECT * FROM calendar_bookings WHERE id=?').bind(x.id).first();assert.equal(row.start_at,Date.parse(target.start));assert.deepEqual(JSON.parse(row.brief),brief);
});
test('a busy reschedule never updates Google or the stored appointment',async t=>{
 const x=await confirmedFixture(t),target=candidateSlots(defaultSchedule,x.slot.date.slice(0,7)).find(s=>Date.parse(s.start)>Date.parse(x.slot.end)+3600000);let patches=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='PATCH'){patches++;throw Error('must not patch');}if(String(url).includes('/events?'))return Response.json({items:[{id:'busy',start:{dateTime:target.start},end:{dateTime:target.end}}]});return Response.json(x.event);});
 assert.equal((await calendarResponse(manageRequest(x.env,{id:x.id,action:'reschedule',start:target.start}),x.env)).status,409);assert.equal(patches,0);
 assert.equal((await x.env.DB.prepare('SELECT start_at FROM calendar_bookings WHERE id=?').bind(x.id).first()).start_at,Date.parse(x.slot.start));
});
test('buffer conflicts remain atomic when visitors book neighboring slots concurrently',async t=>{
 const {env,map}=await fixture();map.set('google-calendar:schedule',JSON.stringify({...defaultSchedule,bufferMinutes:15}));
 const a=nextSlot(),b={...a,start:a.end,end:new Date(Date.parse(a.end)+1800000).toISOString()};
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});await new Promise(r=>setTimeout(r,10));return Response.json(JSON.parse(options.body));});
 const responses=await Promise.all([calendarResponse(bookingRequest(a),env),calendarResponse(bookingRequest(b),env)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
});
test('a lost reschedule response is recovered without another patch or a stale hold',async t=>{
 const x=await confirmedFixture(t),target=candidateSlots(defaultSchedule,x.slot.date.slice(0,7)).find(s=>Date.parse(s.start)>Date.parse(x.slot.end)+3600000);let event=x.event,patches=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='PATCH'){patches++;event={...event,...JSON.parse(options.body)};throw Error('Lost response');}if(String(url).includes('/events?'))return Response.json({items:[]});return Response.json(event);});
 const request=()=>manageRequest(x.env,{id:x.id,action:'reschedule',start:target.start});
 assert.equal((await calendarResponse(request(),x.env)).status,503);
 assert.equal((await calendarResponse(request(),x.env)).status,200);assert.equal(patches,1);
 const holds=await x.env.DB.prepare("SELECT * FROM calendar_bookings WHERE status='pending'").bind().all();assert.equal(holds.results.length,0);
});
test('a reschedule hold prevents a visitor booking the same destination',async t=>{
 const x=await confirmedFixture(t),target=candidateSlots(defaultSchedule,x.slot.date.slice(0,7)).find(s=>Date.parse(s.start)>Date.parse(x.slot.end)+3600000);let entered,release;
 const patchEntered=new Promise(r=>entered=r),continuePatch=new Promise(r=>release=r);
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='PATCH'){entered();await continuePatch;return Response.json({...x.event,...JSON.parse(options.body)});}if(String(url).endsWith('freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});if(String(url).includes('/events?'))return Response.json({items:[]});return Response.json(x.event);});
 const moving=calendarResponse(manageRequest(x.env,{id:x.id,action:'reschedule',start:target.start}),x.env);await patchEntered;
 const visitor=await calendarResponse(bookingRequest(target),x.env);release();assert.equal(visitor.status,409);assert.equal((await moving).status,200);
});
