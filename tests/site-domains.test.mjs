import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceRoute,publicOrigin,studioOrigin} from '../server/site-domains.js';
test('public owner links migrate to Studio preserving deep links and queries',()=>{
 assert.equal(surfaceRoute('www.desartly.info','/studio/calendar','connection=success').redirect,studioOrigin+'/studio/calendar?connection=success');
 assert.equal(surfaceRoute('desartly.vercel.app','/login','next=%2Fstudio').redirect,studioOrigin+'/login?next=%2Fstudio');
 assert.deepEqual(surfaceRoute('www.desartly.info','/contact'),{public:true});
});
test('Studio serves private routes, redirects its root and public navigation',()=>{
 assert.equal(surfaceRoute('studio.desartly.info','/').redirect,studioOrigin+'/studio');
 assert.deepEqual(surfaceRoute('studio.desartly.info','/preview/work/myom'),{studio:true});
 assert.equal(surfaceRoute('studio.desartly.info','/work/myom').redirect,publicOrigin+'/work/myom');
});

test('legacy layout redirects preserve the page selection query',()=>{
 assert.equal(surfaceRoute('www.desartly.info','/studio/layout','path=%2Fabout').redirect,studioOrigin+'/studio/layout?path=%2Fabout');
});

test('standalone booking uses its own surface and keeps owner routes private',()=>{assert.deepEqual(surfaceRoute('book.desartly.info','/'),{booking:true});assert.deepEqual(surfaceRoute('book.desartly.info','/contact'),{booking:true});assert.equal(surfaceRoute('book.desartly.info','/studio').redirect,studioOrigin+'/studio');});
