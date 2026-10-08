import {disciplines} from '../project-tags.js';
const text=(id,title)=>({id,type:'text',title,text:'',layout:'chapter'});
const image=(id,imageRole)=>({id,type:'image',image:'',alt:'',imageRole,fit:'contain'});
export const projectWorkflows=[
 {discipline:'Product',description:'Responsive interfaces, user flows and interactive prototypes.',sections:['Context and challenge','Product overview','Key design decisions','Interactive prototype','Responsive screens','Outcome and reflection']},
 {discipline:'Branding',description:'Identity systems, packaging and brand applications.',sections:['Brand context and audience','Identity reveal','The central idea','System and details','Applications in context','Outcome and reflection']},
 {discipline:'Communication Design',description:'Campaign ideas, key visuals and channel executions.',sections:['Audience and challenge','Hero execution','The campaign idea','Channel variations','Motion or interaction','Outcome and reflection']}
];
export function projectTemplate(discipline){
 if(!disciplines.includes(discipline))throw Error('Choose Product, Branding or Communication Design.');
 const workflow=projectWorkflows.find(w=>w.discipline===discipline);
 const blocks=discipline==='Product'?
 [text('context',workflow.sections[0]),{id:'overview',type:'html',title:'Live product overview',html:'',autoHeight:true},text('decisions',workflow.sections[2]),{id:'prototype',type:'html',title:'Interactive prototype',html:'',autoHeight:true,previewHeight:900,staticImage:''},{id:'responsive',type:'html',title:'Responsive interface',html:'',autoHeight:true,previewWidth:390},text('outcome',workflow.sections[5])]:discipline==='Branding'?
 [text('context',workflow.sections[0]),image('reveal','Identity reveal'),text('idea',workflow.sections[2]),image('system','Identity system'),{id:'applications',type:'grid',preset:1,images:[],alts:[],imageRoles:['Brand application','Packaging or detail']},text('outcome',workflow.sections[5])]:
 [text('context',workflow.sections[0]),image('hero','Campaign key visual'),text('idea',workflow.sections[2]),{id:'channels',type:'grid',preset:1,images:[],alts:[],imageRoles:['Channel execution','Channel variation']},image('detail','Motion storyboard or interaction snapshot'),text('outcome',workflow.sections[5])];
 return {discipline,category:discipline,blocks,workflow,steps:['Set title, industry, primary personality and verified credits.','Save a private draft to create Projects/<slug>.','Upload named images to that folder. Keep each image independently editable.','Complete native story blocks; render interface overviews and details as live HTML components. Use componentSelector to isolate details, previewWidth for mobile. Screenshots are PDF fallbacks only; artwork remains an image.','Review, preview at 390 / 768 / 1440 px, then publish this document.'],api:['cms_schema','cms_project_template','cms_create','cms_upload','cms_get','cms_save','cms_review','cms_publish'],html:{maxDocumentBytes:600000,selfContained:true,autoHeight:true,snapshot:'staticImage',privacy:'Sandbox without same-origin access. No remote scripts.'}};
}
