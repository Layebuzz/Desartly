import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {S3Media,s3Request} from '../server/s3.js';
import {MediaStorage} from '../server/media-storage.js';
import {migrateMedia,migrationResponse} from '../server/storage-migration.js';
const env={S3_ENDPOINT:'https://storage.example.test',S3_BUCKET:'fixture',S3_ACCESS_KEY:'key',S3_SECRET_KEY:'secret',S3_REGION:'us-east-1',B2_KEY_ID:'id',B2_APP_KEY:'secret',B2_BUCKET_ID:'bucket'};
test('S3 request encodes keys and signs the exact body and canonical request',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url.pathname,'/fixture/desartly/a%20b/%D9%81.webp');
  assert.equal(url.search,'?a=1&z=2');
  const h=options.headers,date=h.get('x-amz-date'),day=date.slice(0,8),scope=day+'/us-east-1/s3/aws4_request';
  const hash=x=>createHash('sha256').update(x).digest('hex'),mac=(k,x)=>createHmac('sha256',k).update(x).digest();
  const payload=hash(options.body),names='host;x-amz-content-sha256;x-amz-date';
  const canonical=['PUT',url.pathname,'a=1&z=2',`host:${url.host}\nx-amz-content-sha256:${payload}\nx-amz-date:${date}\n`,names,payload].join('\n');
  const key=mac(mac(mac(mac('AWS4secret',day),'us-east-1'),'s3'),'aws4_request');
  const signature=mac(key,'AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+hash(canonical)).toString('hex');
  assert.equal(h.get('authorization'),`AWS4-HMAC-SHA256 Credential=key/${scope}, SignedHeaders=${names}, Signature=${signature}`);
  assert.equal(h.get('Content-Type'),'image/webp');assert.equal(options.redirect,'error');return new Response('');
 });
 await s3Request({...new S3Media(env).config,contentType:'image/webp'},'PUT','desartly/a b/ف.webp',new Uint8Array([1,2,3]),{z:2,a:1});
});
test('media storage sends new uploads to S3 and keeps old B2 assets readable',async t=>{
 const storage=new MediaStorage(env);let oldReads=0;
 t.mock.method(storage.b2,'get',async()=>{oldReads++;return new Response('old');});
 t.mock.method(globalThis,'fetch',async()=>new Response('new'));
 assert.deepEqual(await storage.put('id.webp',new Uint8Array([1]),'image/webp'),{storage:'s3',key:'desartly/id.webp'});
 assert.equal(await(await storage.get({fileId:'old'})).text(),'old');assert.equal(oldReads,1);
 assert.equal(await(await storage.get({storage:'s3',key:'desartly/id.webp'})).text(),'new');
 await assert.rejects(storage.get({storage:'s3',key:'../private'}));
});
test('failed destination verification never changes the CMS asset',async t=>{
 let writes=0;const state={revision:1,media:[{id:'id',type:'image/webp',variants:[{width:2,size:3,asset:{fileId:'b2'}}]}]};
 const store={read:async()=>structuredClone(state),write:async()=>{writes++;}};
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(String(url).includes('authorize_account'))return Response.json({authorizationToken:'token',apiInfo:{storageApi:{apiUrl:'https://api.backblazeb2.com',downloadUrl:'https://f.backblazeb2.com'}}});
  if(String(url).includes('download_file'))return new Response(new Uint8Array([1,2,3]));
  return new Response(options.method==='GET'?'corrupted':'');
 });
 await assert.rejects(migrateMedia(store,env,['id']),/verification/);assert.equal(writes,0);assert.deepEqual(state.media[0].variants[0].asset,{fileId:'b2'});
});
test('migration preserves concurrent content edits and retries a revision conflict',async t=>{
 let writes=0,reads=0;const state={revision:1,draft:{title:'original'},published:{title:'published'},media:[{id:'id',type:'image/webp',folder:'Projects/X',variants:[{width:2,size:3,asset:{fileId:'b2'}}]}]};
 const store={read:async()=>{reads++;if(reads>1)state.draft.title='edited concurrently';return structuredClone(state);},write:async(next,expected)=>{writes++;if(writes===1){state.revision++;throw Object.assign(Error('conflict'),{status:409});}assert.equal(expected,state.revision);Object.assign(state,next);}};
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(String(url).includes('authorize_account'))return Response.json({authorizationToken:'token',apiInfo:{storageApi:{apiUrl:'https://api.backblazeb2.com',downloadUrl:'https://f.backblazeb2.com'}}});
  return options.method==='PUT'?new Response(''):new Response(new Uint8Array([1,2,3]));
 });
 const result=await migrateMedia(store,env,['id']);assert.equal(result[0].status,'migrated');assert.equal(writes,2);assert.equal(state.draft.title,'edited concurrently');assert.equal(state.published.title,'published');assert.equal(state.media[0].folder,'Projects/X');assert.equal(state.media[0].variants[0].asset.storage,'s3');
});
test('migration route is unavailable without the temporary secret',async()=>{
 const request=new Request('https://site.test/api/__media-migration',{method:'POST'});
 assert.equal((await migrationResponse(request,env,null)).status,404);
 assert.equal((await migrationResponse(request,{...env,MEDIA_MIGRATION_TOKEN:'x'.repeat(50)},null)).status,404);
});
