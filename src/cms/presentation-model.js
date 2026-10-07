import {composition} from '../layouts.js';
import templates from './presentation-layouts.js';
import {projectDiscipline,projectIndustry} from '../project-tags.js';
export const PAGE={width:1920,height:1280};
const plain=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();
export function shortCopy(value,max=340){const text=plain(value);if(text.length<=max)return text;const chunk=text.slice(0,max-1);const sentence=Math.max(chunk.lastIndexOf('. '),chunk.lastIndexOf('! '),chunk.lastIndexOf('? '));return sentence>max/2?chunk.slice(0,sentence+1):chunk.slice(0,chunk.lastIndexOf(' '))+'…';}
// Match source CMS slot centres to the guide's frames, preserving image order.
export function presentationFrames(preset){const source=composition(preset),target=templates[preset]||templates[1];const bounds={x:Math.min(...target.map(b=>b.x)),y:Math.min(...target.map(b=>b.y))};bounds.w=Math.max(...target.map(b=>b.x+b.w))-bounds.x;bounds.h=Math.max(...target.map(b=>b.y+b.h))-bounds.y;const unused=new Set(target.map((_,i)=>i));return source.boxes.map(b=>{const x=(b.x+b.w/2)/source.width,y=(b.y+b.h/2)/source.height;let best=-1,distance=Infinity;for(const i of unused){const t=target[i],d=Math.hypot((t.x+t.w/2-bounds.x)/bounds.w-x,(t.y+t.h/2-bounds.y)/bounds.h-y);if(d<distance){best=i;distance=d;}}unused.delete(best);return target[best];});}
export function buildPresentation(project){const slides=[],warnings=[];const title=plain(project.title)||'Untitled project';const cover=project.heroImage||project.coverImage;
slides.push({type:'cover',title,accent:/^#[0-9a-f]{6}$/i.test(project.brandColor||'')?project.brandColor:null,description:shortCopy(project.summary,300),image:cover,discipline:projectDiscipline(project),industry:projectIndustry(project)});
slides.push({type:'identity',title,summary:shortCopy(project.summary,500),fields:[['Client',project.clientName],['Discipline',projectDiscipline(project)],['Industry',projectIndustry(project)],['Role',project.role],['Deliverables',project.deliverables],['Challenge',project.challenge],['Credits',project.credits]].filter(([,v])=>plain(v)).map(([label,value])=>({label,value:shortCopy(value,260)}))});
let pending=[];
const flush=()=>{for(const b of pending)slides.push({type:'story',title:plain(b.title)||'The project',label:plain(b.chapter)||'PROJECT STORY',text:shortCopy(b.text||b.markdown,900)});pending=[];};
for(const source of project.blocks||[]){const block=source.type==='html'&&source.staticImage?{...source,type:'image',image:source.staticImage,alt:source.staticAlt}:source;if(block.hidden||block.visible===false)continue;if(['text','markdown'].includes(block.type)){pending.push(block);continue;}
if(['image','grid','composition'].includes(block.type)){const images=block.type==='image'?[block.image]:(block.images||[]);if(!images.some(Boolean))continue;const text=pending.pop();flush();const preset=Number(block.preset)||1;const frames=block.type==='image'?[{x:880,y:80,w:960,h:960}]:presentationFrames(preset);if(images.length>frames.length)warnings.push(`Section ${block.title||block.id}: extra images will continue on additional slides.`);
for(let offset=0;offset<images.length;offset+=frames.length){slides.push({type:'images',title:plain(text?.title||block.title),label:plain(text?.chapter)||'PROJECT PRESENTATION',text:shortCopy(text?.text||text?.markdown||block.caption),frames,images:images.slice(offset,offset+frames.length),fit:'contain',preset:block.type==='image'?0:preset});}
}else{flush();warnings.push(`Interactive section ${block.title||block.id||block.type} needs a static image to appear in the PDF.`);}}
flush();if(!cover)warnings.push('Add a project cover before downloading.');slides.push({type:'closing',title:'Let’s stay connected.',text:'Follow my design journey.',projectTitle:title,id:project.id});return {slides:slides.map((slide,i)=>({...slide,pageNumber:i+1,totalPages:slides.length})),warnings};}

export const INSTAGRAM_PAGE={width:1080,height:1350};
export function buildInstagramPresentation(project){
 const result=buildPresentation(project),slides=[];
 const narrative=slide=>{const words=plain(slide.text).split(' '),chunks=[];let chunk='';for(const word of words){if(chunk.length+word.length>580){chunks.push(chunk);chunk='';}chunk+=(chunk?' ':'')+word;}if(chunk)chunks.push(chunk);for(const [i,text] of chunks.entries())slides.push({...slide,type:'story',images:undefined,text,title:i?slide.title+' · continued':slide.title});};
 for(const slide of result.slides){
  if(slide.type==='images'){if(slide.text||slide.title)narrative({...slide,text:slide.text||'',title:slide.title||'Project detail'});for(const image of slide.images.filter(Boolean))slides.push({...slide,images:[image],title:'',text:'',label:'',fit:'contain'});}
  else if(slide.type==='story')narrative(slide);
  else slides.push({...slide});
 }
 return {warnings:result.warnings,slides:slides.map((slide,i)=>({...slide,projectTitle:project.title,discipline:slide.discipline||projectDiscipline(project),pageNumber:i+1,totalPages:slides.length}))};
}

export function panoramaCrop(width,height,panel){return {x:panel*width/2,y:0,w:width/2,h:height};}
export function panoramaPlacement(width,height,panel){const scale=Math.min(2160/width,1230/height,1),w=width*scale/2,h=height*scale;return {x:panel===0?1080-w:0,y:(1230-h)/2,w,h};}
