import test from 'node:test';import assert from'node:assert/strict';
import{updateSeo}from'../server/seo-service.js';import{initialState}from'../server/content-store.js';import{metadata}from'../src/cms/metadata.js';
test('metadata publication is isolated from content and other drafts',()=>{
 const s=initialState();s.draft.pages['/about']={title:'Private bio'};const before=structuredClone(s.published);
 const next=updateSeo(s,{path:'/contact',draftVersion:0,publish:true,seo:{title:'Talk with Ali',description:'A project conversation',image:'/api/media/cover'}});
 assert.deepEqual(next.published.projects,before.projects);assert.deepEqual(next.published.pages['/about'],before.pages['/about']);
 assert.deepEqual(metadata(next.published,'/contact'),{title:'Talk with Ali',description:'A project conversation',image:'/api/media/cover',missing:false});assert.equal(next.draftVersion,1);
 assert.throws(()=>updateSeo(next,{path:'/',draftVersion:0,seo:{}}),e=>e.status===409);
});
test('SEO rejects unsafe image URLs, unknown pages and publication of private documents',()=>{
 const s=initialState();for(const image of ['javascript:alert(1)','//evil.test/a','https://name:secret@example.com/a'])assert.throws(()=>updateSeo(s,{path:'/',draftVersion:0,seo:{image}}));
 assert.throws(()=>updateSeo(s,{path:'/studio',draftVersion:0,seo:{}}));
 s.draft.projects.push({id:'private',title:'Private',blocks:[]});assert.throws(()=>updateSeo(s,{path:'/work/private',draftVersion:0,publish:true,seo:{}}));
 const next=updateSeo(s,{path:'/about',draftVersion:0,seo:{title:'Draft'}});assert.deepEqual(next.published,s.published);
});

import{seoInventory,inspectHtml,liveSeoAudit}from'../server/seo-audit.js';
import{pageHead,sitemap,pageStructuredData}from'../server/public-render.js';
import{initialPublicContent}from'../server/public-content.js';
test('SEO inventory uses published documents, isolates draft metadata and exposes defaults',()=>{
 const s=initialState();s.draft.projects.push({id:'draft-only',title:'Draft',blocks:[]});s.draft.pages['/about']={seo:{title:'Unpublished title'}};
 const r=seoInventory(s);assert(!r.rows.some(p=>p.path.includes('draft-only')));const about=r.rows.find(p=>p.path==='/about');assert(about.hasDraft);assert.equal(about.editing.title,'Unpublished title');assert.notEqual(about.live.title,about.editing.title);assert.notEqual(about.defaults.title,about.editing.title);
});
test('live checks detect noindex, wrong canonicals and invalid structured data without executing HTML',()=>{
 const html='<title>Title &amp; name</title><meta name="description" content="A page"><meta name="robots" content="noindex"><link rel="canonical" href="https://evil.test/"><main><h1>Title</h1></main><script type="application/ld+json">invalid</script>';
 const r=inspectHtml(html,new Headers(),200,'https://www.desartly.info/');assert.equal(r.title,'Title & name');assert.equal(r.checks.find(c=>c.name==='Indexing permission').ok,false);assert.equal(r.checks.find(c=>c.name==='Canonical URL').ok,false);assert.equal(r.checks.find(c=>c.name==='Structured data').ok,false);
});
test('audit never fetches arbitrary paths and checks all canonical infrastructure',async()=>{
 const s=initialState();let called=0;const fetcher=async url=>{called++;return new Response(url.endsWith('robots.txt')?'Sitemap: https://www.desartly.info/sitemap.xml':url.endsWith('sitemap.xml')?sitemap(s.published):pageHead('<html><head></head><body><main><h1>Home</h1></main></body></html>',s.published,'/'));};
 await assert.rejects(liveSeoAudit(s,'https://evil.test',fetcher));assert.equal(called,0);const r=await liveSeoAudit(s,'/',fetcher);assert.equal(called,3);assert(r.checks.every(c=>c.ok));assert(r.infrastructure.every(c=>c.ok));
});
test('server HTML includes real about experience and certificate content',()=>{
 const s=initialState().published;s.certificates=[{title:'Verified course',issuer:'Provider',description:'Course details',image:'/api/media/1'}];const about=initialPublicContent(s,'/about');assert(about.includes('Divar'));assert(about.includes('Creative direction'));const cert=initialPublicContent(s,'/certificates');assert(cert.includes('Verified course'));assert(cert.includes('Course details'));
 const profile=JSON.parse(pageStructuredData(s,'/about').match(/>(.*)<\/script>/)[1]);assert.equal(profile['@type'],'ProfilePage');assert.equal(profile.mainEntity.name,'Ali Komeili');
});
