import{validateSite}from'../src/cms/schema.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function updateNavigation(state,body){
 if(body.draftVersion!==(state.draftVersion||0))fail('Navigation changed. Reload before saving.',409);
 if(!Array.isArray(body.nav)||body.nav.length>20)fail('Use at most 20 navigation links.');
 const nav=body.nav.map(item=>{const to=String(item.to||item.url||'');if(!/^(\/[^/\\]|\/$|https:\/\/)/.test(to)||/[\x00-\x20]/.test(to))fail('Use a site path or HTTPS link.');return{id:String(item.id||crypto.randomUUID()),label:String(item.label||'Link').slice(0,60),to,visible:item.visible!==false};});
 for(const path of ['/work','/contact'])if(!nav.some(item=>item.to===path&&item.visible))fail('Keep visible Projects (/work) and Contact (/contact) links in the navigation.');
 const next=structuredClone(state);next.draft.nav=nav;if(body.publish){next.published.nav=structuredClone(nav);next.publishedAt=new Date().toISOString();}next.draftVersion=(state.draftVersion||0)+1;validateSite(next.draft);return next;
}
export function updateSettings(state,body){
 if(body.draftVersion!==(state.draftVersion||0))fail('Settings changed. Reload before saving.',409);
 const next=structuredClone(state),current=next.draft.pages?.['/site']?.settings||{};
 const settings={...current,title:String(body.settings?.title||'Desartly').slice(0,120),description:String(body.settings?.description||'').slice(0,400),favicon:typeof body.settings?.favicon==='string'&&/^(data:image\/(png|webp|x-icon|vnd.microsoft.icon);base64,|\/[^/])/.test(body.settings.favicon)?body.settings.favicon.slice(0,360000):''};
 const apply=site=>{site.pages||={};site.pages['/site']={...site.pages['/site'],settings};site.settings={...site.settings,siteTitle:settings.title,description:settings.description};};
 apply(next.draft);if(body.publish){apply(next.published);next.publishedAt=new Date().toISOString();}next.draftVersion=(state.draftVersion||0)+1;return next;
}
