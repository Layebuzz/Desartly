import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../server/content-store.js';
import {updatePage} from '../server/page-service.js';
test('page publication cannot leak project, article, navigation or another page drafts',()=>{
 const state=initialState();state.draftVersion=4;
 state.draft.projects.push({id:'private',title:'Private',blocks:[]});
 state.draft.blogPosts=[{id:'private-note',title:'Private note',blocks:[]}];
 state.draft.pages['/about']={title:'Unreleased biography'};
 const live=structuredClone(state.published);
 const next=updatePage(state,{path:'/',page:{title:'New homepage'},draftVersion:4,publish:true,projects:state.draft.projects,nav:[],stats:[],clients:[],homeSections:[]});
 assert.equal(next.published.pages['/'].title,'New homepage');
 for(const key of ['projects','blogPosts','nav'])assert.deepEqual(next.published[key],live[key]);
 assert.deepEqual(next.published.pages['/about'],live.pages['/about']);
 assert.equal(next.draft.projects.at(-1).id,'private');
 assert.equal(next.draftVersion,5);
 assert.equal(state.draftVersion,4);
});
test('page drafts stay private and stale or unsupported writes are rejected',()=>{
 const state=initialState();state.draftVersion=2;
 const next=updatePage(state,{path:'/about',page:{title:'Draft'},draftVersion:2});
 assert.deepEqual(next.published,state.published);
 assert.throws(()=>updatePage(next,{path:'/about',page:{},draftVersion:2}),e=>e.status===409);
 assert.throws(()=>updatePage(next,{path:'/site',page:{},draftVersion:3}));
});
