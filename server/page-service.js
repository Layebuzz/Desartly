import {validateSite} from '../src/cms/schema.js';
const paths=['/','/work','/journal','/about','/services','/privacy','/contact','/certificates'];
export function updatePage(state,body){
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 if(!paths.includes(body.path))fail('Choose a supported page.');
 if(body.draftVersion!==(state.draftVersion||0))fail('A newer draft exists. Reload before saving.',409);
 if(!body.page||typeof body.page!=='object'||Array.isArray(body.page))fail('Page content is required.');
 const next=structuredClone(state);
 const apply=site=>{
  site.pages||={};site.pages[body.path]=structuredClone(body.page);
  if(body.path==='/')for(const key of ['homeSections','stats','clients'])if(Array.isArray(body[key]))site[key]=structuredClone(body[key]);
  if(body.path==='/certificates'&&Array.isArray(body.certificates))site.certificates=structuredClone(body.certificates);
  validateSite(site);
 };
 apply(next.draft);
 if(body.publish){apply(next.published);next.publishedAt=new Date().toISOString();}
 next.draftVersion=(state.draftVersion||0)+1;
 return next;
}
