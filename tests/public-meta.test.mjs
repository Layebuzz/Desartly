import test from 'node:test';import assert from 'node:assert/strict';
import {metadata,pageHead,sitemap} from '../api/public.js';
const site={projects:[{id:'test',title:'A < B',summary:'One & two',coverImage:'/api/media/x'},{id:'secret',hidden:true}],blogPosts:[],pages:{}};
test('public metadata escapes author text and excludes private documents',()=>{const html=pageHead('<head><title>Old</title><meta name="description" content="old"/></head>',site,'/work/test');assert.match(html,/A &lt; B/);assert.match(html,/One &amp; two/);assert.doesNotMatch(html,/<title>Old/);assert.equal(metadata(site,'/work/secret').missing,true);assert.equal(metadata(site,'/work/missing').missing,true);assert.doesNotMatch(sitemap(site),/secret/);assert.match(sitemap(site),/work\/test/);});
import {pageBody,knownPublicPath}from'../server/public-content.js';
test('initial public HTML includes safe page content and crawlable links; unknown paths are missing',()=>{
 const rendered=pageBody('<div id="root"></div>',site,'/work/test');assert.match(rendered,/<h1>A &lt; B<\/h1>/);assert.match(rendered,/One &amp; two/);assert.match(rendered,/href="\/work"/);
 assert.equal(knownPublicPath(site,'/unavailable'),false);assert.equal(knownPublicPath(site,'/work/secret'),false);assert.equal(knownPublicPath(site,'/work/test/extra'),false);assert.equal(knownPublicPath(site,'/work/test'),true);
 const home=pageBody('<div id="root"></div>',site,'/');assert.match(home,/href="\/work\/test"/);assert.doesNotMatch(home,/work\/secret/);
 assert.notEqual(metadata(site,'/work').description,metadata(site,'/contact').description);
});
import{articleStructuredData}from'../api/public.js';
test('article JSON-LD uses actual published fields and escapes script terminators',()=>{
 const s={blogPosts:[{id:'story',title:'A </script> title',author:'Ali',date:'2026-10-07',excerpt:'An actual case study'}]};
 const html=articleStructuredData(s,'/journal/story');assert.equal((html.match(/<\/script>/g)||[]).length,1);const data=JSON.parse(html.replace(/^<script[^>]+>/,'').replace(/<\/script>$/,''));assert.equal(data.headline,s.blogPosts[0].title);assert.equal(data.author.name,'Ali');assert.equal(articleStructuredData(s,'/about'),'');s.blogPosts[0].hidden=true;assert.equal(articleStructuredData(s,'/journal/story'),'');
});
