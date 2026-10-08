import {isVisibleProject} from './visibility.js';

// Counts describe published portfolio content; experience remains owner supplied.
export function practiceStats({projects=[],certificates=[],stats=[]}={}){
 const live=projects.filter(isVisibleProject);
 const credentials=certificates.filter(c=>!c.hidden&&!c.archived&&String(c.title||c.name||'').trim());
 const industries=new Set(live.map(p=>String(p.industry||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()).filter(Boolean));
 const years=stats.find(s=>s.id==='years');
 return [
  {id:'projects',value:String(live.length),label:'Projects in portfolio',detail:'Published case studies',automatic:true},
  {id:'years',value:String(years?.value??'00'),label:years?.label||'Years designing',detail:/replace|add the year/i.test(years?.detail||'')?'':years?.detail||''},
  {id:'certificates',value:String(credentials.length),label:'Certificates earned',detail:'Learning credentials in the collection',automatic:true},
  {id:'industries',value:String(industries.size),label:'Industries worked in',detail:'Across published projects',automatic:true},
 ];
}
