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
