import test from 'node:test';import assert from 'node:assert/strict';
import {metadata,pageHead,sitemap} from '../api/public.js';
const site={projects:[{id:'test',title:'A < B',summary:'One & two',coverImage:'/api/media/x'},{id:'secret',hidden:true}],blogPosts:[],pages:{}};
test('public metadata escapes author text and excludes private documents',()=>{const html=pageHead('<head><title>Old</title><meta name="description" content="old"/></head>',site,'/work/test');assert.match(html,/A &lt; B/);assert.match(html,/One &amp; two/);assert.doesNotMatch(html,/<title>Old/);assert.equal(metadata(site,'/work/secret').missing,true);assert.equal(metadata(site,'/work/missing').missing,true);assert.doesNotMatch(sitemap(site),/secret/);assert.match(sitemap(site),/work\/test/);});
