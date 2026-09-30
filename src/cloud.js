import photography from './project-photography.json' with { type: 'json' };
import divarPresentation from './divar-project.json' with { type: 'json' };
import mciPresentation from './mci-project.json' with { type: 'json' };
import airbnbPresentation from './airbnb-project.json' with { type: 'json' };
import digikalaPresentation from './digikala-project.json' with { type: 'json' };
import flightioPresentation from './flightio-project.json' with { type: 'json' };
export const cloud={ready:false,version:0,values:{},error:'',allowLocal:false};
const fields={'pol-published':'projects','pol-draft':'projects','pol-categories':'categories','pol-certificates':'certificates','pol-certificates-draft':'certificates','pol-page-content':'pages','pol-nav':'nav','pol-stats':'stats','pol-clients':'clients','pol-blog-posts':'blogPosts','pol-home-sections':'homeSections'};
function load(site){if(!site)return;
 if(!Array.isArray(site.projects))site.projects=[];
 if(!site.projects.some(project=>project.id===mciPresentation.id))site.projects.push(structuredClone(mciPresentation));
 const existingAirbnb=site.projects.find(project=>project.id===airbnbPresentation.id);
 if(!existingAirbnb)site.projects.push(structuredClone(airbnbPresentation));
 else if(existingAirbnb.presentationVersion!==airbnbPresentation.presentationVersion)Object.assign(existingAirbnb,structuredClone(airbnbPresentation));
 const existingDigikala=site.projects.find(project=>project.id===digikalaPresentation.id);
 if(!existingDigikala)site.projects.push(structuredClone(digikalaPresentation));
 else if(existingDigikala.presentationVersion!==digikalaPresentation.presentationVersion)Object.assign(existingDigikala,structuredClone(digikalaPresentation));
 const existingFlightio=site.projects.find(project=>project.id===flightioPresentation.id);
 if(!existingFlightio)site.projects.push(structuredClone(flightioPresentation));
 else if(existingFlightio.presentationVersion!==flightioPresentation.presentationVersion)Object.assign(existingFlightio,structuredClone(flightioPresentation));
 for(const project of site.projects||[]){
  if(project.year===undefined||project.year===null){const years={divar:2025,toypet:2023,myom:2024,'cafe-de-la-corte':2022,noghteh:2021};project.year=String(years[project.id]||2021+[...project.id].reduce((sum,c)=>sum+c.charCodeAt(0),0)%5);}
  if(project.id==='divar'){
   if(!Array.isArray(project.tags))project.tags=structuredClone(divarPresentation.tags);
   project.clientName=divarPresentation.clientName;project.clientLogo=divarPresentation.clientLogo;project.clientDescription=divarPresentation.clientDescription;
   for(const block of project.blocks||[]){if(block.id==='divar-human-ai'&&block.image==='/projects/divar/human-ai.webp')block.image='/projects/divar/human-ai-final.webp';}
  }
  if(project.id==='divar' && project.blocks?.some(b=>b.id==='divar-category-world'&&((b.type==='image'&&b.image==='/projects/divar/category-panel.webp')||(b.type==='html'&&b.title==='Divar · Interactive category explorer')||(b.component==='divar-categories'&&b.componentVersion<2)))){
   project.blocks=project.blocks.map(b=>['divar-category-world','divar-chapter-03'].includes(b.id)?structuredClone(divarPresentation.blocks.find(next=>next.id===b.id)):b);
  }
  if(project.id==='cafe-de-la-corte'){for(const b of project.blocks||[]){if(b.id==='cafe-pour-complete')b.image='/projects/cafe-de-la-corte/serving-ritual.webp';}for(const block of project.blocks||[]){if(block.id==='cafe-application-pair' && block.images?.[0]==='/api/media/9e2a8590-c970-4a93-8922-0447d927d91e')block.images[0]='/projects/cafe-de-la-corte/serving-ritual.webp';}project.blocks=(project.blocks||[]).flatMap(b=>b.id==='cafe-application-pair'?[{id:'cafe-pour-complete',type:'image',image:'/projects/cafe-de-la-corte/serving-ritual.webp',alt:'Café De La Corte bottle and iced coffee on a sunlit stone table'},{id:'cafe-label-complete',type:'image',image:b.images[1],alt:'Café De La Corte shield label detail'}]:[b]);}
  if(project.id==='noghteh' && project.blocks?.some(b=>b.id==='noghteh-env-left'))project.blocks=structuredClone(photography.noghteh);
  if(project.id==='cafe-de-la-corte' && !project.blocks?.some(b=>b.id==='cafe-fresh-hospitality'))project.blocks=[...(project.blocks||[]),...structuredClone(photography['cafe-de-la-corte'].filter(b=>b.id.startsWith('cafe-fresh-')))];
 }
for(const [key,field]of Object.entries(fields)){if(site[field]!==undefined)cloud.values[key]=site[field];}}
export async function bootstrapCloud(){
 try{
  const r=await fetch('/api/site',{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Cloud content unavailable');const data=await r.json();cloud.ready=true;
  const editing=/\/(edit|new)\/?$/.test(location.pathname)||location.pathname==='/admin';
  cloud.allowLocal=editing;
  if(editing){const response=await fetch('/api/studio');if(response.ok){const state=await response.json();cloud.version=state.draftVersion||0;load(state.draftVersion?state.draft:data.site);return;}}
  load(data.site);
 }catch(e){cloud.error=e.message;}
}
export async function saveCloud(site,publish=false){
 if(!cloud.ready)throw Error('Cloud connection unavailable. A local backup was kept; retry after reconnecting.');
 const response=await fetch('/api/studio/'+(publish?'publish':'save'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site,draftVersion:cloud.version})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save.');cloud.version=result.draftVersion;load(site);
}

export async function uploadMedia(blob,name='Image.webp') {
 const response=await fetch('/api/studio/upload',{method:'POST',headers:{'Content-Type':blob.type,'X-File-Name':encodeURIComponent(name)},body:blob});const data=await response.json();if(!response.ok)throw Error(data.error||'Upload failed');return data.item.url;
}
