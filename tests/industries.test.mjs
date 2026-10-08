import test from 'node:test';import assert from 'node:assert/strict';
import {industries,validateIndustry,normalizeIndustryState} from '../src/cms/industries.js';
import {validateDocument,mutateDocument} from '../server/cms-service.js';import {validateSite,defaults} from '../src/cms/schema.js';
import {growthMetrics} from '../src/cms/growth-model.js';import {buildKnowledgeGraph} from '../src/cms/knowledge-model.js';
const doc={id:'farm',title:'Farm',brandPersonality:'competence',industry:'Agriculture',blocks:[]};
test('approved taxonomy accepts canonical choices and rejects invented industries in document and full-site APIs',()=>{
 assert.equal(new Set(industries).size,26);assert.equal(validateIndustry(' agriculture '),'Agriculture');
 for(const industry of ['Agriculture & Farm Management','Made up',123,null]){
  assert.throws(()=>validateDocument('project',{...doc,industry}));
  const site=defaults();site.projects=[{...doc,industry}];assert.throws(()=>validateSite(site));
 }
 assert.equal(validateDocument('project',doc).industry,'Agriculture');
});
test('taxonomy migration changes only industry/version metadata, preserves independent draft content and histories, and is idempotent',()=>{
 const old={...doc,industry:'Agriculture & Farm Management',_version:3};const state={revision:5,draftVersion:2,draft:{projects:[{...old,title:'Private edit'}]},published:{projects:[old]},history:[{site:{projects:[old]}}],documentHistory:[{document:old}],growthIndustries:['Agriculture & Farm Management','Agriculture']};
 const backup=structuredClone(state),r=normalizeIndustryState(state);assert.deepEqual(state,backup);assert.equal(r.changes.length,2);assert.deepEqual(r.unresolved,[]);assert.equal(r.state.draft.projects[0].title,'Private edit');assert.equal(r.state.published.projects[0].title,'Farm');assert.equal(r.state.published.projects[0]._version,4);assert.equal(r.state.draftVersion,3);assert.deepEqual(r.state.documentHistory,state.documentHistory);assert.deepEqual(r.state.history,state.history);assert.deepEqual(r.state.growthIndustries,['Agriculture']);assert.equal(normalizeIndustryState(r.state).changes.length,0);
});
test('unknown legacy industries are reported, never guessed; dashboard and graph cannot gain invented categories',()=>{
 const p={...doc,industry:'Imaginary sector'},r=normalizeIndustryState({draft:{projects:[p]},published:{projects:[]}});assert.equal(r.unresolved.length,1);assert.equal(r.state.draft.projects[0].industry,'Imaginary sector');
 const growth=growthMetrics({projects:[{...doc,industry:'Agriculture & Farm Management'},p],industries:['Imaginary sector']});assert.equal(growth.rows.length,26);assert.equal(growth.rows.find(r=>r.industry==='Agriculture').total,1);assert.ok(!growth.rows.some(r=>r.industry==='Imaginary sector'));
 assert.ok(!buildKnowledgeGraph({projects:[p]}).nodes.some(n=>n.label==='Imaginary sector'));
});
test('publishing cannot reintroduce an invented industry from a legacy document',()=>{
 const state={draft:{projects:[{...doc,industry:'Made up',_version:1}]},published:{projects:[]}};
 assert.throws(()=>mutateDocument(state,{action:'publish',kind:'project',id:doc.id,version:1}),/approved list/);
});

test('owner normalization endpoint has a read-only review, revision guard and taxonomy-only apply',async()=>{
 const {authResponse}=await import('../server/owner-auth.js');const {cmsResponse}=await import('../server/cms-api.js');
 const env={OWNER_PASSWORD:'industry-fixture',OWNER_SESSION_SECRET:'industry-fixture-secret',OWNER_RATE_LIMITER:{limit:async()=>({success:true})}};const origin='https://studio.example';
 const login=await authResponse(new Request(origin+'/api/owner/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.OWNER_PASSWORD})}),env);const cookie=login.headers.get('set-cookie').split(';')[0];
 let state={revision:4,draftVersion:3,draft:{projects:[{...doc,industry:'Agriculture & Farm Management',summary:'Private'}]},published:{projects:[{...doc,industry:'Agriculture & Farm Management',summary:'Live'}]},documentHistory:[]};
 const store={read:async()=>structuredClone(state),write:async(next,expected)=>{assert.equal(expected,state.revision);state={...next,revision:expected+1};return state;}};
 const call=body=>cmsResponse(new Request(origin+'/api/cms/industries',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env,store,{});
 assert.equal((await call({action:'review'})).status,200);assert.equal(state.revision,4);
 assert.equal((await call({action:'normalize',revision:3})).status,409);assert.equal(state.revision,4);
 assert.equal((await call({action:'normalize',revision:4})).status,200);assert.equal(state.revision,5);assert.equal(state.published.projects[0].industry,'Agriculture');assert.equal(state.published.projects[0].summary,'Live');assert.equal(state.draft.projects[0].summary,'Private');
});
