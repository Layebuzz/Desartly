import test from 'node:test';
import assert from 'node:assert/strict';
import {B2Media} from '../server/b2.js';
const env=()=>({B2_KEY_ID:'fixture-id',B2_APP_KEY:'fixture-key',B2_BUCKET_ID:'fixture-bucket'});
const auth=()=>Response.json({authorizationToken:'fixture-token',apiInfo:{storageApi:{apiUrl:'https://api001.backblazeb2.com',downloadUrl:'https://f001.backblazeb2.com'}}});
test('concurrent downloads share authorization and subsequent downloads reuse it',async t=>{
 let authorizationCalls=0,downloads=0;t.mock.method(globalThis,'fetch',async url=>{if(String(url).includes('authorize_account')){authorizationCalls++;return auth();}downloads++;return new Response('image');});
 const media=new B2Media(env());await Promise.all([media.get({fileId:'one'}),media.get({fileId:'two'})]);await media.get({fileId:'three'});assert.equal(authorizationCalls,1);assert.equal(downloads,3);
});
test('cached immutable media avoids storage requests',async t=>{
 const values=new Map();const previous=Object.getOwnPropertyDescriptor(globalThis,'caches');Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{match:async req=>values.get(req.url)?.clone(),put:async(req,res)=>values.set(req.url,res)}}});t.after(()=>{if(previous)Object.defineProperty(globalThis,'caches',previous);else delete globalThis.caches;});let calls=0;t.mock.method(globalThis,'fetch',async url=>{calls++;return String(url).includes('authorize_account')?auth():new Response('image');});
 const media=new B2Media(env());assert.equal(await(await media.get({fileId:'same'})).text(),'image');assert.equal(await(await media.get({fileId:'same'})).text(),'image');assert.equal(calls,2);
});
test('transaction-cap errors back off and never cache an error image',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({code:'transaction_cap_exceeded'},{status:403});});t.mock.method(console,'warn',()=>{});const media=new B2Media(env());
 await assert.rejects(media.get({fileId:'one'}),e=>e.status===503&&e.storageCode==='transaction_cap_exceeded');await assert.rejects(media.get({fileId:'two'}),e=>e.status===503);assert.equal(calls,1);
});
test('expired authorization is refreshed once on download',async t=>{
 let authorizationCalls=0,downloads=0;t.mock.method(globalThis,'fetch',async url=>{if(String(url).includes('authorize_account')){authorizationCalls++;return auth();}downloads++;return downloads===1?new Response('',{status:401}):new Response('image');});assert.equal(await(await new B2Media(env()).get({fileId:'one'})).text(),'image');assert.equal(authorizationCalls,2);assert.equal(downloads,2);
});
