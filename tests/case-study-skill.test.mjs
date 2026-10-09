import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {createClient,resolveFolder,inventory,preflight} from '../skills/desartly-case-study/scripts/cms.mjs';
import {skillFiles} from '../scripts/package-case-study-skill.mjs';
import {contentSchema} from '../server/cms-api.js';
import {personalities} from '../src/cms/growth-model.js';
import {workerPageResponse} from '../server/worker-pages.js';

test('skill inventory resolves only a unique library folder and reuses its URLs including descendants',async()=>{
 const folders=['Projects/farm','Archive/farm','Projects/other'];
 assert.equal(resolveFolder('Projects/farm',folders),'Projects/farm');
 assert.throws(()=>resolveFolder('farm',folders),/Ambiguous/);
 assert.throws(()=>resolveFolder('missing',folders),/not found/);
 assert.throws(()=>resolveFolder('Projects',['Projects']),/specific project/);
 const calls=[];
 const result=await inventory(async name=>{calls.push(name);return name==='cms_media_architecture'?{allowedFolders:folders}:name==='cms_media_list'?[{id:'1',folder:'Projects/farm',url:'/api/media/1',name:'cover'},{id:'2',folder:'Projects/farm/details',url:'/api/media/2'},{id:'3',folder:'Projects/other',url:'/api/media/3'}]:[{id:'farm',title:'Farm',status:'Published'},{id:'other',title:'Other'}];},'Projects/farm');
 assert.deepEqual(result.assets.map(a=>a.url),['/api/media/1','/api/media/2']);assert.equal(result.projectCandidates.length,1);assert.equal(calls.length,3);
});
test('helper defaults to read-only, has explicit publish mode, no redirect credential forwarding and no automatic retry',async()=>{
 let requests=0;
 const client=createClient({token:'fixture-private-token',fetchImpl:async(url,options)=>{requests++;assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer fixture-private-token');return Response.json({result:{content:[{type:'text',text:'{"version":4}'}]}});}});
 await assert.rejects(client('cms_save',{}),/not permitted/);await assert.rejects(client('cms_publish',{},'write'),/not permitted/);assert.equal(requests,0);
 assert.equal((await client('cms_get',{id:'farm'})).version,4);await client('cms_save',{},'write');await client('cms_publish',{},'publish');assert.equal(requests,3);
 const failed=createClient({token:'fixture-private-token',fetchImpl:async()=>{requests++;return new Response('',{status:503});}});await assert.rejects(failed('cms_get'),/503/);assert.equal(requests,4);
 const leaked=createClient({token:'fixture-private-token',fetchImpl:async()=>Response.json({result:{isError:true,content:[{type:'text',text:'fixture-private-token'}]}})});await assert.rejects(leaked('cms_get'),e=>!e.message.includes('fixture-private-token'));
 assert.throws(()=>createClient({endpoint:'http://example.com/mcp',token:'x'}),/HTTPS/);
});
test('local preflight rejects empty story sections and invented taxonomy but identifies manual HTML checks',()=>{
 const schema={...contentSchema,brandPersonalities:personalities};
 const doc={id:'farm',title:'Farm',industry:'Agriculture',brandPersonality:'competence',discipline:'Product',coverImage:'/api/media/1',summary:'A farm interface.',announcement:{fa:'روایت فارسی پروژه',en:'The project design story.',hashtags:'#ProductDesign'},references:[{url:'https://example.com/project',checkedAt:'2026-10-09',takeaway:'Layout observation'}],blocks:[{id:'context',type:'text',text:'Visible work and its context.'},{id:'live',type:'html',html:'<!doctype html><p>Live interface</p>'}]};
 for(const key of ['fa','en','hashtags']){const missing=preflight({...doc,announcement:{...doc.announcement,[key]:' '}},schema);assert.equal(missing.ok,false);assert.ok(missing.errors.includes('Missing social caption field: announcement.'+key));}
 assert.equal(preflight({...doc,announcement:undefined},schema,{requireCaptions:false}).ok,true);
 const valid=preflight(doc,schema);assert.equal(valid.ok,true);assert.match(valid.warnings[0],/390\/768\/1440/);
 const invalid=preflight({...doc,industry:'Agriculture & Farm Management',blocks:[{id:'blank',type:'text',text:''},{id:'blank',type:'grid',images:[]}]},schema);assert.equal(invalid.ok,false);assert.ok(invalid.errors.some(e=>e.includes('industry')));assert.ok(invalid.errors.some(e=>e.includes('Empty text')));assert.ok(invalid.errors.some(e=>e.includes('duplicate')));assert.ok(invalid.errors.some(e=>e.includes('Empty grid')));
});
test('download archive contains the complete current portable skill and no private working files',async()=>{
 const data=await readFile(new URL('../public/downloads/desartly-case-study.zip',import.meta.url));const archive=unzipSync(data);assert.equal(Object.keys(archive).length,skillFiles.length);assert.ok(data.length<30000);
 for(const file of skillFiles){const actual=strFromU8(archive['desartly-case-study/'+file]);assert.equal(actual,await readFile(new URL('../skills/desartly-case-study/'+file,import.meta.url),'utf8'));}
});
test('Studio serves the ZIP as an asset instead of redirecting it or returning the application shell',async()=>{
 const zip=await readFile(new URL('../public/downloads/desartly-case-study.zip',import.meta.url));
 const response=await workerPageResponse(new Request('https://studio.desartly.info/downloads/desartly-case-study.zip?v=1.0.0'),{ASSETS:{fetch:async request=>{assert.equal(new URL(request.url).pathname,'/downloads/desartly-case-study.zip');return new Response(zip,{headers:{'Content-Type':'application/zip'}});}}},null);
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/zip');assert.equal((await response.arrayBuffer()).byteLength,zip.length);
});

test('existing owner session fallback stays on Studio, redacts credentials and yields to bearer configuration',async()=>{
 const cookie='pol_owner=fixture-owner-session';
 const client=createClient({cookie,fetchImpl:async(url,options)=>{assert.equal(url.origin,'https://studio.desartly.info');assert.equal(options.headers.Cookie,cookie);assert.equal(options.headers.Authorization,undefined);return Response.json({result:{structuredContent:{ok:true}}});}});
 assert.deepEqual(await client('cms_schema'),{ok:true});
 assert.throws(()=>createClient({cookie,endpoint:'https://other.example/mcp'}),/exact Studio/);
 for(const invalid of ['pol_owner=a; other=b','pol_owner=a\r\nX: bad','other=secret'])assert.throws(()=>createClient({cookie:invalid}),/scoped/);
 assert.throws(()=>createClient(),/Check connected CMS tools/);
 const bearer=createClient({token:'fixture-token',cookie,fetchImpl:async(url,options)=>{assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Authorization,'Bearer fixture-token');return Response.json({result:{structuredContent:{ok:true}}});}});await bearer('cms_schema');
 const failed=createClient({cookie,fetchImpl:async()=>Response.json({result:{isError:true,content:[{type:'text',text:'fixture-owner-session '+cookie}]}})});await assert.rejects(failed('cms_schema'),e=>!e.message.includes('fixture-owner-session'));
});

test('article download contains the complete current research-led bilingual skill',async()=>{
 const data=await readFile(new URL('../public/downloads/desartly-article.zip',import.meta.url));const archive=unzipSync(data);const files=['SKILL.md','agents/openai.yaml','references/editorial.md','references/seo.md','references/cms.md','references/research-quality.md'];assert.equal(Object.keys(archive).length,files.length);
 for(const file of files)assert.equal(strFromU8(archive['desartly-article/'+file]),await readFile(new URL('../skills/desartly-article/'+file,import.meta.url),'utf8'));
});
