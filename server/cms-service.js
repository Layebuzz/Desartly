import {validateIndustry,canonicalIndustry} from '../src/cms/industries.js';
import {validatePresentationReview} from '../src/cms/presentation-readiness.js';
import {validateAnnouncement} from '../src/cms/announcement.js';
import {libraryFolders,organiseMedia} from '../src/cms/media-architecture.js';
import {growthMetrics,personalities} from '../src/cms/growth-model.js';
import { materialize } from "../src/cms/materialize.js";
import {
  disciplines,
  projectDiscipline,
  projectIndustry,
} from "../src/project-tags.js";
import { isVisibleProject } from "../src/cms/visibility.js";
import { validateSite } from "../src/cms/schema.js";
export const fail = (message, status = 400) => {
  throw Object.assign(Error(message), { status });
};
export const fieldFor = (kind) =>
  kind === "project"
    ? "projects"
    : kind === "article"
      ? "blogPosts"
      : fail("Choose project or article.");
export function validateDocument(kind, doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc))
    fail("Document must be an object.");
  if (doc.id === "new" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(doc.id || ""))
    fail("Use a lowercase URL slug with letters, numbers and hyphens.");
  if (
    typeof doc.title !== "string" ||
    !doc.title.trim() ||
    doc.title.length > 200
  )
    fail("A title of 1–200 characters is required.");
  if (!Array.isArray(doc.blocks) || doc.blocks.length > 150)
    fail("Use at most 150 content blocks.");
  for (const key of [
    "summary",
    "excerpt",
    "industry",
    "clientName",
    "clientDescription",
    "challenge",
    "role",
    "deliverables",
    "outcome",
    "credits",
  ])
    if (doc[key] !== undefined && typeof doc[key] !== "string")
      fail(key + " must be text.");
  if (
    doc.references !== undefined &&
    (!Array.isArray(doc.references) || doc.references.length > 30)
  )
    fail("Use at most 30 benchmark references.");
  validateAnnouncement(doc.announcement);
  validatePresentationReview(doc.presentationReview);
  if (JSON.stringify(doc).length > 600000)
    fail("Document exceeds 600 KB. Upload images to the media library.");
  const ids = new Set();
  for (const block of doc.blocks) {
    if (!block || typeof block !== "object" || Array.isArray(block))
      fail("Every block must be an object.");
    if (typeof block.id !== "string" || !block.id.trim() || ids.has(block.id))
      fail("Every block needs a unique text ID.");
    ids.add(block.id);
    if (
      !["text", "image", "html", "markdown", "grid", "composition","chart"].includes(
        block.type,
      )
    )
      fail("Unsupported content block: " + block.type);
    if(block.type==='chart'&&['title','description','unit','source','insight'].some(k=>block[k]!==undefined&&typeof block[k]!=='string'))fail('Chart labels and descriptions must be text.');
    if(block.type==='chart' && (!['bar','line','funnel','radar','scanpath','metrics'].includes(block.chartType)||!Array.isArray(block.labels)||!Array.isArray(block.values)||block.labels.length!==block.values.length||block.labels.length<1||block.labels.length>12||(block.chartType==='radar'&&(block.labels.length<3||block.labels.length>8||block.values.some(x=>x>100)))||block.labels.some(x=>typeof x!=='string')||block.values.some(x=>!Number.isFinite(x)||x<0)||(block.points!==undefined&&(!Array.isArray(block.points)||block.points.length!==block.labels.length||block.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>640))))))fail('Invalid chart data.');
    if (block.type === "html" && block.component !== "divar-categories" && typeof block.html !== "string")
      fail("HTML blocks need HTML content.");
  }
  for(const block of doc.blocks||[]){
    if(block.type!=='html')continue;
    if(block.componentSelector!==undefined&&(typeof block.componentSelector!=='string'||block.componentSelector.length>500))fail('Component selector must be text under 500 characters.');
    if(block.previewWidth!==undefined&&(!Number.isFinite(block.previewWidth)||block.previewWidth<240||block.previewWidth>2400))fail('Preview width must be between 240 and 2400 pixels.');
  }
  for (const key of ["hidden", "archived"])
    if (doc[key] !== undefined && typeof doc[key] !== "boolean")
      fail(key + " must be a boolean.");
  for (const key of ["coverImage", "heroImage", "clientLogo"])
    if (
      doc[key] &&
      !(
        /^(\/[^/\\]|https:\/\/)/.test(doc[key]) ||
        /^data:image\/(webp|png|jpeg);base64,/.test(doc[key])
      )
    )
      fail("Invalid image URL.");
  if (kind === "article" && doc.date && !/^\d{4}-\d{2}-\d{2}$/.test(doc.date))
    fail("Use YYYY-MM-DD for the date.");
  if (kind === "project") {
    if(!personalities.some(p=>p.id===doc.brandPersonality))fail("A primary brand personality is required. Choose one of the five brand personalities.");
    doc = {
      ...doc,
      discipline: projectDiscipline(doc),
      category: projectDiscipline(doc),
      industry: validateIndustry(projectIndustry(doc),{allowEmpty:true}),
    };
    if (doc.industry.length > 80)
      fail("Industry must be 80 characters or fewer.");
  }
  return structuredClone(doc);
}
export function documentStatus(state, kind, doc) {
  if (doc.archived) return "Archived";
  const live = (state.published[fieldFor(kind)] || []).find(
    (p) =>
      p.id === doc.id &&
      !p.hidden &&
      (kind !== "project" || isVisibleProject(p)),
  );
  if (!live) return "Draft";
  const clean = (p) => {
    const c = { ...p };
    delete c._version;
    delete c.updatedAt;
    delete c.announcement;
    delete c.presentationReview;
    return JSON.stringify(c);
  };
  return clean(doc) === clean(live) ? "Published" : "Changed";
}
export function documentSummary(state, kind, doc) {
  return {
    id: doc.id,
    title: doc.title,
    language: doc.language || "en",
    coverImage: doc.coverImage || "",
    category: kind === "project" ? projectDiscipline(doc) : doc.category || "",
    industry: kind === "project" ? projectIndustry(doc) : "",
    brandPersonality:doc.brandPersonality||"",
    relatedProject:kind === "article" ? doc.relatedProject || "" : "",
    updatedAt: doc.updatedAt || "",
    version: doc._version || 0,
    status: documentStatus(state, kind, doc),
    blocks: doc.blocks?.length || 0,
  };
}
export function cmsView(state) {
  state = {
    ...state,
    draft: materialize(structuredClone(state.draft)),
    published: materialize(structuredClone(state.published)),
  };
  return {
    marketing:state.marketing||{programs:[],tasks:[]},
    growth:growthMetrics({marketing:state.marketing,projects:state.published.projects,draftProjects:state.draft.projects,articles:state.draft.blogPosts,certificates:state.draft.certificates,pages:state.draft.pages,inbox:state.inbox,industries:state.growthIndustries||[]}),
    knowledge:{certificates:(state.draft.certificates||[]).map(c=>({id:c.id,title:c.title||c.name}))},
    seo: Object.fromEntries(Object.entries(state.draft.pages||{}).map(([path,page])=>[path,page.seo||{}])),
    revision: state.revision,
    draftVersion: state.draftVersion || 0,
    projects: (state.draft.projects || []).map((d) =>
      documentSummary(state, "project", d),
    ),
    articles: (state.draft.blogPosts || []).map((d) =>
      documentSummary(state, "article", d),
    ),
    media: state.media || [],
    mediaFolders: libraryFolders(state),
    mediaFolderColors: state.mediaFolderColors || {},
    mediaFolderMetadata:state.mediaFolderMetadata||{},
    mediaActivity:state.mediaActivity||[],
    mediaCanUndo:Boolean(state.mediaUndo?.length),
    mediaFolderLocations: state.mediaFolderLocations || {},
    trashedMediaFolders: state.trashedMediaFolders || [],
    inbox: state.inbox || [],
    activity: state.cmsActivity || [],
    keys: (state.agentKeys || []).map(({ hash, ...key }) => key),
    settings: {...state.draft.settings,title:state.draft.settings?.siteTitle||"Desartly",...state.draft.pages?.["/site"]?.settings},
    nav: state.draft.nav || [],
    publishedAt: state.publishedAt,
  };
}
export function readDocument(state, kind, id) {
  const field = fieldFor(kind);
  const document = (
    materialize(structuredClone(state.draft))[field] || []
  ).find((p) => p.id === id);
  if (!document) fail("Document not found.", 404);
  return {
    document,
    version: document._version || 0,
    status: documentStatus(state, kind, document),
    published: (state.published[field] || []).find((p) => p.id === id) || null,
    history: (state.documentHistory || [])
      .filter((h) => h.kind === kind && h.document.id === id)
      .map(({ document, ...h }) => h),
  };
}
export function mutateDocument(
  state,
  { action, kind, id, document, version, historyId },
  actor = "Owner",
) {
  const next = structuredClone(state),
    field = fieldFor(kind);
  materialize(next.draft);
  materialize(next.published);
  next.draft[field] ||= [];
  next.published[field] ||= [];
  const index = next.draft[field].findIndex((d) => d.id === id),
    current = next.draft[field][index];
  if (action === "create") {
    if (
      next.draft[field].some((d) => d.id === document?.id) ||
      next.published[field].some((d) => d.id === document?.id)
    )
      fail("This URL slug already exists.", 409);
    document = validateDocument(kind, document);
    id = document.id;
  } else {
    if (!current) fail("Document not found.", 404);
    if (version !== (current._version || 0))
      fail(
        "This document changed in another session. Reload it before saving.",
        409,
      );
  }
  if (action === "save") {
    document = validateDocument(kind, { ...document, id });
  }
  if (action === "restore") {
    const entry = (next.documentHistory || []).find(
      (h) => h.id === historyId && h.kind === kind && h.document.id === id,
    );
    if (!entry) fail("Revision not found.", 404);
    document = structuredClone(entry.document);
    if(kind==='project'&&document.industry){document.industry=canonicalIndustry(document.industry,{legacy:true})||document.industry;validateIndustry(document.industry);}
  }
  if (action === "duplicate") {
    const suffix = " — copy";
    document = validateDocument(kind, {
      ...current,
      id: id.slice(0, 113) + "-" + crypto.randomUUID().slice(0, 6),
      title: current.title.slice(0, 200 - suffix.length) + suffix,
      archived: false,
      hidden: false,
    });
    id = document.id;
    if (
      next.draft[field].some((d) => d.id === id) ||
      next.published[field].some((d) => d.id === id)
    )
      fail(
        "This URL slug already exists. Retry duplicating the document.",
        409,
      );
  }
  if (
    ![
      "create",
      "save",
      "restore",
      "duplicate",
      "publish",
      "unpublish",
      "archive",
      "recover",
    ].includes(action)
  )
    fail("Unknown action.");
  if (!["create", "save", "restore", "duplicate"].includes(action))
    document = undefined;
  const now = new Date().toISOString();
  if (current && ["save", "restore", "publish", "archive"].includes(action)) {
    next.documentHistory = [
      {
        id: crypto.randomUUID(),
        kind,
        date: now,
        actor,
        action,
        document: current,
      },
      ...(next.documentHistory || []),
    ].slice(0, 12);
    while (
      JSON.stringify(next.documentHistory).length > 650000 &&
      next.documentHistory.length > 1
    )
      next.documentHistory.pop();
  }
  let updated = {
    ...(document || current),
    managed: true,
    _version: (current?._version || 0) + 1,
    updatedAt: now,
  };
  if (action === "archive")
    updated = { ...updated, archived: true, hidden: true };
  if (action === "recover")
    updated = { ...updated, archived: false, hidden: false };
  if (["create", "duplicate"].includes(action)) next.draft[field].push(updated);
  else next.draft[field][index] = updated;
  if (action === "publish") {
    if (updated.archived) fail("Restore this document before publishing.");
    validateDocument(kind, updated);
    updated.hidden = false;
    next.draft[field][index] = updated;
    const liveIndex = next.published[field].findIndex((p) => p.id === id);
    if (liveIndex < 0) next.published[field].push(structuredClone(updated));
    else next.published[field][liveIndex] = structuredClone(updated);
    next.publishedAt = now;
  }
  if (["unpublish", "archive"].includes(action)) {
    next.published[field] = next.published[field].filter((p) => p.id !== id);
    next.publishedAt = now;
  }
  next.draft.cmsVersion = 2;
  next.published.cmsVersion = 2;
  if (action === "publish" && kind === "project") {
    for (const site of [next.draft, next.published])
      site.categories = [...disciplines];
  }
  next.draftVersion = (next.draftVersion || 0) + 1;
  next.cmsActivity = [
    {
      id: crypto.randomUUID(),
      kind,
      documentId: id,
      title: updated.title,
      action,
      actor,
      date: now,
    },
    ...(next.cmsActivity || []),
  ].slice(0, 80);
  validateSite(next.draft);
  validateSite(next.published);
  return { state: organiseMedia(next), id };
}
