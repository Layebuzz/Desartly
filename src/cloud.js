import photography from './project-photography.json';
export const cloud={ready:false,version:0,values:{},error:'',allowLocal:false};
const fields={'pol-published':'projects','pol-draft':'projects','pol-categories':'categories','pol-certificates':'certificates','pol-certificates-draft':'certificates','pol-page-content':'pages','pol-nav':'nav','pol-stats':'stats','pol-clients':'clients','pol-blog-posts':'blogPosts','pol-home-sections':'homeSections'};
function load(site){if(!site)return;
 for(const project of site.projects||[]){
  if(project.id==='cafe-de-la-corte'){for(const block of project.blocks||[]){if(block.id==='cafe-application-pair' && block.images?.[0]==='/api/media/9e2a8590-c970-4a93-8922-0447d927d91e')block.images[0]='/projects/cafe-de-la-corte/pour-full.webp';}project.blocks=(project.blocks||[]).flatMap(b=>b.id==='cafe-application-pair'?[{id:'cafe-pour-complete',type:'image',image:'/projects/cafe-de-la-corte/pour-full.webp',alt:'Café De La Corte poured into an iced coffee glass'},{id:'cafe-label-complete',type:'image',image:b.images[1],alt:'Café De La Corte shield label detail'}]:[b]);}
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
