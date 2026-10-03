import test from 'node:test';
import assert from 'node:assert/strict';
import {proxy} from '../api/backend.js';
const base='https://desartly.vercel.app';
test('Vercel forwards reads to the shared content service without visitor-supplied forwarding headers',async()=>{
 const response=await proxy(new Request(base+'/api/backend?__route=/api/site',{headers:{'X-Forwarded-Host':'attacker.example'}}),async(url,options)=>{
  assert.equal(String(url),'https://desartly.layebuzz.workers.dev/api/site');
  assert.equal(options.headers.has('X-Forwarded-Host'),false);
  return Response.json({site:{projects:[{id:'from-database'}]}});
 });
 assert.equal((await response.json()).site.projects[0].id,'from-database');
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('same-origin writes keep backend session cookies and validate origin before translation',async()=>{
 const r=await proxy(new Request(base+'/api/backend?__route=/api/studio/save',{method:'POST',headers:{Origin:base,Cookie:'owner=fixture'},body:'{}'}),async(url,options)=>{
  assert.equal(options.headers.get('Origin'),'https://desartly.layebuzz.workers.dev');
  assert.equal(options.headers.get('Cookie'),'owner=fixture');
  return new Response('{}',{headers:{'Set-Cookie':'owner=next; Secure; HttpOnly; SameSite=Strict; Path=/'}});
 });
 assert.match(r.headers.get('Set-Cookie'),/HttpOnly/);
 for(const origin of ['https://attacker.example',null]){
  const rejected=await proxy(new Request(base+'/api/backend?__route=/api/studio/save',{method:'POST',headers:origin?{Origin:origin}:{},body:'{}'}),()=>{throw Error('must not forward')});
  assert.equal(rejected.status,403);
 }
});
test('proxy cannot become an open proxy and returns an explicit service failure',async()=>{
 assert.equal((await proxy(new Request(base+'/api/backend?__route=https://attacker.example'))).status,404);
 assert.equal((await proxy(new Request(base+'/api/backend?__route=/api/site'),async()=>{throw Error('offline')})).status,502);
});
