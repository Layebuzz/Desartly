import test from 'node:test';import assert from 'node:assert/strict';import {mediaAction} from '../server/media-service.js';
const base=()=>({revision:3,media:[{id:'a',url:'/api/media/a',name:'Image',folder:'Uploads',variants:[{asset:'original'}]}],draft:{projects:[{id:'test',title:'Test',managed:true}]},published:{}});
test('media copies share immutable bytes and receive independent URLs',()=>{const s=mediaAction(base(),{revision:3,action:'copy',ids:['a'],folder:'Projects/test'});assert.equal(s.media.length,2);assert.notEqual(s.media[1].url,s.media[0].url);assert.equal(s.media[1].variants[0].asset,'original');assert.equal(s.media[1].folder,'Projects/test');});
test('trash is recoverable and deletion cannot break published files',()=>{let s=base();s.published={coverImage:'/api/media/a'};assert.throws(()=>mediaAction(s,{revision:3,action:'trash',ids:['a']}),/used by content/);s=mediaAction(base(),{revision:3,action:'trash',ids:['a']});assert.ok(s.media[0].trashedAt);s=mediaAction(s,{revision:3,action:'restore',ids:['a']});assert.ok(!s.media[0].trashedAt);assert.throws(()=>mediaAction(s,{revision:2,action:'rename',ids:['a'],name:'X'}),/library changed/);});

test('library only permits content-owned destinations and flattens legacy subfolders',()=>{let s=base();s.media[0].folder='Projects/test/Covers';s.mediaFolders=['Uploads','Archive/Unknown'];const next=mediaAction(s,{revision:3,action:'organise'});assert.deepEqual(next.mediaFolders,['Certificates','Projects/test','Site assets']);assert.equal(next.media[0].folder,'Projects/test');assert.throws(()=>mediaAction(next,{revision:3,action:'move',ids:['a'],folder:'Projects/test/Covers'}),/Create the content first/);assert.equal(next.media[0].url,s.media[0].url);});

test('custom upload folders survive organisation and keep nested paths and content references',()=>{
 let s=base();const before=structuredClone(s.published);
 s=mediaAction(s,{revision:3,action:'folder',folder:'Campaign assets'});
 s=mediaAction(s,{revision:3,action:'folder',folder:'Campaign assets/Print'});
 s=mediaAction(s,{revision:3,action:'move',ids:['a'],folder:'Campaign assets/Print'});
 s=mediaAction(s,{revision:3,action:'organise'});
 assert.ok(s.mediaFolders.includes('Campaign assets/Print'));
 assert.equal(s.media[0].folder,'Campaign assets/Print');
 assert.equal(s.media[0].url,'/api/media/a');assert.deepEqual(s.published,before);
 assert.throws(()=>mediaAction(s,{revision:2,action:'folder',folder:'Other'}),/library changed/);
});
test('new folders reject traversal, control characters and invalid paths',()=>{
 for(const folder of ['Campaign/../Secrets','Campaign//Print','Campaign\\Print','Campaign\u0000Print','x'.repeat(161)])assert.throws(()=>mediaAction(base(),{revision:3,action:'folder',folder}),/valid folder path/);
});
