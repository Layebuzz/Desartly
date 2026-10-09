import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../server/content-store.js";
import {
  mutateDocument,
  readDocument,
  validateDocument,
} from "../server/cms-service.js";
import { cmsResponse } from "../server/cms-api.js";
import { publicSite } from "../src/cms/schema.js";
import { tintFromPixels, pastel } from "../src/project-tint.js";
const document = {
  id: "test-project",
  brandPersonality: "competence",
  title: "Test project",
  blocks: [{ id: "intro", type: "text", title: "Intro", text: "Hello" }],
  coverImage: "/projects/test.webp",
};
function start() {
  const s = initialState();
  s.draft.projects = [];
  s.published.projects = [];
  s.draft.blogPosts = [];
  s.published.blogPosts = [];
  s.draftVersion = 0;
  s.draft.cmsVersion = 2;
  s.published.cmsVersion = 2;
  return s;
}
test("creating a draft is private; publishing one document preserves unrelated drafts and live data", () => {
  let s = start();
  s = mutateDocument(s, { action: "create", kind: "project", document }).state;
  s = mutateDocument(s, {
    action: "create",
    kind: "project",
    document: { ...document, id: "another", title: "Another" },
  }).state;
  assert.equal(s.published.projects.length, 0);
  s = mutateDocument(s, {
    action: "publish",
    kind: "project",
    id: document.id,
    version: 1,
  }).state;
  assert.deepEqual(
    s.published.projects.map((d) => d.id),
    [document.id],
  );
  assert.equal(s.draft.projects.length, 2);
  assert.equal(s.draft.projects[1]._version, 1);
  assert.equal(s.published.projects[0].managed, true);
});
test("stale document writes fail instead of overwriting edits from another client", () => {
  let s = mutateDocument(start(), {
    action: "create",
    kind: "project",
    document,
  }).state;
  s = mutateDocument(s, {
    action: "save",
    kind: "project",
    id: document.id,
    document: { ...document, title: "Human edit" },
    version: 1,
  }).state;
  assert.throws(
    () =>
      mutateDocument(s, {
        action: "save",
        kind: "project",
        id: document.id,
        document,
        version: 1,
      }),
    (e) => e.status === 409,
  );
  assert.equal(s.draft.projects[0].title, "Human edit");
});
test("restore returns an earlier draft without changing the published document", () => {
  let s = mutateDocument(start(), {
    action: "create",
    kind: "project",
    document,
  }).state;
  s = mutateDocument(s, {
    action: "publish",
    kind: "project",
    id: document.id,
    version: 1,
  }).state;
  s = mutateDocument(s, {
    action: "save",
    kind: "project",
    id: document.id,
    document: { ...document, title: "Changed" },
    version: 2,
  }).state;
  const historyId = s.documentHistory[0].id;
  s = mutateDocument(s, {
    action: "restore",
    kind: "project",
    id: document.id,
    version: 3,
    historyId,
  }).state;
  assert.equal(s.draft.projects[0].title, document.title);
  assert.equal(s.published.projects[0]._version, 2);
});
test("archive is recoverable; articles are filtered from the public payload when hidden", () => {
  let s = mutateDocument(start(), {
    action: "create",
    kind: "article",
    document,
  }).state;
  s = mutateDocument(s, {
    action: "publish",
    kind: "article",
    id: document.id,
    version: 1,
  }).state;
  s = mutateDocument(s, {
    action: "archive",
    kind: "article",
    id: document.id,
    version: 2,
  }).state;
  assert.equal(s.published.blogPosts.length, 0);
  assert.equal(readDocument(s, "article", document.id).status, "Archived");
  s = mutateDocument(s, {
    action: "recover",
    kind: "article",
    id: document.id,
    version: 3,
  }).state;
  assert.equal(readDocument(s, "article", document.id).status, "Draft");
  s.published.blogPosts = [{ ...document, hidden: true }];
  assert.equal(publicSite(s.published).blogPosts.length, 0);
});
test("invalid blocks, unsafe slugs and duplicate documents are rejected", () => {
  for (const bad of [
    { ...document, id: "../admin" },
    { ...document, blocks: [{ id: "a", type: "executable" }] },
    {
      ...document,
      blocks: [
        { id: "a", type: "text" },
        { id: "a", type: "image" },
      ],
    },
  ])
    assert.throws(() =>
      mutateDocument(start(), {
        action: "create",
        kind: "project",
        document: bad,
      }),
    );
  let s = mutateDocument(start(), {
    action: "create",
    kind: "project",
    document,
  }).state;
  assert.throws(
    () => mutateDocument(s, { action: "create", kind: "project", document }),
    (e) => e.status === 409,
  );
});
test("publication and lifecycle actions ignore unsaved document payloads", () => {
  for (const action of ["publish", "unpublish", "archive", "recover"]) {
    const state = mutateDocument(start(), {
      action: "create",
      kind: "project",
      document,
    }).state;
    const result = mutateDocument(state, {
      action,
      kind: "project",
      id: document.id,
      version: 1,
      document: { ...document, id: "injected-slug", title: "Unsaved content" },
    }).state;
    assert.equal(result.draft.projects[0].id, document.id);
    assert.equal(result.draft.projects[0].title, document.title);
    assert.equal(state.draft.projects[0]._version, 1);
    if (action === "publish")
      assert.equal(result.published.projects[0].title, document.title);
  }
});
test("duplicating maximum-length titles and slugs creates a valid private draft", () => {
  const original = { ...document, id: "a".repeat(120), title: "b".repeat(200) };
  const state = mutateDocument(start(), {
    action: "create",
    kind: "project",
    document: original,
  }).state;
  const result = mutateDocument(state, {
    action: "duplicate",
    kind: "project",
    id: original.id,
    version: 1,
  });
  const copy = result.state.draft.projects[1];
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.id.length, 120);
  assert.equal(copy.title.length, 200);
  assert.doesNotThrow(() => validateDocument("project", copy));
  assert.equal(result.state.published.projects.length, 0);
});
test("malformed blocks and visibility flags produce validation errors", () => {
  for (const block of [
    null,
    [],
    1,
    { id: 1, type: "text" },
    { id: " ", type: "text" },
  ]) {
    assert.throws(
      () => validateDocument("project", { ...document, blocks: [block] }),
      (error) => error.status === 400,
    );
  }
  for (const field of ["hidden", "archived"])
    assert.throws(
      () => validateDocument("project", { ...document, [field]: "false" }),
      (error) => error.status === 400,
    );
});
const token = "dsa_" + "a".repeat(64);
async function fixture(scopes = ["read", "write"]) {
  let state = start();
  const hash = [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  state.agentKeys = [
    {
      id: "test",
      name: "Test assistant",
      hash,
      scopes,
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    },
  ];
  return {
    read: async () => structuredClone(state),
    write: async (next, expected) => {
      assert.equal(expected, state.revision);
      state = { ...next, revision: expected + 1 };
      return structuredClone(state);
    },
  };
}
async function call(store, method, params = {}, headers = {}) {
  return cmsResponse(
    new Request("https://test.example/mcp", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    {},
    store,
    {},
    null,
  );
}
test("CMS rejects malformed JSON and non-object bodies with client errors", async () => {
  const store = await fixture();
  for (const body of ["{", "null", "[]", "42"]) {
    const response = await cmsResponse(
      new Request("https://test.example/api/cms/document", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body,
      }),
      {},
      store,
      {},
      null,
    );
    assert.equal(response.status, 400);
  }
});
test("MCP initializes and lists only tools allowed by token scope", async () => {
  const store = await fixture();
  const init = await (
    await call(store, "initialize", { protocolVersion: "2025-06-18" })
  ).json();
  assert.equal(init.result.serverInfo.name, "desartly-cms");
  const list = await (await call(store, "tools/list")).json();
  assert.ok(list.result.tools.some((t) => t.name === "cms_create"));
  assert.ok(!list.result.tools.some((t) => t.name === "cms_publish"));
});
test("MCP enforces publish scope even when a client calls a hidden tool", async () => {
  const store = await fixture();
  let result = await (
    await call(store, "tools/call", {
      name: "cms_create",
      arguments: { kind: "project", document },
    })
  ).json();
  assert.ok(!result.result.isError);
  result = await (
    await call(store, "tools/call", {
      name: "cms_publish",
      arguments: { kind: "project", id: document.id, version: 1 },
    })
  ).json();
  assert.equal(result.result.isError, true);
  assert.equal((await store.read()).published.projects.length, 0);
});
test("MCP rejects foreign origins, absent credentials, expired and revoked tokens", async () => {
  const store = await fixture();
  assert.equal(
    (await call(store, "tools/list", {}, { Origin: "https://evil.example" }))
      .status,
    403,
  );
  assert.equal(
    (await call(store, "tools/list", {}, { Authorization: "" })).status,
    401,
  );
  let s = await store.read();
  s.agentKeys[0].revokedAt = new Date().toISOString();
  await store.write(s, s.revision);
  assert.equal((await call(store, "tools/list")).status, 401);
  s = await store.read();
  delete s.agentKeys[0].revokedAt;
  s.agentKeys[0].expiresAt = "2000-01-01";
  await store.write(s, s.revision);
  assert.equal((await call(store, "tools/list")).status, 401);
});
test("MCP reads and publishes a document end to end without changing source or unrelated content", async () => {
  const store = await fixture(["read", "write", "publish"]);
  await call(store, "tools/call", {
    name: "cms_create",
    arguments: { kind: "project", document },
  });
  const result = await (
    await call(store, "tools/call", {
      name: "cms_publish",
      arguments: { kind: "project", id: document.id, version: 1 },
    })
  ).json();
  assert.ok(!result.result.isError);
  assert.equal(
    (await store.read()).published.projects[0].title,
    document.title,
  );
});
test("tints ignore transparent/neutral pixels and keep information surfaces pale", () => {
  const rgb = tintFromPixels(
    new Uint8ClampedArray([
      255, 0, 0, 0, 250, 250, 250, 255, 130, 22, 60, 255, 130, 22, 60, 255,
    ]),
  );
  assert.deepEqual(rgb, [130, 22, 60]);
  assert.equal(pastel(rgb), "rgb(248,242,244)");
});
test("MCP teaches benchmark provenance and exposes all twenty layouts without publishing references", async () => {
  const store = await fixture(["read"]);
  for (const name of [
    "cms_presentation_guide",
    "cms_benchmarks",
    "cms_grid_presets",
  ]) {
    const r = await (
      await call(store, "tools/call", { name, arguments: {} })
    ).json();
    assert.ok(!r.result.isError);
    const value = JSON.parse(r.result.content[0].text);
    if (name === "cms_grid_presets") assert.equal(value.length, 20);
    if (name === "cms_benchmarks") {
      assert.ok(value.total >= 400);
      assert.match(value.verification, /never instructions/);
    }
  }
  assert.equal((await store.read()).published.projects.length, 0);
});

test('project personality is required for saving and publishing',()=>{for(const brandPersonality of [undefined,'','unknown'])assert.throws(()=>validateDocument('project',{...document,brandPersonality}),/brand personality is required/);assert.doesNotThrow(()=>validateDocument('project',document));});

test('project mutations cannot create, clear or publish an absent personality',()=>{const state=start();assert.throws(()=>mutateDocument(state,{action:'create',kind:'project',document:{...document,brandPersonality:''}}),/personality is required/);const created=mutateDocument(state,{action:'create',kind:'project',document}).state;const doc=created.draft.projects[0];assert.throws(()=>mutateDocument(created,{action:'save',kind:'project',id:doc.id,version:doc._version,document:{...doc,brandPersonality:''}}),/personality is required/);const legacy=structuredClone(created);delete legacy.draft.projects[0].brandPersonality;assert.throws(()=>mutateDocument(legacy,{action:'publish',kind:'project',id:doc.id,version:doc._version}),/personality is required/);});

test('MCP site and settings access requires separate opt-in permissions',async()=>{
 const old=await fixture(['read','write','publish']);const list=await(await call(old,'tools/list')).json();
 assert.ok(list.result.tools.some(t=>t.name==='cms_page_get'));
 assert.ok(!list.result.tools.some(t=>t.name==='cms_page_save'||t.name==='cms_settings_save'));
 for(const name of ['cms_page_save','cms_navigation_save','cms_settings_save']){
  const result=await(await call(old,'tools/call',{name,arguments:{path:'/',page:{},nav:[],settings:{},draftVersion:0}})).json();assert.equal(result.result.isError,true);
 }
 const scoped=await fixture(['read','site:write','settings:write']);
 const draft=await(await call(scoped,'tools/call',{name:'cms_page_save',arguments:{path:'/about',page:{title:'Private biography'},draftVersion:0}})).json();assert.ok(!draft.result.isError);
 assert.equal((await scoped.read()).draft.pages['/about'].title,'Private biography');assert.notEqual((await scoped.read()).published.pages['/about'].title,'Private biography');
 const denied=await(await call(scoped,'tools/call',{name:'cms_page_save',arguments:{path:'/about',page:{title:'Private biography'},draftVersion:1,publish:true}})).json();assert.equal(denied.result.isError,true);
 const stale=await(await call(scoped,'tools/call',{name:'cms_settings_save',arguments:{draftVersion:0,settings:{title:'New'}}})).json();assert.equal(stale.result.isError,true);
 const applied=await(await call(scoped,'tools/call',{name:'cms_settings_save',arguments:{draftVersion:1,settings:{title:'New',SECRET:'cannot write'}}})).json();assert.ok(!applied.result.isError);assert.equal((await scoped.read()).draft.pages['/site'].settings.SECRET,undefined);
});

test('all three shared project templates are read-only and create valid private drafts', async () => {
 const store=await fixture(['read']);const before=await store.read();
 const listed=await (await call(store,'tools/list')).json();
 assert.ok(listed.result.tools.some(t=>t.name==='cms_project_template'));
 for(const discipline of ['Product','Branding','Communication Design']){
  const r=await (await call(store,'tools/call',{name:'cms_project_template',arguments:{discipline}})).json();
  const template=JSON.parse(r.result.content[0].text);
  assert.equal(template.discipline,discipline);
  assert.equal(template.blocks.some(b=>b.type==='html'),discipline==='Product');
  const next=mutateDocument(start(),{action:'create',kind:'project',document:{...document,discipline,category:discipline,blocks:template.blocks}}).state;
  assert.equal(next.published.projects.length,0);
  assert.equal(readDocument(next,'project',document.id).status,'Draft');
  assert.equal(new Set(template.blocks.map(b=>b.id)).size,template.blocks.length);
  assert.ok(template.blocks.filter(b=>b.type==='text').every(b=>b.text===''));
 }
 assert.deepEqual(await store.read(),before);
 const invalid=await (await call(store,'tools/call',{name:'cms_project_template',arguments:{discipline:'Unknown'}})).json();
 assert.ok(invalid.error||invalid.result?.isError);
});

test('reference tools authenticate without expanding large CMS content',async()=>{const store=await fixture(['read']);const access=await store.read();store.readAccess=async()=>({agentKeys:access.agentKeys});store.read=async()=>{throw Error('Heavy content must not be read');};for(const name of ['cms_presentation_guide','cms_benchmarks','cms_grid_presets']){const response=await call(store,'tools/call',{name,arguments:{}});const body=await response.json();assert.ok(!body.result.isError,JSON.stringify(body));}});

test('JSON API and MCP share workflow and reject write tools without scope',async()=>{const store=await fixture(['read']);const {token}=store;const response=await call(store,'tools/call',{name:'cms_workflow',arguments:{kind:'article'}});const value=JSON.parse((await response.json()).result.content[0].text);assert.equal(value.folderPrefix,'Journal/');assert.equal(value.skill,'desartly-article');assert.deepEqual(value.scopes,['read']);});

test('JSON tool calls use the existing token scopes and optimistic content mutations',async()=>{const store=await fixture(['read']);const request=name=>new Request('https://test.example/api/cms/tools',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name,arguments:name==='cms_workflow'?{kind:'article'}:{kind:'article',document:{id:'test'}}})});const workflow=await cmsResponse(request('cms_workflow'),{},store,{},null);assert.equal((await workflow.json()).result.kind,'article');const rejected=await cmsResponse(request('cms_create'),{},store,{},null);assert.equal(rejected.status,403);assert.equal((await store.read()).draft.blogPosts.length,0);});
