import test from 'node:test';import assert from 'node:assert/strict';import {growthMetrics,targetIndustries} from '../src/cms/growth-model.js';
test('growth counts distinct personality slots, not repeated projects or unassigned labels',()=>{const g=growthMetrics({projects:[{id:'a',industry:'OTA',brandPersonality:'sincerity'},{id:'b',industry:'OTA',brandPersonality:'sincerity'},{id:'c',industry:'OTA'},{id:'d',industry:'OTA',hidden:true,brandPersonality:'excitement'}],industries:['Education'],inbox:[{reason:'proposal'},{reason:'proposal',test:true},{reason:'hr'}]});assert.equal(g.coverage,1);assert.equal(g.target,targetIndustries.length*5);assert.equal(g.published,3);assert.equal(g.unassigned,1);assert.equal(g.briefs,1);assert.ok(g.rows.some(r=>r.industry==='Education'&&r.total===0));assert.equal(g.rows.find(r=>r.industry==='OTA').cells[0].projects.length,2);});

test('retired starter projects do not inflate portfolio achievements',()=>{const g=growthMetrics({projects:[{id:'onboarding-experience',industry:'OTA'},{id:'real-project',industry:'OTA'}]});assert.equal(g.published,1);assert.equal(g.rows.find(r=>r.industry==='OTA').total,1);});

test('matrix splits each personality and industry into three independent disciplines',()=>{
 const g=growthMetrics({projects:[
 {id:'b1',industry:'Health & Wellness',brandPersonality:'competence',discipline:'Branding'},
 {id:'b2',industry:'Health & Wellness',brandPersonality:'competence',category:'Branding'},
 {id:'p',industry:'Health & Wellness',brandPersonality:'competence',discipline:'Product'},
 {id:'c',industry:'Health & Wellness',brandPersonality:'competence',category:'Advertising'},
 {id:'hidden',industry:'Health & Wellness',brandPersonality:'competence',discipline:'Product',hidden:true},
 {id:'unclassified',industry:'OTA',discipline:'Product'}]});
 assert.deepEqual(g.rows.find(r=>r.industry==='Health & Wellness').cells.find(c=>c.id==='competence').counts,{'Branding':2,'Product':1,'Communication Design':1});
 assert.deepEqual(g.counts,{'Branding':2,'Product':2,'Communication Design':1});
 assert.equal(g.representedIndustries,2);
 assert.deepEqual(g.rows.find(r=>r.industry==='Education').cells[0].counts,{'Branding':0,'Product':0,'Communication Design':0});
});
