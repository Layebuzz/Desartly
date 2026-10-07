import {targetIndustries,personalities,serviceKeys} from './growth-model.js';
export const knowledgeGroups=[{id:'projects',label:'Projects',color:'#91b6ff',x:345,y:250},{id:'articles',label:'Journal',color:'#f3bf7b',x:705,y:250},{id:'services',label:'Services',color:'#af94ef',x:270,y:455},{id:'personality',label:'Personality',color:'#ef91b9',x:775,y:455},{id:'certificates',label:'Certificates',color:'#82d5bf',x:435,y:605},{id:'pages',label:'Pages',color:'#a9c6d2',x:615,y:605}];
export function buildKnowledgeGraph(state={}){
 const nodes=[],edges=[],projects=(state.projects||[]).filter(d=>d.status!=='Archived'),articles=(state.articles||[]).filter(d=>d.status!=='Archived');
 const add=(id,label,group,parent,extra={})=>{if(nodes.some(n=>n.id===id))return id;nodes.push({id,label,group,parent,active:true,...extra});if(parent)edges.push({source:parent,target:id});return id;};
 for(const g of knowledgeGroups)add(g.id,g.label,g.id,null,{kind:'core',x:g.x,y:g.y});
 for(let i=0;i<knowledgeGroups.length-1;i++)edges.push({source:knowledgeGroups[i].id,target:knowledgeGroups[i+1].id});edges.push({source:'pages',target:'projects'});
 const industries=[...new Set([...targetIndustries,...projects.map(p=>p.industry)].filter(Boolean))];
 for(const name of industries)add('industry:'+name,name,'projects','projects',{kind:'category',active:projects.some(p=>p.industry===name)});
 for(const p of projects){const parent=p.industry?'industry:'+p.industry:'projects';add('project:'+p.id,p.title,'projects',parent,{kind:'document',status:p.status,url:'/studio/projects/'+encodeURIComponent(p.id)});}
 for(const topic of new Set(articles.map(a=>a.category||'Notes')))add('topic:'+topic,topic,'articles','articles',{kind:'category'});
 for(const a of articles){add('article:'+a.id,a.title,'articles','topic:'+(a.category||'Notes'),{kind:'document',status:a.status,url:'/studio/articles/'+encodeURIComponent(a.id)});if(projects.some(p=>p.id===a.relatedProject))edges.push({source:'article:'+a.id,target:'project:'+a.relatedProject,relation:'Related project'});}
 for(const name of serviceKeys){add('service:'+name,name,'services','services',{kind:'category',active:projects.some(p=>p.category===name)});for(const p of projects.filter(p=>p.category===name))edges.push({source:'service:'+name,target:'project:'+p.id});}
 for(const p of personalities){add('personality:'+p.id,p.name,'personality','personality',{kind:'category',active:projects.some(d=>d.brandPersonality===p.id)});for(const d of projects.filter(d=>d.brandPersonality===p.id))edges.push({source:'personality:'+p.id,target:'project:'+d.id});}
 for(const c of state.knowledge?.certificates||[])add('certificate:'+c.id,c.title||c.name||c.id,'certificates','certificates',{kind:'document',url:'/studio/pages'});
 for(const p of state.nav||[])add('page:'+(p.to||p.url||p.path||p.id),p.label||p.to||p.url||p.path||p.id,'pages','pages',{kind:'document',url:'/studio/pages'});
 for(const group of knowledgeGroups){const categories=nodes.filter(n=>n.group===group.id&&n.kind==='category'),docs=nodes.filter(n=>n.group===group.id&&n.kind==='document');categories.forEach((n,i)=>{const a=i/categories.length*Math.PI*2;n.x=group.x+Math.cos(a)*112;n.y=group.y+Math.sin(a)*88;});docs.forEach((n,i)=>{const a=i/docs.length*Math.PI*2+.38,r=140+(i%3)*17;n.x=group.x+Math.cos(a)*r;n.y=group.y+Math.sin(a)*r*.75;});}
 return {nodes,edges};
}
