import {targetIndustries,personalities,serviceKeys} from './growth-model.js';
import {projectDiscipline} from '../project-tags.js';
export const knowledgeGroups=[{id:'projects',label:'Projects',color:'#50d5df',x:330,y:365},{id:'articles',label:'Journal',color:'#83e4eb',x:805,y:365}];
export function buildKnowledgeGraph(state={}){
 const nodes=[],edges=[],projects=(state.projects||[]).filter(d=>d.status!=='Archived'),articles=(state.articles||[]).filter(d=>d.status!=='Archived');
 const add=(id,label,group,parent,extra={})=>{if(nodes.some(n=>n.id===id))return id;nodes.push({id,label,group,parent,active:true,...extra});if(parent)edges.push({source:parent,target:id});return id;};
 for(const g of knowledgeGroups)add(g.id,g.label,g.id,null,{kind:'core',x:g.x,y:g.y,depth:0});
 const industries=[...new Set([...targetIndustries,...projects.map(p=>p.industry)].filter(Boolean))];
 for(const [di,discipline] of serviceKeys.entries()){
  const docs=projects.filter(p=>projectDiscipline(p)===discipline),base=-Math.PI/2+di*Math.PI*2/3,branch='discipline:'+discipline;
  add(branch,discipline,'projects','projects',{kind:'category',depth:1,active:docs.length>0,x:330+Math.cos(base)*80,y:365+Math.sin(base)*80});
  for(const [ii,industry] of [...industries,...(docs.some(p=>!p.industry)?['Unassigned industry']:[])].entries()){
   const matching=docs.filter(p=>(p.industry||'Unassigned industry')===industry),angle=base+(ii/(industries.length||1)-.5)*1.8,rad=125+(ii%5)*18+Math.sin(ii*2.7+di)*12,id=branch+'/industry:'+industry;
   add(id,industry,'projects',branch,{kind:'category',depth:2,active:matching.length>0,x:330+Math.cos(angle)*rad,y:365+Math.sin(angle)*rad,path:[discipline,industry]});
   const traits=[...personalities,...(matching.some(p=>!personalities.some(t=>t.id===p.brandPersonality))?[{id:'unassigned',name:'Unassigned personality'}]:[])];
   for(const [pi,trait] of traits.entries()){
    const subset=matching.filter(p=>(personalities.some(t=>t.id===p.brandPersonality)?p.brandPersonality:'unassigned')===trait.id),a=angle+(pi-2)*.035,r=210+(pi%3)*25+(ii%2)*10+Math.sin(ii*1.7+pi*2.3)*20,pid=id+'/personality:'+trait.id;
    add(pid,trait.name,'projects',id,{kind:'category',depth:3,active:subset.length>0,x:330+Math.cos(a)*r,y:365+Math.sin(a)*r,path:[discipline,industry,trait.name]});
    subset.forEach((p,i)=>{const da=a+(i-(subset.length-1)/2)*.045,dr=300+(i%2)*18;add('project:'+p.id,p.title,'projects',pid,{kind:'document',depth:4,status:p.status,url:'/studio/projects/'+encodeURIComponent(p.id),x:330+Math.cos(da)*dr,y:365+Math.sin(da)*dr,path:[discipline,industry,trait.name],summary:p.summary||''});});
   }
  }
 }
 const topics=[...new Set(articles.map(a=>a.category||'Notes'))];
 topics.forEach((topic,i)=>{const a=i/Math.max(1,topics.length)*Math.PI*2;add('topic:'+topic,topic,'articles','articles',{kind:'category',depth:1,x:805+Math.cos(a)*78,y:365+Math.sin(a)*90});});
 articles.forEach((a,i)=>{const angle=i/Math.max(1,articles.length)*Math.PI*2+.3,r=150+(i%3)*15;add('article:'+a.id,a.title,'articles','topic:'+(a.category||'Notes'),{kind:'document',depth:2,status:a.status,url:'/studio/articles/'+encodeURIComponent(a.id),x:805+Math.cos(angle)*r,y:365+Math.sin(angle)*r*1.3,path:[a.category||'Notes'],summary:a.excerpt||''});if(projects.some(p=>p.id===a.relatedProject))edges.push({source:'article:'+a.id,target:'project:'+a.relatedProject,relation:'Related project'});});
 const mesh=[],cloud=nodes.filter(n=>n.depth===2||n.kind==='document'||n.active&&n.depth===3),seen=new Set();
 for(const n of cloud){const nearby=cloud.filter(m=>m.id!==n.id&&m.group===n.group).map(m=>({m,d:Math.hypot(m.x-n.x,m.y-n.y)})).filter(v=>v.d<155).sort((a,b)=>a.d-b.d).slice(0,3);for(const {m} of nearby){const key=[n.id,m.id].sort().join('|');if(!seen.has(key)){seen.add(key);mesh.push({source:n.id,target:m.id});}}}
 return {nodes,edges,mesh};
}
