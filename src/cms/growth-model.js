import {siteProgress} from './site-progress.js';
import {projectDiscipline} from '../project-tags.js';
import {isVisibleProject} from './visibility.js';
export const personalities=[
 {id:'sincerity',name:'Sincerity',cue:'Warm, honest, down-to-earth'},
 {id:'excitement',name:'Excitement',cue:'Daring, imaginative, spirited'},
 {id:'competence',name:'Competence',cue:'Reliable, capable, intelligent'},
 {id:'sophistication',name:'Sophistication',cue:'Refined, charming, aspirational'},
 {id:'ruggedness',name:'Ruggedness',cue:'Tough, outdoors-oriented, resilient'}
];
export const targetIndustries=['Agriculture','Automotive','Beauty & Personal Care','Biotechnology','Classifieds','Design & Creative Services','E-commerce','Education','Energy','Entertainment & Media','Fashion & Apparel','Finance & Insurance','Food & Beverage','Health & Wellness','Hospitality','Logistics','Manufacturing','Nonprofit','OTA','Pet Care','Real Estate','Retail','Sports & Events','Technology & SaaS','Telecommunications','Travel & Hospitality'];
export const serviceKeys=['Branding','Product','Communication Design'];
export const serviceCounts=projects=>Object.fromEntries(serviceKeys.map(key=>[key,projects.filter(p=>projectDiscipline(p)===key).length]));
export function growthMetrics({projects=[],draftProjects=projects,articles=[],certificates=[],pages={},inbox=[],industries=[]}={}){
 const live=projects.filter(isVisibleProject),names=[...new Set([...targetIndustries,...industries,...live.map(p=>p.industry)].filter(Boolean))].sort();
 const rows=names.map(industry=>{const docs=live.filter(p=>p.industry===industry);const cells=personalities.map(personality=>({id:personality.id,name:personality.name,projects:docs.filter(p=>p.brandPersonality===personality.id).map(p=>({id:p.id,title:p.title,discipline:projectDiscipline(p)}))}));cells.forEach(c=>c.counts=serviceCounts(c.projects));return {industry,counts:serviceCounts(docs),total:docs.length,unassigned:docs.filter(p=>!personalities.some(x=>x.id===p.brandPersonality)).length,covered:cells.filter(c=>c.projects.length).length,cells};});
 const briefs=inbox.filter(x=>x.reason==='proposal'&&!x.test).length,coverage=rows.reduce((n,r)=>n+r.covered,0),target=rows.length*5;
 const achievements=rows.flatMap(r=>[{id:r.industry+'-first',title:'First mark · '+r.industry,current:Math.min(r.total,1),target:1},{id:r.industry+'-five',title:'Five projects · '+r.industry,current:Math.min(r.total,5),target:5},{id:r.industry+'-range',title:'Full range · '+r.industry,current:r.covered,target:5}]).concat([5,10,25,50].map(n=>({id:'briefs-'+n,title:n+' briefs received',current:Math.min(briefs,n),target:n})));
 const candidates=rows.flatMap(r=>r.cells.filter(c=>!c.projects.length).map(c=>({industry:r.industry,personality:c.id,personalityName:c.name,count:r.total,covered:r.covered,reason:r.unassigned?'Classify existing work first; this may already fill the gap.':'This personality has no published project in this industry.'}))).sort((a,b)=>a.count-b.count||a.covered-b.covered||a.industry.localeCompare(b.industry));
 const distinct=candidates.filter((c,i,a)=>a.findIndex(x=>x.industry===c.industry)===i);
 const suggestions=[...distinct,...candidates.filter(c=>!distinct.includes(c))].slice(0,3);
 return {progress:siteProgress({projects,draftProjects,articles,certificates,pages}),counts:serviceCounts(live),emptyIndustries:rows.filter(r=>!r.total).length,representedIndustries:rows.filter(r=>r.total).length,published:live.length,briefs,rows,coverage,target,percent:target?Math.round(coverage/target*100):0,unassigned:rows.reduce((n,r)=>n+r.unassigned,0),achievements,suggestions,unlocked:achievements.filter(a=>a.current>=a.target).length};
}
