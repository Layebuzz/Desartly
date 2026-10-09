import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {S3Media,s3Request} from '../server/s3.js';
import {MediaStorage} from '../server/media-storage.js';
const env={S3_ENDPOINT:'https://storage.example.test',S3_BUCKET:'fixture',S3_ACCESS_KEY:'key',S3_SECRET_KEY:'secret',S3_REGION:'us-east-1'};
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
  assert.equal(h.get('Content-Type'),'image/webp');assert.equal(options.redirect,'manual');return new Response('');
 });
 await s3Request({...new S3Media(env).config,contentType:'image/webp'},'PUT','desartly/a b/ف.webp',new Uint8Array([1,2,3]),{z:2,a:1});
});
test('media storage uses only S3 for uploads and reads',async t=>{
 const storage=new MediaStorage(env);
 t.mock.method(globalThis,'fetch',async()=>new Response('stored'));
 assert.deepEqual(await storage.put('id.webp',new Uint8Array([1]),'image/webp'),{storage:'s3',key:'desartly/id.webp'});
 assert.equal(await(await storage.get({storage:'s3',key:'desartly/id.webp'})).text(),'stored');
 await assert.rejects(storage.get({storage:'s3',key:'../private'}));
});
test('missing S3 configuration and legacy assets fail without network fallback',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('Unexpected network request');});
 const storage=new MediaStorage({});
 assert.throws(()=>storage.put('id',new Uint8Array([1]),'image/webp'),{status:503});
 assert.throws(()=>storage.get({storage:'s3',key:'desartly/id'}),{status:503});
 assert.throws(()=>new MediaStorage(env).get({fileId:'legacy'}),{status:503});
 assert.equal(calls,0);
});

test('storage rejects redirects without forwarding credentials',async t=>{let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(null,{status:307,headers:{Location:'https://other.test'}});});await assert.rejects(s3Request(new S3Media(env).config,'GET','desartly/file'),/redirect rejected/);assert.equal(calls,1);});

test('cloud usage follows pagination and includes retained, static and private objects',async t=>{let calls=0;t.mock.method(globalThis,'fetch',async url=>{calls++;if(calls===1)return new Response('<ListBucketResult><Contents><Key>desartly/a</Key><Size>10</Size></Contents><Contents><Key>desartly/static/a</Key><Size>20</Size></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>a&amp;b</NextContinuationToken></ListBucketResult>');assert.equal(url.searchParams.get('continuation-token'),'a&b');return new Response('<ListBucketResult><Contents><Key>desartly/private/export</Key><Size>30</Size></Contents><Contents><Key>old</Key><Size>40</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>');});const result=await new S3Media(env).usage();assert.equal(result.used,100);assert.equal(result.count,4);assert.equal(result.groups.private.bytes,30);assert.equal(calls,2);});
test('incomplete cloud inventory never reports a partial total',async t=>{t.mock.method(globalThis,'fetch',async()=>new Response('<IsTruncated>true</IsTruncated>'));await assert.rejects(new S3Media(env).usage(),/incomplete/);});
