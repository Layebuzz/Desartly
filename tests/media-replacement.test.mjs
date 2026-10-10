import test from 'node:test';
import assert from 'node:assert/strict';
import {contentResponse} from '../server/content-api.js';
import {initialState} from '../server/content-store.js';

test('Replace preserves alt unless explicitly changed and retains previous bytes',async()=>{
 for(const alt of [undefined,'Updated alt','']){
  let state=initialState();state.media=[{id:'existing',name:'note.txt',folder:'Site assets',type:'text/plain',alt:'Original alt',createdAt:'2026-01-01',variants:[{width:0,size:3,asset:{key:'old'}}]}];
  const store={read:async()=>structuredClone(state),write:async next=>state=next};
  const headers={Origin:'https://qa.test','Content-Type':'text/plain','X-File-Name':'note.txt','X-Media-Folder':'Site assets','X-Replace-Media':'existing'};if(alt!==undefined)headers['X-Media-Alt']=encodeURIComponent(alt);
  const response=await contentResponse(new Request('https://qa.test/api/studio/upload',{method:'POST',headers,body:'new bytes'}),{},store,{put:async()=>({key:'new'})},null,{upload:true});
  assert.equal(response.status,200);const {item}=await response.json();assert.equal(item.alt,alt===undefined?'Original alt':alt);assert.equal(item.id,'existing');assert.equal(item.createdAt,'2026-01-01');assert.deepEqual(item.fileVersions[0].variants[0].asset,{key:'old'});
 }
});
