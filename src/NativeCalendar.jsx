import React,{useEffect,useMemo,useState} from 'react';
import './native-calendar.css';
import {ChevronLeft,ChevronRight,Clock,Globe,ArrowUpRight,Check} from 'lucide-react';
const zone='Asia/Tehran';
function savedAttempt(brief){try{const value=JSON.parse(sessionStorage.getItem('desartly-booking-attempt'));return value&&Date.now()-value.at<86400000&&value.signature===JSON.stringify(brief)?value:null;}catch{return null;}}
function clearAttempt(){try{sessionStorage.removeItem('desartly-booking-attempt');}catch{}}
const dateKey=value=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const monthName=value=>new Intl.DateTimeFormat('en',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(value+'-01T12:00:00Z'));
const dayName=value=>new Intl.DateTimeFormat('en',{timeZone:zone,weekday:'long',month:'long',day:'numeric'}).format(new Date(value));
const timeName=value=>new Intl.DateTimeFormat('en',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:false}).format(new Date(value));
const emailBrief=brief=>`mailto:Komeili@desartly.info?subject=${encodeURIComponent((brief.meetingType==='mentorship'?'Mentorship — ':'Project briefing — ')+brief.company)}&body=${encodeURIComponent(`Name: ${brief.name}\nEmail: ${brief.email}\nServices: ${brief.services.join(', ')}\nIndustry: ${brief.industry}\n\n${brief.message}`)}`;
function shiftMonth(month,amount){const [y,m]=month.split('-').map(Number),date=new Date(Date.UTC(y,m-1+amount,1));return date.toISOString().slice(0,7);}
export function NativeCalendar({brief,onBack,onDone}){
 const today=dateKey(Date.now()),firstMonth=today.slice(0,7),lastMonth=dateKey(Date.now()+30*86400000).slice(0,7);
 const [month,setMonth]=useState(firstMonth),[data,setData]=useState(null),[date,setDate]=useState(''),[start,setStart]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[saving,setSaving]=useState(false),[result,setResult]=useState(null),[requestId,setRequestId]=useState(()=>savedAttempt(brief)?.requestId||crypto.randomUUID()),[pending,setPending]=useState(()=>savedAttempt(brief));
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');setData(null);setDate('');setStart('');
  fetch('/api/calendar/availability?month='+month,{signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||'Available times could not load.');return body;}).then(body=>{setData(body);setDate(body.slots?.[0]?.date||'');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[month,retry]);
 const byDate=useMemo(()=>{const map=new Map();for(const slot of data?.slots||[])map.set(slot.date,[...(map.get(slot.date)||[]),slot]);return map;},[data]);
 const [y,m]=month.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate(),offset=new Date(Date.UTC(y,m-1,1)).getUTCDay();
 const selected=(data?.slots||[]).find(s=>s.start===start)||(pending?{start:pending.start,end:new Date(Date.parse(pending.start)+30*60000).toISOString()}:null);const selectedStart=selected?.start;
 async function confirm(){
  if(!selected||saving)return;setSaving(true);setError('');
  try{const attempt={start:selectedStart,requestId,signature:JSON.stringify(brief),at:Date.now()};setPending(attempt);try{sessionStorage.setItem('desartly-booking-attempt',JSON.stringify(attempt));}catch{}const response=await fetch('/api/calendar/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief,start:selectedStart,requestId})});const body=await response.json();if(!response.ok){if(response.status===409){clearAttempt();setPending(null);setStart('');setRetry(v=>v+1);setRequestId(crypto.randomUUID());}throw Error(body.error||'Your booking could not be confirmed.');}if(!body.confirmed)throw Error('Your booking could not be confirmed.');setResult(body);clearAttempt();try{sessionStorage.removeItem('desartly-brief');}catch{}}catch(e){setError(e.message||'Your booking could not be confirmed. Try again.');}finally{setSaving(false);}
 }
 if(result)return <div className="native-booking-result" role="status"><div className="native-booking-check"><Check size={28}/></div><span className="booking-section-label">YOU’RE BOOKED</span><h2>A good conversation<br/>is on the calendar.</h2><p>Your 30-minute {brief.meetingType==='mentorship'?'mentorship session':'project briefing'} with Ali is confirmed.</p><div className="native-booking-confirmed"><strong>{dayName(result.start)}</strong><span>{timeName(result.start)}–{timeName(result.end)} · Tehran time</span><small>Google Calendar sends your invitation to {brief.email}.</small></div>{result.meetingUrl?<a className="booking-primary" href={result.meetingUrl} target="_blank" rel="noreferrer">Google Meet link <ArrowUpRight size={18}/></a>:<p className="booking-muted">Your meeting details will be in your calendar invitation.</p>}<p>To cancel or change your time, reply to Ali at <a href="mailto:Komeili@desartly.info">Komeili@desartly.info</a>.</p><button className="native-booking-text" onClick={onDone}>Back to the portfolio</button></div>;
 return <div className="native-calendar">
  <button className="booking-back" onClick={onBack} disabled={saving}><ChevronLeft size={16}/>Edit your brief</button>
  <span className="booking-section-label">02 / PICK A MOMENT</span><h2>Make time for your next idea.</h2><p className="booking-muted">Choose a date and time. Your brief is included automatically.</p>
  <div className="native-calendar-meta"><span><Clock size={15}/>30 minutes</span><span><Globe size={15}/>Tehran · UTC+03:30</span></div>
  <div className="native-calendar-layout">
   <div className="native-calendar-month" aria-busy={loading}>
    <div className="booking-month"><h3>{monthName(month)}</h3><div><button aria-label="Previous month" disabled={month<=firstMonth||saving} onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={17}/></button><button aria-label="Next month" disabled={month>=lastMonth||saving} onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={17}/></button></div></div>
    <div className="booking-calendar" aria-label="Choose an available date">{['S','M','T','W','T','F','S'].map((d,i)=><span className="native-weekday" key={'w'+i} aria-label={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'b'+i}/>)}{Array.from({length:days},(_,i)=>{const key=month+'-'+String(i+1).padStart(2,'0'),available=byDate.has(key);return <button key={key} type="button" disabled={!available||loading||saving} aria-pressed={date===key} aria-label={`${i+1} ${monthName(month)}${available?', available':''}`} onClick={()=>{setDate(key);setStart('');setPending(null);clearAttempt();setRequestId(crypto.randomUUID());}} className={key===today?'is-today':''}>{i+1}{available&&<i aria-hidden="true"/>}</button>;})}</div>
    <div className="native-calendar-status" role="status">{loading?'Checking available times…':data?.connected?<>Live availability · Google Calendar</>:'Calendar connection is being completed.'}</div>
   </div>
   <div className="native-calendar-slots"><h3>{date&&byDate.get(date)?.[0]?dayName(byDate.get(date)[0].start):'Available times'}</h3>{loading?<div className="native-time-skeleton" aria-hidden="true"><i/><i/><i/><i/></div>:data?.connected?(date&&byDate.has(date)?<div className="booking-times">{byDate.get(date).map(slot=><button key={slot.start} aria-pressed={start===slot.start} disabled={saving} onClick={()=>{setStart(slot.start);setPending(null);clearAttempt();setRequestId(crypto.randomUUID());}}>{timeName(slot.start)}</button>)}</div>:<p className="booking-muted">No times available this month. Try the next month.</p>):<div className="native-calendar-empty"><p className="booking-muted">Online times are temporarily unavailable. You can still send your project brief directly to Ali.</p><a href={emailBrief(brief)}>Send my brief <ArrowUpRight size={16}/></a></div>}</div>
  </div>
  {error&&<div className="native-booking-error" role="alert"><p>{error}</p>{!saving&&!selected&&<button onClick={()=>setRetry(v=>v+1)}>Try again</button>}</div>}
  {selected&&<div className="native-booking-review"><div><span>{brief.meetingType==='mentorship'?'YOUR MENTORSHIP SESSION':'YOUR BRIEFING'}</span><strong>{dayName(selectedStart)} · {timeName(selectedStart)}</strong><small>30 minutes · Google Meet · {brief.email}</small></div><p>Confirming creates a Google Calendar appointment and sends an invitation to your email.</p></div>}
  <button className="booking-primary" disabled={!selected||saving} onClick={confirm}>{saving?'Confirming your time…':pending?'Retry confirmation':'Confirm booking'}<ArrowUpRight size={18}/></button>
 </div>;
}
