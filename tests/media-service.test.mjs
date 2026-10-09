import {cmsView} from '../server/cms-service.js';
import test from 'node:test';import assert from 'node:assert/strict';import {mediaAction} from '../server/media-service.js';
const base=()=>({revision:3,media:[{id:'a',url:'/api/media/a',name:'Image',folder:'Uploads',variants:[{asset:'original'}]}],draft:{projects:[{id:'test',title:'Test',managed:true}]},published:{}});
test('media copies share immutable bytes and receive independent URLs',()=>{const s=mediaAction(base(),{revision:3,action:'copy',ids:['a'],folder:'Projects/test'});assert.equal(s.media.length,2);assert.notEqual(s.media[1].url,s.media[0].url);assert.equal(s.media[1].variants[0].asset,'original');assert.equal(s.media[1].folder,'Projects/test');});
test('trash is recoverable and deletion cannot break published files',()=>{let s=base();s.published={coverImage:'/api/media/a'};assert.throws(()=>mediaAction(s,{revision:3,action:'trash',ids:['a']}),/used by content/);s=mediaAction(base(),{revision:3,action:'trash',ids:['a']});assert.ok(s.media[0].trashedAt);s=mediaAction(s,{revision:3,action:'restore',ids:['a']});assert.ok(!s.media[0].trashedAt);assert.throws(()=>mediaAction(s,{revision:2,action:'rename',ids:['a'],name:'X'}),/library changed/);});

test('library only permits content-owned destinations and flattens legacy subfolders',()=>{let s=base();s.media[0].folder='Projects/test/Covers';s.mediaFolders=['Uploads','Archive/Unknown'];const next=mediaAction(s,{revision:3,action:'organise'});assert.deepEqual(next.mediaFolders,['Certificates','Journal','Projects','Projects/test','Site assets']);assert.equal(next.media[0].folder,'Projects/test');assert.throws(()=>mediaAction(next,{revision:3,action:'move',ids:['a'],folder:'Projects/test/Covers'}),/Create the content first/);assert.equal(next.media[0].url,s.media[0].url);});

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

test('moving folders preserves nested media URLs, bytes and published references',()=>{
 let s=base();s=mediaAction(s,{revision:3,action:'folder',folder:'Campaign/Print'});s.media[0].folder='Campaign/Print';s.published={coverImage:'/api/media/a'};
 const next=mediaAction(s,{revision:3,action:'move-folder',source:'Campaign/Print',folder:'Site assets/Print'});
 assert.equal(next.media[0].folder,'Site assets/Print');assert.equal(next.media[0].url,s.media[0].url);assert.deepEqual(next.media[0].variants,s.media[0].variants);assert.deepEqual(next.published,s.published);assert.ok(next.customMediaFolders.includes('Site assets/Print'));
});
test('moving a content-owned folder persists its location without recreating the old folder',()=>{
 let s=mediaAction(base(),{revision:3,action:'move-folder',source:'Projects/test',folder:'Site assets/test'});
 s=mediaAction(s,{revision:3,action:'organise'});assert.ok(s.mediaFolders.includes('Site assets/test'));assert.ok(!s.mediaFolders.includes('Projects/test'));
});
test('folder copies reuse bytes and reject cycles, collisions and stale revisions',()=>{
 let s=base();s=mediaAction(s,{revision:3,action:'folder',folder:'Campaign'});s=mediaAction(s,{revision:3,action:'folder',folder:'Campaign/Print'});s.media[0].folder='Campaign/Print';
 const copy=mediaAction(s,{revision:3,action:'copy-folder',source:'Campaign',folder:'Site assets/Campaign'});assert.equal(copy.media.length,2);assert.notEqual(copy.media[1].id,s.media[0].id);assert.equal(copy.media[1].variants[0].asset,s.media[0].variants[0].asset);assert.equal(copy.media[1].folder,'Site assets/Campaign/Print');
 assert.throws(()=>mediaAction(s,{revision:3,action:'move-folder',source:'Campaign',folder:'Campaign/Child'}),/inside itself/);assert.throws(()=>mediaAction(s,{revision:3,action:'move-folder',source:'Campaign',folder:'Site assets'}),/already exists/);assert.throws(()=>mediaAction(s,{revision:2,action:'copy-folder',source:'Campaign',folder:'Copy'}),/library changed/);
});

test('main Projects and Journal folders accept moves without changing published references',()=>{for(const folder of ['Projects','Journal']){const state=base();state.published={coverImage:'/api/media/a'};const moved=mediaAction(state,{revision:3,action:'move',ids:['a'],folder});assert.equal(moved.media[0].folder,folder);assert.equal(mediaAction(moved,{revision:3,action:'organise'}).media[0].folder,folder);assert.deepEqual(moved.published,state.published);}});

test('folder colors move with folders; trash and restore preserve exact paths and protect references',()=>{let s=base();s.customMediaFolders=['Campaign','Campaign/Print'];s.media[0].folder='Campaign/Print';s=mediaAction(s,{revision:3,action:'folder-color',folder:'Campaign',color:'#228844'});s=mediaAction(s,{revision:3,action:'move-folder',source:'Campaign',folder:'Archive/Campaign'});assert.equal(s.mediaFolderColors['Archive/Campaign'],'#228844');assert.equal(s.mediaFolderColors.Campaign,undefined);const trashed=mediaAction(s,{revision:3,action:'trash-folder',source:'Archive/Campaign'});assert.ok(trashed.media[0].trashedAt);assert.equal(trashed.media[0].folder,'Archive/Campaign/Print');assert(!trashed.mediaFolders.includes('Archive/Campaign'));const restored=mediaAction(trashed,{revision:3,action:'restore-folder',source:'Archive/Campaign'});assert(!restored.media[0].trashedAt);assert.equal(restored.media[0].folder,'Archive/Campaign/Print');s.published={coverImage:'/api/media/a'};assert.throws(()=>mediaAction(s,{revision:3,action:'trash-folder',source:'Archive/Campaign'}),/used by content/);assert.throws(()=>mediaAction(s,{revision:3,action:'trash-folder',source:'Projects/test'}),/protected/);});

test('CMS workspace exposes persisted folder colors and recovery records',()=>{const state={...base(),mediaFolderColors:{Campaign:'#228844'},mediaFolderLocations:{'Projects/test':'Campaign'},trashedMediaFolders:[{path:'Old',ids:[],paths:['Old']}]};const view=cmsView(state);assert.deepEqual(view.mediaFolderColors,state.mediaFolderColors);assert.deepEqual(view.trashedMediaFolders,state.trashedMediaFolders);assert.deepEqual(view.mediaFolderLocations,state.mediaFolderLocations);});

test('batch rename preserves extensions and undo restores exact file metadata',()=>{const s=base();s.media[0].name='old.webp';const renamed=mediaAction(s,{revision:3,action:'bulk-rename',ids:['a'],pattern:'farm-{n}',digits:3});assert.equal(renamed.media[0].name,'farm-001.webp');const undone=mediaAction(renamed,{revision:3,action:'undo'});assert.deepEqual(undone.media[0],s.media[0]);assert.throws(()=>mediaAction(s,{revision:3,action:'bulk-rename',ids:['a'],pattern:'x',digits:100000}),/digits/);});
test('undo refuses to overwrite a later conflicting file edit',()=>{const s=base();const next=mediaAction(s,{revision:3,action:'file-meta',ids:['a'],metadata:{tags:['farm'],note:'Notes',favorite:true}});assert.deepEqual(next.media[0].tags,['farm']);next.media[0].name='Changed elsewhere';assert.throws(()=>mediaAction(next,{revision:3,action:'undo'}),/changed|undo/i);});
