import {cloud,uploadMedia} from './cloud.js';
export const categories = ["Product & AI", "Branding", "Advertising"];
export const categoryIds = ["product-ai", "branding", "advertising"];
const names = [
  "Onboarding Experience",
  "Research Agent",
  "AI Workspace",
  "Visual Identity",
  "Brand System",
  "Packaging & Touchpoints",
  "Campaign Key Visual",
  "Digital Campaign",
  "Integrated Campaign",
];
export const initialProjects = names.map((title, i) => ({
  id: title.toLowerCase().replaceAll(" & ", "-").replaceAll(" ", "-"),
  title,
  category: categories[Math.floor(i / 3)],
  cover: i,
  summary: [
    "Making complex experiences feel clear, useful and human.",
    "Building a distinctive visual language across every touchpoint.",
    "Turning a focused idea into a memorable campaign.",
  ][Math.floor(i / 3)],
  blocks: [
    {
      id: "a",
      type: "text",
      title: "The starting point",
      text: "Use this space to introduce the challenge, audience and context. This is a sample project structure, ready for your own work.",
    },
    { id: "b", type: "grid", preset: i + 1, images: [] },
    {
      id: "c",
      type: "text",
      title: "From intention to execution",
      text: "Describe your role, the decisions you made and how the design evolved. Add research, explorations and outcomes using the modular editor.",
    },
    ...(i === 0 ? [{
      id: "d",
      type: "html",
      title: "UX sample",
      html: "<main style='font-family:system-ui;padding:32px;background:#f5f6fa;color:#202632'><p style='font-size:12px;letter-spacing:.08em;text-transform:uppercase'>Prototype preview</p><h1 style='font-size:36px;margin:18px 0'>Make room for what’s next.</h1><button style='padding:12px 16px;border:1px solid #202632;background:white'>Continue</button></main>",
    }] : []),
  ],
}));

export const initialStats = [
  { id: "projects", value: "00", label: "Projects shipped", detail: "Replace with your verified total" },
  { id: "years", value: "00", label: "Years designing", detail: "Add the year your practice began" },
  { id: "disciplines", value: "03", label: "Connected disciplines", detail: "Product & AI · Branding · Advertising" },
  { id: "countries", value: "00", label: "Markets reached", detail: "Replace with your verified total" },
];

export const initialHomeSections = [
  { id: "intro", label: "Introduction carousel", visible: true },
  { id: "selected", label: "Selected work", visible: true },
  { id: "practice", label: "The practice", visible: true },
  { id: "clients", label: "Selected collaborations", visible: true },
  { id: "stats", label: "Practice counters", visible: true },
  { id: "journal", label: "Journal preview", visible: true },
  { id: "contact", label: "Contact band", visible: true },
];

export const initialClients = [
  { id: "client-1", name: "Client name", relationship: "Replace with a collaboration", image: "", url: "", visible: true },
  { id: "client-2", name: "Client name", relationship: "Replace with a collaboration", image: "", url: "", visible: true },
  { id: "client-3", name: "Client name", relationship: "Replace with a collaboration", image: "", url: "", visible: true },
  { id: "client-4", name: "Client name", relationship: "Replace with a collaboration", image: "", url: "", visible: true },
];

export const initialBlogPosts = [
  {
    id: "designing-with-constraints",
    title: "Designing with constraints",
    excerpt: "A few notes on making clear decisions when the brief is still moving.",
    date: "2026-09-12",
    category: "Notes",
    cover: 1,
    blocks: [
      { id: "intro", type: "text", title: "A smaller frame can sharpen the idea.", text: "Constraints are useful when they make the next decision visible. I use them to find the shape of a product, identity or campaign before adding more detail." },
      { id: "image", type: "image", image: "", alt: "", caption: "A working note — replace this image in Edit mode." },
      { id: "end", type: "text", title: "Keep the signal.", text: "The goal is not to remove personality. It is to give the strongest idea enough room to be understood." },
    ],
  },
  {
    id: "between-system-and-story",
    title: "Between system and story",
    excerpt: "Why a good design system needs both rules and a point of view.",
    date: "2026-08-04",
    category: "Process",
    cover: 4,
    blocks: [
      { id: "intro", type: "text", title: "Systems are a way to keep a promise.", text: "A visual system is not a collection of components. It is a shared agreement about what the work should feel like and how it should behave." },
      { id: "end", type: "text", title: "Make the rule serve the moment.", text: "The most useful systems leave a little space for the specific character of each project." },
    ],
  },
  {
    id: "the-first-screen-is-a-promise",
    title: "The first screen is a promise",
    excerpt: "A quiet interface can still make a clear promise about what comes next.",
    date: "2026-07-18",
    category: "Interface",
    cover: 6,
    blocks: [
      { id: "intro", type: "text", title: "Start with the next useful action.", text: "The opening screen sets a rhythm before it explains a feature. I look for the smallest signal that helps someone move with confidence." },
      { id: "image", type: "image", image: "", alt: "", caption: "Replace with a screen, sketch or interaction study." },
      { id: "end", type: "text", title: "Make room for the person.", text: "When the interface carries less noise, the user can bring more intent to the experience." },
    ],
  },
  {
    id: "a-better-kind-of-brief",
    title: "A better kind of brief",
    excerpt: "Questions that turn a list of deliverables into a shared direction.",
    date: "2026-06-02",
    category: "Process",
    cover: 2,
    blocks: [
      { id: "intro", type: "text", title: "The brief is a conversation.", text: "Before I draw a solution, I try to make the tensions visible: what must be true, what can change and what should remain recognisable." },
      { id: "end", type: "text", title: "Name the decision.", text: "A useful brief gives the team a decision to make, a reason to make it and a way to know when the work is doing its job." },
    ],
  },
  {
    id: "small-details-carry-the-brand",
    title: "Small details carry the brand",
    excerpt: "Identity becomes believable when its smallest touchpoints keep the same point of view.",
    date: "2026-04-21",
    category: "Identity",
    cover: 8,
    blocks: [
      { id: "intro", type: "text", title: "Consistency is felt before it is explained.", text: "A type choice, a transition and a line of copy can all carry the same character. The system works when those details agree without becoming repetitive." },
      { id: "image", type: "image", image: "", alt: "", caption: "Add a visual identity study or touchpoint here." },
      { id: "end", type: "text", title: "Give the detail a job.", text: "The best finishing touches are useful. They make an interaction clearer, a message warmer or a memory easier to keep." },
    ],
  },
];
export const addedJournalPosts = [
  {
    "id": "what-a-prototype-should-answer",
    "title": "What a prototype should answer",
    "category": "Interface",
    "excerpt": "A prototype earns its place when it helps you make a decision.",
    "date": "2026-09-19",
    "cover": 0,
    "sample": true,
    "blocks": [
      {
        "id": "intro",
        "type": "text",
        "title": "Choose one question",
        "text": "Before building a prototype, write down the uncertainty it needs to resolve. Can someone find the next action? Do they understand the consequence? Keep the interaction focused enough that the answer is visible."
      },
      {
        "id": "end",
        "type": "text",
        "title": "Test the decision, then the finish",
        "text": "A rough screen can reveal a navigation problem. A polished interaction can reveal timing and feedback problems. Choose the level of detail that matches the question."
      }
    ]
  },
  {
    "id": "designing-the-handoff-to-ai",
    "title": "Designing the handoff to AI",
    "category": "Product & AI",
    "excerpt": "Making automation legible through clear boundaries and useful feedback.",
    "date": "2026-09-19",
    "cover": 1,
    "sample": true,
    "blocks": [
      {
        "id": "intro",
        "type": "text",
        "title": "Show what happens next",
        "text": "An agent interface should explain what it will do, what information it needs and where the person can intervene. A useful preview makes a complex task easier to inspect before anything changes."
      },
      {
        "id": "end",
        "type": "text",
        "title": "Leave room for correction",
        "text": "Let people review intermediate results and revise the request. A visible history and a clear stop control help them understand the process when the result is uncertain."
      }
    ]
  },
  {
    "id": "typography-sets-the-pace",
    "title": "Typography sets the pace",
    "category": "Identity",
    "excerpt": "Size, spacing and rhythm make a page easier to read.",
    "date": "2026-09-19",
    "cover": 2,
    "sample": true,
    "blocks": [
      {
        "id": "intro",
        "type": "text",
        "title": "Give each role a job",
        "text": "A headline introduces the idea. A paragraph develops it. A caption supplies context. Define those roles before adjusting individual font sizes, so the reader can recognize the structure as they move."
      },
      {
        "id": "end",
        "type": "text",
        "title": "Read at the smallest size",
        "text": "Check the layout on a narrow screen and with longer titles. Good spacing survives content changes; a typographic system should give those changes somewhere to go."
      }
    ]
  },
  {
    "id": "from-one-idea-to-a-campaign",
    "title": "From one idea to a campaign",
    "category": "Advertising",
    "excerpt": "A repeatable idea matters more than a collection of matching layouts.",
    "date": "2026-09-19",
    "cover": 3,
    "sample": true,
    "blocks": [
      {
        "id": "intro",
        "type": "text",
        "title": "Find the sentence",
        "text": "Describe the campaign idea in one ordinary sentence. If the idea needs a full presentation to make sense, simplify it before exploring formats. That sentence becomes a useful check for each execution."
      },
      {
        "id": "end",
        "type": "text",
        "title": "Adapt to the moment",
        "text": "A poster, a social story and a landing page ask for different kinds of attention. Keep the central idea consistent while changing the pace and amount of information."
      }
    ]
  },
  {
    "id": "a-useful-design-review",
    "title": "A useful design review",
    "category": "Process",
    "excerpt": "Turn feedback into decisions by making the question clear.",
    "date": "2026-09-19",
    "cover": 4,
    "sample": true,
    "blocks": [
      {
        "id": "intro",
        "type": "text",
        "title": "Set the frame",
        "text": "Start with the audience, the task and the decision that needs feedback. Show the relevant constraints alongside the work. This gives the group a shared basis for discussing alternatives."
      },
      {
        "id": "end",
        "type": "text",
        "title": "Capture the next move",
        "text": "End with a short list of decisions, unanswered questions and owners. A review has done its job when the team can continue without guessing what was agreed."
      }
    ]
  },
  {
    "id": "space-is-part-of-the-interface",
    "title": "Space is part of the interface",
    "category": "Notes",
    "excerpt": "Empty space helps people recognize relationships and priority.",
    "date": "2026-09-19",
    "cover": 5,
    "sample": true,
    "blocks": [
      {
        "id": "intro",
        "type": "text",
        "title": "Group what belongs together",
        "text": "The distance between a label and its field tells a story. So does the gap between two sections. Use a small spacing scale to make related elements feel connected without enclosing everything in a box."
      },
      {
        "id": "end",
        "type": "text",
        "title": "Make the rhythm responsive",
        "text": "On a small screen, preserve the hierarchy while reducing unnecessary distance. Check the page with actual copy, because line wrapping changes the rhythm as much as the spacing values do."
      }
    ]
  }
];
initialBlogPosts.push(...addedJournalPosts);
export function readJournalPosts() {
 if(cloud.values["pol-blog-posts"])return structuredClone(cloud.values["pol-blog-posts"]);
 const saved = read("pol-blog-posts", initialBlogPosts);
 if (read("pol-journal-six-v1", false)) return saved;
 const merged = [...saved, ...addedJournalPosts.filter(post => !saved.some(item => item.id === post.id))];
 try { localStorage.setItem("pol-blog-posts", JSON.stringify(merged)); localStorage.setItem("pol-journal-six-v1", "true"); } catch {}
 return merged;
}
export function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll("&", "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function safeLink(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (/^\/(?![\/\\])/.test(v)) return v;
  try {
    const u = new URL(v);
    return ["https:", "http:", "mailto:", "tel:"].includes(u.protocol) ? v : "";
  } catch {
    return "";
  }
}
export function read(key, fallback) {
  if(Object.hasOwn(cloud.values,key))return structuredClone(cloud.values[key]);
  if(cloud.ready&&!cloud.allowLocal)return fallback;
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
export const presets = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  count: [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6][i],
}));
export async function optimizeImage(file, {purpose="detail", aspect=1} = {}) {
  if (!file.type.startsWith("image/")) throw Error("Please choose an image.");
  const bitmap = await createImageBitmap(file);
  const cover=purpose==="cover";const quality=cover?0.82:0.92;
  let sw=bitmap.width,sh=bitmap.height;
  if(cover){if(sw/sh>aspect)sw=sh*aspect;else sh=sw/aspect;}
  const ratio=Math.min(1,(cover?960:2560)/Math.max(sw,sh));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(sw*ratio));canvas.height=Math.max(1,Math.round(sh*ratio));
  canvas.getContext("2d").drawImage(bitmap,(bitmap.width-sw)/2,(bitmap.height-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
  bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",quality));
  if(!blob)throw Error("Image conversion failed. Please choose another image.");
  if(cloud.ready)return uploadMedia(blob,file.name.replace(/\.[^.]+$/,".webp"));
  return canvas.toDataURL("image/webp", quality);
}
