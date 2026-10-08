import {buildPresentation,buildInstagramPresentation} from './cms/presentation-model.js';
import {createPresentationPdf} from './cms/presentation-renderer.js';
async function run(){try{
 const response=await fetch('/api/internal/presentation');if(!response.ok)throw Error('Private render request expired.');
 const {project,format}=await response.json();const {slides}=format==='instagram'?buildInstagramPresentation(project):buildPresentation(project);
 const pdf=await createPresentationPdf(slides,project.title,(i,n)=>{document.querySelector('#render-status').textContent=`Page ${i} of ${n}`;},format,{compact:true});
 window.desartlyRenderResult={base64:pdf.output('datauristring').split(',')[1]};document.querySelector('#render-status').textContent='Ready';
 }catch(error){window.desartlyRenderResult={error:error.message};document.querySelector('#render-status').textContent='Failed';}}
run();
