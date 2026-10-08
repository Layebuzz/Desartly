import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceStats} from '../src/cms/practice-stats.js';
test('practice counters derive visible content and deduplicate industries without changing experience',()=>{
 const stats=practiceStats({projects:[{id:'a',industry:'Food & Beverage'},{id:'b',industry:' food  & beverage '},{id:'c',industry:'Design'},{id:'d',industry:'Other',hidden:true},{id:'e',industry:'Other',archived:true},{id:'onboarding-experience',industry:'Demo'}],certificates:[{title:'Credential'},{title:'Hidden',hidden:true},{title:'Archived',archived:true},{title:' '}],stats:[{id:'years',value:'15',label:'Years designing'},{id:'projects',value:'122'},{id:'disciplines',value:'74'}]});
 assert.deepEqual(stats.map(s=>[s.id,s.value]),[['projects','3'],['years','15'],['certificates','1'],['industries','2']]);
 assert.equal(stats[0].automatic,true);assert.equal(stats[1].automatic,undefined);
});
test('empty collections count zero and do not invent experience',()=>{
 assert.deepEqual(practiceStats().map(s=>s.value),['0','00','0','0']);
});
