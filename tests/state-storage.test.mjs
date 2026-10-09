import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
import {D1Store,initialState} from '../server/content-store.js';
import {encodeStoredState,decodeStoredState,stateStorageLimit} from '../server/state-storage.js';
import {contentResponse} from '../server/content-api.js';
import {authResponse} from '../server/owner-auth.js';

function fixture(state){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE portfolio_state(id INTEGER PRIMARY KEY,revision INTEGER,value TEXT)');db.prepare('INSERT INTO portfolio_state VALUES(1,?,?)').run(state.revision,JSON.stringify(state));
 const binding={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args);},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};
 return {db,store:new D1Store(binding)};
}
function largeHistory(){
 const state=initialState();state.revision=3;state.historyStorageVersion=1;const html='<div class="machine">وضعیت دستگاه — Working</div>'.repeat(13000);
 const document={id:'farm',title:'Farm',blocks:[{id:'live',type:'html',html}]};
 state.history=[{id:'site-1',site:{projects:[document]}},{id:'site-2',site:{projects:[document]}}];
 state.documentHistory=[{id:'doc-1',document},{id:'doc-2',document}];
 return state;
}
test('lossless history storage preserves legacy state, revisions and Unicode while reducing the oversized row',()=>{
 const state=largeHistory(),plain=JSON.stringify(state),stored=encodeStoredState(state);
 assert.ok(Buffer.byteLength(plain)>stateStorageLimit);assert.ok(Buffer.byteLength(stored)<stateStorageLimit);assert.deepEqual(decodeStoredState(stored),state);
 const raw=JSON.parse(stored);assert.equal(raw._historyArchive.encoding,'gzip-base64-v1');assert.deepEqual(raw.media,state.media);assert.deepEqual(raw.draft.projects.map(p=>p.id),state.draft.projects.map(p=>p.id));assert.deepEqual(decodeStoredState(plain),state);assert.equal(encodeStoredState({history:[],media:[]}),JSON.stringify({history:[],media:[]}));
});
test('an optimized JPEG upload succeeds with a formerly over-budget history and preserves every snapshot',async()=>{
 const before=largeHistory(),{db,store}=fixture(before),files=new Map();
 const jpeg=await sharp({create:{width:900,height:600,channels:3,background:'#668844'}}).jpeg().toBuffer();
 const response=await contentResponse(new Request('https://site.test/api/studio/upload',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'image/jpeg','X-File-Name':'farm.jpg','X-Media-Folder':'Site assets'},body:jpeg}),{},store,{put:async(id,bytes)=>{files.set(id,bytes);return {storage:'test',key:id};}},async bytes=>[{width:640,bytes:new Uint8Array(await sharp(bytes).resize({width:640}).webp().toBuffer())}],{upload:true});
 assert.equal(response.status,200);const {item}=await response.json();assert.equal(item.type,'image/webp');assert.equal(item.variants[0].width,640);assert.equal(item.variants[0].height,427);assert.equal(files.values().next().value.slice(8,12).toString(),'87,69,66,80');
 const after=await store.read();assert.deepEqual(after.history,before.history);assert.deepEqual(after.documentHistory,before.documentHistory);assert.deepEqual(after.draft,before.draft);assert.deepEqual(after.published,before.published);assert.equal(after.media.length,1);
 const row=db.prepare('SELECT value FROM portfolio_state').get();assert.ok(Buffer.byteLength(row.value)<stateStorageLimit);assert.ok(JSON.parse(row.value)._historyArchive);
 const media=await store.readMedia();media.media[0].alt='Updated alt';await store.writeMedia(media,after.revision);const restored=await store.read();assert.deepEqual(restored.history,before.history);assert.deepEqual(restored.documentHistory,before.documentHistory);assert.equal(restored.media[0].alt,'Updated alt');
});
test('compressed storage keeps optimistic concurrency and does not silently discard overlarge active content or broken history',async()=>{
 const {store}=fixture(largeHistory());const current=await store.read();await store.write(current,3);await assert.rejects(store.write(current,3),{status:409});
 await assert.rejects(store.write({...await store.read(),activeContent:'x'.repeat(1900000)},4),{status:413});
 assert.throws(()=>decodeStoredState(JSON.stringify({_historyArchive:{encoding:'unknown',data:'x'}})),/Unsupported/);
 assert.throws(()=>decodeStoredState(JSON.stringify({_historyArchive:{encoding:'gzip-base64-v1',data:'broken'}})));
});
test('compression activation is explicit and preserves a plain legacy row until all readers are upgraded',async()=>{
 const state=largeHistory();delete state.historyStorageVersion;const {store}=fixture(state);
 await assert.rejects(store.write(state,3),{status:413});assert.deepEqual(await store.read(),state);
 const response=await contentResponse(new Request('https://site.test/api/studio/storage',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'application/json'},body:JSON.stringify({action:'compact-history',revision:3})}),{},store,{},null);
 assert.equal(response.status,401);
 const env={OWNER_PASSWORD:'storage-test-password',OWNER_SESSION_SECRET:'storage-test-secret',OWNER_RATE_LIMITER:{limit:async()=>({success:true})}};
 const login=await authResponse(new Request('https://site.test/api/owner/login',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'application/json'},body:JSON.stringify({password:env.OWNER_PASSWORD})}),env);const cookie=login.headers.get('set-cookie').split(';')[0];
 const activate=revision=>contentResponse(new Request('https://site.test/api/studio/storage',{method:'POST',headers:{Cookie:cookie,Origin:'https://site.test','Content-Type':'application/json'},body:JSON.stringify({action:'compact-history',revision})}),env,store,{},null);
 assert.equal((await activate(2)).status,409);assert.equal((await activate(3)).status,200);
 const after=await store.read();assert.equal(after.historyStorageVersion,1);assert.deepEqual(after.history,state.history);assert.deepEqual(after.documentHistory,state.documentHistory);assert.deepEqual(after.draft,state.draft);assert.deepEqual(after.published,state.published);
});

test('active HTML is deduplicated losslessly and survives atomic media changes',async()=>{
 const state=largeHistory();const html='<section>آزمایش علمی</section>'.repeat(100000);state.draft.projects[0].blocks=[{id:'demo',type:'html',html}];state.published=structuredClone(state.draft);const original=structuredClone(state);const stored=encodeStoredState(state);assert.ok(Buffer.byteLength(stored)<stateStorageLimit);assert.deepEqual(state,original);assert.deepEqual(decodeStoredState(stored),state);const {store}=fixture(state);await store.write(state,3);const media=await store.readMedia();await store.writeMedia(media,4);const after=await store.read();assert.deepEqual(after.draft,state.draft);assert.deepEqual(after.published,state.published);assert.deepEqual(after.history,state.history);
});
