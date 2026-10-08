import {buildPresentation} from './presentation-model.js';
export function portfolioDefaults(projects=[]){return {title:'Selected work.',name:'Ali Komeili',role:'Independent multidisciplinary designer',subtitle:'Product · Branding · Communication Design',email:'Komeili@desartly.info',website:'https://www.desartly.info',booking:'https://book.desartly.info',closingTitle:'Let’s make something meaningful.',closingText:'A good project starts with a conversation.',includeExperience:true,includeContents:true,aboutIntro:'',aboutBody:'',projectIds:projects.filter(p=>!p.archived).map(p=>p.id)};}
export function orderedPortfolioProjects(projects,config){const map=new Map(projects.filter(p=>!p.archived).map(p=>[p.id,p]));return [...new Set(config.projectIds||[])].map(id=>map.get(id)).filter(Boolean);}
export function movePortfolioProject(ids,from,to){if(from===to||!ids.includes(from)||!ids.includes(to))return ids;const next=[...ids],start=next.indexOf(from);next.splice(start,1);next.splice(ids.indexOf(to),0,from);return next;}
function chunks(value,max=1100){const words=String(value||'').trim().split(/\s+/),out=[];let text='';for(const word of words){if(text&&text.length+word.length+1>max){out.push(text);text='';}text+=(text?' ':'')+word;}if(text)out.push(text);return out;}
export function buildPortfolio(projects,config,about={}){
 const chosen=orderedPortfolioProjects(projects,config),warnings=[],slides=[];const contact={name:config.name,role:config.role,email:config.email,website:config.website,booking:config.booking};
 slides.push({type:'portfolio-cover',title:config.title,name:config.name,role:config.role,subtitle:config.subtitle,projectCount:chosen.length});
 const intro=config.aboutIntro||about.intro||'',body=config.aboutBody||about.body||'';
 const paragraphs=chunks(body,800),introductions=chunks(intro,700);slides.push({type:'portfolio-about',title:about.title||'A practice across disciplines.',intro:introductions[0]||'',text:paragraphs[0]||'',label:'ABOUT / THE PRACTICE'});
 for(const text of introductions.slice(1))slides.push({type:'portfolio-about',title:'A practice across disciplines.',intro:'',text,label:'ABOUT / CONTINUED'});
 for(const [i,text]of paragraphs.slice(1).entries())slides.push({type:'portfolio-about',title:'How I work.',intro:'',text,label:'ABOUT / CONTINUED '+(i+1)});
 if(config.includeExperience){const experience=about.resumeProfile?.experience||[];for(let i=0;i<experience.length;i+=3)slides.push({type:'portfolio-experience',title:about.experienceTitle||'Experience & creative leadership',items:experience.slice(i,i+3),label:'ABOUT / EXPERIENCE'});const skills=about.resumeProfile?.skills||[];if(skills.length)slides.push({type:'portfolio-skills',title:about.expertiseTitle||'Skills, craft & tools',items:skills.slice(0,6),label:'ABOUT / EXPERTISE'});}
 slides.push({type:'portfolio-contact',title:'A conversation starts here.',text:about.availability||'Get in touch to discuss a project or a mentorship session.',...contact,label:'CONTACT / ALI KOMEILI'});
 const contents=[];if(config.includeContents)for(let i=0;i<chosen.length;i+=10){const page={type:'portfolio-contents',title:'Inside this portfolio.',entries:[],label:'SELECTED WORK / CONTENTS'};slides.push(page);contents.push(page);}
 const chapters=[];
 for(const [index,project]of chosen.entries()){const result=buildPresentation(project);const startPage=slides.length+1;chapters.push({id:project.id,title:project.title,startPage,number:index+1});for(const warning of result.warnings)warnings.push(project.title+': '+warning);for(const slide of result.slides.filter(s=>s.type!=='closing'))slides.push({...slide,projectId:project.id,projectTitle:project.title,chapterNumber:index+1});}
 for(const [i,page]of contents.entries())page.entries=chapters.slice(i*10,i*10+10);
 slides.push({type:'portfolio-contact',title:config.closingTitle,text:config.closingText,...contact,label:'THANK YOU / LET’S STAY CONNECTED',closing:true});
 if(!intro.trim())warnings.push('Add an About introduction in Pages & navigation or the portfolio overrides.');if(!chosen.length)warnings.push('Select at least one project to export your portfolio.');
 return {slides:slides.map((s,i)=>({...s,pageNumber:i+1,totalPages:slides.length})),chapters,warnings,projectCount:chosen.length};
}
export function portfolioContentKey(projects,config,about){const value=JSON.stringify([projects,config,about]);let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
export function validatePortfolioConfig(config){
 if(!config||typeof config!=='object'||Array.isArray(config))throw Error('Portfolio settings must be an object.');
 const out={};for(const [key,max]of Object.entries({title:120,name:100,role:200,subtitle:300,email:254,website:500,booking:500,closingTitle:160,closingText:500,aboutIntro:2000,aboutBody:16000})){if(typeof config[key]!=='string'||config[key].length>max)throw Error('Check the '+key+' field.');out[key]=config[key].trim();}
 if(!out.name||!out.title)throw Error('Add your name and a portfolio title.');if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(out.email))throw Error('Use a valid contact email.');for(const key of ['website','booking']){try{if(new URL(out[key]).protocol!=='https:')throw Error();}catch{throw Error('Use an HTTPS '+key+' link.');}}
 for(const key of ['includeExperience','includeContents']){if(typeof config[key]!=='boolean')throw Error('Invalid portfolio option.');out[key]=config[key];}
 if(!Array.isArray(config.projectIds)||config.projectIds.length>500||config.projectIds.some(id=>typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,119}$/.test(id))||new Set(config.projectIds).size!==config.projectIds.length)throw Error('Project order must contain unique project IDs.');out.projectIds=[...config.projectIds];return out;
}
