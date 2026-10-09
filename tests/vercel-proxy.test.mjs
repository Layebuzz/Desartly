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

test('image uploads authenticate before decoding; invalid images return actionable errors',async()=>{
 const req=()=>new Request('https://desartly.vercel.app/api/studio/upload',{method:'POST',headers:{Origin:'https://desartly.vercel.app','Content-Type':'image/png'},body:'not an image'});
 let calls=0;let r=await proxy(req(),async()=>{calls++;return new Response('',{status:401});});assert.equal(r.status,401);assert.equal(calls,1);
 r=await proxy(req(),async()=>new Response('{}'));assert.equal(r.status,415);
});

test('media uploads preserve destination and description headers across Vercel',async()=>{
 const response=await proxy(new Request(base+'/api/studio/upload',{method:'POST',headers:{Origin:base,'Content-Type':'application/pdf','X-Media-Folder':encodeURIComponent('Campaign assets/Print'),'X-Media-Alt':'Poster'},body:'%PDF-fixture'}),async(url,options)=>{
  assert.equal(options.headers.get('X-Media-Folder'),encodeURIComponent('Campaign assets/Print'));
  assert.equal(options.headers.get('X-Media-Alt'),'Poster');return Response.json({item:{folder:'Campaign assets/Print'}});
 });assert.equal(response.status,200);
});

test('Google callback returns to the studio domain while preserving connection status',async()=>{
 const response=await proxy(new Request(base+'/api/studio/calendar/callback?state=fixture'),async()=>new Response(null,{status:302,headers:{Location:'/studio/calendar?connection=success'}}));
 assert.equal(response.headers.get('Location'),'https://studio.desartly.info/studio/calendar?connection=success');
});
test('upstream HTML errors are normalized with the provider trace and no HTML leakage',async()=>{
 const response=await proxy(new Request(base+'/api/studio/media-state'),async()=>new Response('<html>private diagnostics</html>',{status:503,headers:{'Content-Type':'text/html','CF-Ray':'fixture-ray'}}));
 assert.equal(response.status,503);assert.equal(response.headers.get('X-Request-Id'),'fixture-ray');const body=await response.json();assert.ok(!JSON.stringify(body).includes('private diagnostics'));assert.equal(body.requestId,'fixture-ray');
});
