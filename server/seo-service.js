const staticPaths=['/','/work','/journal','/about','/services','/privacy','/contact','/certificates'];
export function seoPaths(site){return [...staticPaths,...(site.projects||[]).map(p=>'/work/'+p.id),...(site.blogPosts||[]).map(p=>'/journal/'+p.id)];}
export function updateSeo(state,body){
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 if(body.draftVersion!==(state.draftVersion||0))fail('Metadata changed. Reload before saving.',409);
 if(!seoPaths(state.draft).includes(body.path))fail('Choose an existing page.');
 if(!body.seo||typeof body.seo!=='object'||Array.isArray(body.seo))fail('Metadata is required.');
 const seo={};for(const [key,max]of [['title',200],['description',500],['image',2000]]){
  const value=body.seo[key]??'';if(typeof value!=='string'||value.length>max)fail('Invalid '+key+'.');seo[key]=value.trim();
 }
 if(seo.image&&!/^\/(?![\/\\])[^\s]*$|^https:\/\/[^\s]+$/.test(seo.image))fail('Use a site image path or HTTPS URL.');
 if(seo.image&&seo.image.startsWith('https:')){const url=new URL(seo.image);if(url.username||url.password)fail('Image URLs cannot contain credentials.');}
 if(body.publish&&!seoPaths(state.published).includes(body.path))fail('Publish the content before its metadata.');
 const next=structuredClone(state);
 const apply=site=>{site.pages||={};site.pages[body.path]={...site.pages[body.path],seo};};
 apply(next.draft);if(body.publish){apply(next.published);next.publishedAt=new Date().toISOString();}
 next.draftVersion=(state.draftVersion||0)+1;return next;
}
