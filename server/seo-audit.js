import {publicOrigin} from './site-domains.js';
import {metadata} from '../src/cms/metadata.js';
import {publicSite} from '../src/cms/schema.js';
import {sitemap} from './public-render.js';
const core=[['/','Home'],['/work','Projects'],['/journal','Journal'],['/about','About'],['/services','Services'],['/certificates','Certificates'],['/contact','Booking'],['/privacy','Privacy']];
export function seoInventory(state){
 const published=publicSite(state.published),draft=state.draft;
 const pages=[...core.map(([path,name])=>({path,name,kind:'Page'})),...published.projects.map(d=>({path:'/work/'+encodeURIComponent(d.id),name:d.title,kind:'Project'})),...published.blogPosts.map(d=>({path:'/journal/'+encodeURIComponent(d.id),name:d.title,kind:'Article'}))];
 const rows=pages.map(p=>{const live=metadata(published,p.path),editing=metadata(draft,p.path),issues=[];
  if(!live.title?.trim())issues.push('Missing search title');if(!live.description?.trim())issues.push('Missing description');
  if(live.title.length>65)issues.push('Review title length');if(live.description.length>170)issues.push('Review description length');
  const defaults=metadata({...draft,pages:{...draft.pages,[p.path]:{...draft.pages?.[p.path],seo:{}}}},p.path);
  return {...p,url:publicOrigin+p.path,live,editing,defaults,issues,hasDraft:JSON.stringify(live)!==JSON.stringify(editing),custom:Boolean(published.pages?.[p.path]?.seo?.title)};
 });
 for(const row of rows){if(rows.some(p=>p.path!==row.path&&p.live.title===row.live.title))row.issues.push('Duplicate search title');}
 return {origin:publicOrigin,publishedAt:state.publishedAt,rows,sitemapCount:(sitemap(published).match(/<loc>/g)||[]).length};
}
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function attributes(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),decode(m[2])]));}
export function inspectHtml(html,headers,status,url){
 const tags=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0]));
 const meta=name=>tags.find(t=>t.name?.toLowerCase()===name||t.property?.toLowerCase()===name)?.content||'';
 const canonical=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attributes(m[0])).find(t=>t.rel==='canonical')?.href||'';
 const title=decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const robots=[meta('robots'),headers.get('x-robots-tag')||''].filter(Boolean).join(', ');
 const checks=[{name:'HTTP response',ok:status===200,detail:String(status)},{name:'Indexing permission',ok:!/noindex|none/i.test(robots),detail:robots||'No noindex directive'},{name:'Canonical URL',ok:canonical===url,detail:canonical||'Missing canonical'},{name:'Search title',ok:Boolean(title),detail:title||'Missing title'},{name:'Description',ok:Boolean(meta('description')),detail:meta('description')||'Missing description'},{name:'Initial page content',ok:/<main\b/i.test(html)&&/<h1\b/i.test(html),detail:'Checks server-delivered HTML; does not execute JavaScript.'}];
 let structured=[];for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const data=JSON.parse(m[1]);structured.push(...(data['@graph']||[data]).map(d=>d['@type']).flat().filter(Boolean));}catch{checks.push({name:'Structured data',ok:false,detail:'Invalid JSON-LD'});}}
 return {url,status,title,description:meta('description'),canonical,robots,image:meta('og:image'),structured,checks};
}
export async function liveSeoAudit(state,path,fetcher=fetch){
 const inventory=seoInventory(state);if(!inventory.rows.some(r=>r.path===path))throw Object.assign(Error('Choose a published page.'),{status:400});
 async function read(path){try{const response=await fetcher(publicOrigin+path,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html,application/xml,text/plain'}});const body=await response.text();return {response,body:body.slice(0,2000000)};}catch{return {error:'Live request failed or timed out. Retry the check.'};}}
 const [page,robots,map]=await Promise.all([read(path),read('/robots.txt'),read('/sitemap.xml')]);
 const result=page.error?{url:publicOrigin+path,error:page.error,checks:[]}:inspectHtml(page.body,page.response.headers,page.response.status,publicOrigin+path);
 const infrastructure=[{name:'Robots file',ok:!robots.error&&robots.response.status===200,detail:robots.error||'HTTP '+robots.response.status},{name:'Sitemap discovery',ok:!robots.error&&robots.body.includes(publicOrigin+'/sitemap.xml'),detail:'Canonical sitemap advertised in robots.txt'},{name:'XML sitemap',ok:!map.error&&map.response.status===200&&map.body.includes('<urlset'),detail:map.error||`${(map.body.match(/<loc>/g)||[]).length} URLs in live sitemap`},{name:'Page in sitemap',ok:!map.error&&map.body.includes('<loc>'+publicOrigin+path+'</loc>'),detail:publicOrigin+path}];
 return {...result,infrastructure,checkedAt:new Date().toISOString(),scope:'Live technical check. Google indexing and rankings require Search Console.'};
}
