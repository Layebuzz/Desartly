import {marketingChannels} from '../src/cms/marketing-catalog.js';
const dayMs=86400000;
export const tehranDate=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function nextMarketingSlot(s,after){
 const first=tehranDate(after),anchor=Date.parse(s.start+'T12:00:00Z');
 for(let i=0;i<32;i++){
  const date=new Date(Date.parse(first+'T12:00:00Z')+i*dayMs).toISOString().slice(0,10),day=new Date(date+'T12:00:00Z').getUTCDay(),delta=Math.round((Date.parse(date+'T12:00:00Z')-anchor)/dayMs);
  const matches=delta>=0&&(s.cadence==='alternate'?delta%2===0:s.days.includes(day));
  const at=Date.parse(date+'T'+s.time+':00+03:30');if(matches&&at>after)return at;
 }throw Error('Choose a valid schedule start and days.');
}
export function validateMarketingSchedule(value,m,now=new Date()){
 const bad=()=>{throw Object.assign(Error('Choose a program, cadence, language, categories, valid start date and Tehran time.'),{status:400});};
 if(!value||typeof value.enabled!=='boolean'||!m.programs.some(p=>p.id===value.programId&&!p.archived)||!['weekly','twice','alternate'].includes(value.cadence)||!['fa','en','both'].includes(value.language)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time||''))bad();
 if(!Array.isArray(value.days))bad();const days=[...new Set(value.days)];if(days.some(d=>!Number.isInteger(d)||d<0||d>6)||value.cadence!=='alternate'&&days.length!==(value.cadence==='weekly'?1:2))bad();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value.start||'')||!Number.isFinite(Date.parse(value.start+'T12:00:00Z'))||new Date(value.start+'T12:00:00Z').toISOString().slice(0,10)!==value.start)bad();
 if(value.start>tehranDate(new Date(now.getTime()+14*dayMs)))bad();
 if(![24,48,72,168].includes(value.deadlineHours)||!Array.isArray(value.channels)||!value.channels.length||value.channels.length>12||value.channels.some(id=>!marketingChannels.some(c=>c.id===id)))bad();
 const s={id:crypto.randomUUID().replaceAll('-','').slice(0,16),enabled:value.enabled,programId:value.programId,cadence:value.cadence,language:value.language,days,time:value.time,start:value.start,deadlineHours:value.deadlineHours,channels:[...new Set(value.channels)],timezone:'Asia/Tehran',updatedAt:now.toISOString()};s.nextAt=nextMarketingSlot(s,now.getTime());return s;
}
export function scheduleMarketingTask(m,now){
 const s=m.schedule,p=m.programs.find(p=>p.id===s?.programId&&!p.archived);if(!s?.enabled||!p||s.nextAt>now)return false;
 if(p.start&&p.start>tehranDate(now))return false;
 if(!p.ongoing&&p.end<tehranDate(now)){s.enabled=false;s.error='Program ended. Choose another program to continue.';return true;}
 const at=s.nextAt;s.reminder={id:'pick-'+s.id+'-'+tehranDate(at),at,programId:p.id};s.nextAt=nextMarketingSlot(s,now);delete s.error;return true;
}
