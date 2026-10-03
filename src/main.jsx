import {FilterTabs} from './FilterTabs.jsx';
import {WorkFilters} from './WorkFilters.jsx';
import {ProposalContact} from './ProposalContact.jsx';
import {previewHtml} from './cms/html-preview.js';
import {isVisibleProject} from './cms/visibility.js';
import React, { useState, useEffect } from "react";
import { DivarCategories } from "./DivarCategories";
import { ResumeProfile } from "./ResumeProfile";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { animate, inView } from "motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  Link,
  useLocation,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  Pause,
  Play,
  Plus,
  GripVertical,
  Trash2,
  Check,
  ArrowLeft,
  Settings2,
  X,
  Copy,
} from "lucide-react";
import {
  categories,
  categoryIds,
  initialProjects,
  initialStats,
  initialHomeSections,
  initialClients,
  initialBlogPosts,
  readJournalPosts,
  read,
  presets,
  optimizeImage,
} from "./data";
import "./style.css";
import { CoverManager } from "./CoverManager";
import { CredentialEditor } from "./CredentialEditor";
import { CollectionLibrary, MediaLibrary } from "./ContentLibrary";
import { VisualCopy } from "./VisualCopy";
import "./refinement.css";
import "./portfolio.css";
import "./case-system.css";
import "./discovery.css";
import {bootstrapCloud,saveCloud,cloud,uploadMedia} from "./cloud";
import { projectTags, matchesCategory, disciplines, projectDiscipline, projectIndustry } from "./project-tags.js";
import { ProjectTagsEditor } from "./ProjectTagsEditor.jsx";
import {CaseFields, CaseBrief} from "./PortfolioTools";
import { MarkdownContent, MarkdownEditor, articleTemplates, SettingsPanel, SiteMetadata } from "./StudioTools";
import { OwnerGate, Login } from "./OwnerAccess";
import { composition } from "./layouts";
import { slugify, safeLink } from "./data";
const Taxonomy = React.createContext({
  categories: [],
  categoryIds: [],
  setCategories: () => {},
});
const SortableBlock = React.lazy(() => import("./EditorMotion").then(m => ({default:m.SortableBlock})));
const SortableGroup = React.lazy(() => import("./EditorMotion").then(m => ({default:m.SortableGroup})));
const CredentialGallery = React.lazy(() => import("./CredentialGallery").then(m => ({default:m.CredentialGallery})));
const publicProjectIds = new Set(["divar", "toypet", "myom", "cafe-de-la-corte", "noghteh", "mci-5g", "airbnb-unlock-adventure", "digikala-smile-arrives-home", "flightio-ota", "afc-qatar"]);
const projectCardCovers = Object.fromEntries([...publicProjectIds].map(id => [id, {
  avif: `/projects/covers/${id}-640.avif${id === "afc-qatar" ? "?v=91da2f7c" : ""} 640w, /projects/covers/${id}-960.avif${id === "afc-qatar" ? "?v=91da2f7c" : ""} 960w`,
  webp: `/projects/covers/${id}-640.webp${id === "afc-qatar" ? "?v=91da2f7c" : ""} 640w, /projects/covers/${id}-960.webp${id === "afc-qatar" ? "?v=91da2f7c" : ""} 960w`,
  fallback: `/projects/covers/${id}-640.webp`,
}]));

function SiteMotion({ disabled = false }) {
  const location = useLocation();
  useEffect(() => {
    if (disabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const cleanups = [];
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      const revealTargets = document.querySelectorAll([
        "#main main > .page-title",
        "#main main > section",
        "#main .cards:not(.work-results) > a",
        "#main .home-project-grid > a",
        "#main .blog-grid > a",
        "#main .project-page > .project-heading",
        "#main .project-page > .project-overview",
        "#main .project-page > .text-block",
        "#main .project-page > .case-single-image",
        "#main .project-page > .composition-block",
      ].join(","));
      revealTargets.forEach((element, index) => {
        element.style.opacity = "0";
        element.style.transform = "translateY(22px)";
        const stop = inView(element, () => {
          animate(element, { opacity: 1, y: 0 }, { duration: .72, delay: Math.min(index % 4, 3) * .035, ease: [.22, 1, .36, 1] });
        }, { margin: "0px 0px -7% 0px", amount: .08 });
        cleanups.push(stop);
      });

      document.querySelectorAll("#main img").forEach(image => {
        if (image.closest("[data-editor-ui]")) return;
        if (image.closest(".work-results,.project-afc-qatar .project-overview-cover")) return;
        const host = image.closest("figure,.cover,.intro-slide-visual,.blog-cover,.blog-post-cover,.credential-cover,.project-overview-cover,.project-suggestion-cover,.client-logo-row a");
        if (!host) return;
        host.classList.add("skeleton-host");
        image.classList.add("motion-image");
        const finish = () => {
          host.classList.add("is-loaded");
          if (host.classList.contains("is-in-view")) {
            animate(image, { opacity: 1, scale: 1, filter: "blur(0px)" }, { duration: .68, ease: [.22, 1, .36, 1] });
          }
        };
        image.addEventListener("load", finish, { once: true });
        if (image.complete && image.naturalWidth) finish();
        const stop = inView(host, () => {
          host.classList.add("is-in-view");
          if (host.classList.contains("is-loaded")) finish();
        }, { margin: "120px 0px 120px 0px", amount: .01 });
        cleanups.push(() => { image.removeEventListener("load", finish); stop(); });
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); cleanups.forEach(stop => stop?.()); };
  }, [location.pathname, disabled]);
  return null;
}

function SiteBootSkeleton() {
  return <div className="site-boot" aria-label="Loading website" aria-busy="true"><div className="site-boot-header"><i/><i/><i/></div><main><div className="site-boot-title skeleton-pulse"/><div className="site-boot-copy skeleton-pulse"/><div className="site-boot-grid"><i className="skeleton-pulse"/><i className="skeleton-pulse"/><i className="skeleton-pulse"/></div></main></div>;
}
function GridPreview({ id }) {
  const { width, height, boxes } = composition(id);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {boxes.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="4" />
      ))}
    </svg>
  );
}

const PageContent = React.createContext({ pages: {}, setPages: () => {} });
const EditingPath = React.createContext(null);
function usePage() {
  const { pages } = React.useContext(PageContent),
    location = useLocation();
  const editingPath = React.useContext(EditingPath);
  return pages[editingPath || location.pathname] || {};
}
const Arrow = () => <ArrowUpRight size={18} />;
const defaultNav = [
  { id: "work", label: "Projects", to: "/work" },
  { id: "journal", label: "Journal", to: "/journal" },
  { id: "about", label: "About", to: "/about" },
  { id: "certificates", label: "Certificates", to: "/certificates" },
  { id: "contact", label: "Contact", to: "/contact", arrow: true },
];
function mergeNavigation(items){return items.filter(item=>!["/resume","/resume/"].includes(item.to||item.url)).map(item=>(item.to||item.url)==="/work"?{...item,label:"Projects"}:item);}
function SiteNavLink({ item, active }) {
  const to = safeLink(item.to||item.url) || "/";
  const props = { className: [active ? "active" : "", to.split("?")[0] === "/contact" ? "nav-contact-primary" : ""].filter(Boolean).join(" ") };
  if (!to.startsWith("/")) {
    return <a href={to} {...props} target="_blank" rel="noopener noreferrer">{item.label}{item.arrow && <ArrowUpRight size={13} />}</a>;
  }
  return <Link to={to} {...props}>{item.label}{item.arrow && <ArrowUpRight size={13} />}</Link>;
}
function PublicHeader({items}){
 const location=useLocation(),[open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[location.pathname]);
 useEffect(()=>{if(!open)return;const key=e=>{if(e.key==='Escape'){setOpen(false);document.querySelector('.nav-more')?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[open]);
 const links=mergeNavigation(items||defaultNav).filter(n=>n.visible!==false);
 return <header className="public-header"><Link className="logo" to="/" aria-label="Desartly home">Desartly<span>®</span></Link><span className="header-name">ALI KOMEILI<br/>DESIGN PORTFOLIO</span><nav className="site-navigation" aria-label="Main navigation">{links.map(item=><span className={['/work','/contact'].includes(item.to||item.url)?'nav-essential':'nav-secondary'} key={item.id||item.to}><SiteNavLink item={item} active={location.pathname===(item.to||item.url)||((item.to||item.url)!=="/"&&location.pathname.startsWith((item.to||item.url)+"/"))}/></span>)}<button className="nav-more" aria-expanded={open} aria-controls="secondary-navigation" onClick={()=>setOpen(!open)}>{open?'Close':'More'} <span aria-hidden="true">{open?'−':'+'}</span></button></nav><div id="secondary-navigation" className="secondary-navigation" hidden={!open}>{links.filter(item=>!['/work','/contact'].includes(item.to||item.url)).map(item=><SiteNavLink key={item.id||item.to} item={item} active={location.pathname===(item.to||item.url)||((item.to||item.url)!=="/"&&location.pathname.startsWith((item.to||item.url)+"/"))}/>)}</div></header>;
}
function EditableHeader({ navItems, onNavChange, onReorder, onAdd, onRemove }) {
  const [selected, setSelected] = useState(null);
  const dragIndex = React.useRef(null);
  const items = mergeNavigation(Array.isArray(navItems) ? navItems : defaultNav);
  return <header className="editor-page-header">
    <span className="logo">Desartly<span>®</span></span>
    <span className="header-name">ALI KOMEILI<br/>DESIGN PORTFOLIO</span>
    <nav>{items.map((item, i) => <div className={"inline-nav-item"+(item.to==="/contact"?" editor-contact-primary":"")} key={item.id || i}>
      <button data-editor-ui className="nav-grip" draggable onDragStart={()=>{dragIndex.current=i;}} onDragEnd={()=>{dragIndex.current=null;}} aria-label={`Reorder ${item.label}`}><GripVertical size={13}/></button>
      <span className="editor-nav-item" onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIndex.current!==null){const next=[...items];next.splice(i,0,next.splice(dragIndex.current,1)[0]);onReorder?.(next);dragIndex.current=null;}}} contentEditable suppressContentEditableWarning onBlur={e=>onNavChange?.(i,{label:e.currentTarget.innerText})}>{item.label}</span>
      <button data-editor-ui aria-label={`Link settings for ${item.label}`} onClick={()=>setSelected(selected===i?null:i)}><Settings2 size={12}/></button>
      {selected===i && <div className="inline-link-popover" data-editor-ui><label>Destination<input aria-label="Link destination" value={item.to} onChange={e=>onNavChange?.(i,{to:e.target.value})}/></label><div><button disabled={!i} onClick={()=>{const next=[...items];[next[i-1],next[i]]=[next[i],next[i-1]];onReorder?.(next);setSelected(i-1);}}>Move left</button><button disabled={i===items.length-1} onClick={()=>{const next=[...items];[next[i+1],next[i]]=[next[i],next[i+1]];onReorder?.(next);setSelected(i+1);}}>Move right</button><button onClick={()=>{onRemove?.(i);setSelected(null);}}>Remove</button></div></div>}
    </div>)}{onAdd && <button data-editor-ui onClick={onAdd} aria-label="Add menu link"><Plus size={16}/></button>}</nav>
  </header>;
}
function EditablePagePreview({ contextPath, pages, onPagePatch, navItems, onNavChange }) {
  const copy = pages[contextPath] || {};
  const defaults = {
    "/about": { eyebrow: "THE PRACTICE / DESARTLY", title: "Curiosity connects everything I do.", intro: "My practice brings together product design, AI agents, branding and communication design." },
    "/resume": { eyebrow: "RÉSUMÉ / ALI KOMEILI", title: "Design across disciplines.", intro: "Product & AI · Branding · Communication Design" },
    "/services": { eyebrow: "WAYS TO WORK TOGETHER", title: "From a first thought to a considered result.", intro: "Choose a starting point and shape the scope together." },
    "/contact": { eyebrow: "THE NEXT CONNECTION", title: "Your next idea. Let’s make it real.", intro: "Tell me what you are building, who it is for and where you need a design partner." },
    "/privacy": { eyebrow: "POL / PRIVACY", title: "Privacy, simply.", intro: "A clear note about how this portfolio handles information." },
  }[contextPath] || { eyebrow: "LIVE PAGE COPY", title: "Default page title", intro: "Add the page introduction here." };
  const patch = field => e => onPagePatch?.({ [field]: e.currentTarget.innerText });
  return <div className="page-edit-shell"><EditableHeader navItems={navItems} onNavChange={onNavChange}/><main className="page page-editable"><span className="eyebrow">{defaults.eyebrow}</span><h1 contentEditable suppressContentEditableWarning onBlur={patch("title")}>{copy.title || defaults.title}</h1><p className="lead" contentEditable suppressContentEditableWarning onBlur={patch("intro")}>{copy.intro || defaults.intro}</p><div className="page-edit-outline"><span className="eyebrow">CONTENT MODULES</span><p contentEditable suppressContentEditableWarning onBlur={patch("body")}>{copy.body || "Click any highlighted copy to edit it directly. Add your own sections and links from the workspace controls."}</p></div><Link className="button dark" to={contextPath}>Open public page <Arrow/></Link></main></div>;
}
function Art({ index = 0 }) {
  return (
    <div className={"art art-" + index}>
      {index < 3 ? (
        <div className="mini-app">
          <div className="mini-sidebar">
            <b>◈</b>
            <i />
            <i />
            <i />
          </div>
          <div className="mini-content">
            <small>
              {
                [
                  "A better first step",
                  "Your research, connected",
                  "A little more headspace",
                ][index]
              }
            </small>
            <h3>
              {
                [
                  "Make room\nfor what’s next.",
                  "Ask better.\nDiscover more.",
                  "Good morning,\nAlex.",
                ][index]
              }
            </h3>
            <div className="mini-panel">
              <span />
              <span />
              <span />
            </div>
            <div className="mini-pills">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      ) : index < 6 ? (
        <>
          <div className="brand-word">
            {["forma", "M—O", "kind."][index - 3]}
          </div>
          <div className="brand-shape" />
          <small>
            {
              [
                "A different kind of everyday.",
                "Made of possibilities.",
                "Less packaging. More purpose.",
              ][index - 3]
            }
          </small>
        </>
      ) : (
        <>
          <div className="ad-orbit" />
          <strong>
            {
              ["MAKE\nA MOVE.", "OUT OF\nOFFICE.", "THINK\nIN COLOR."][
                index - 6
              ]
            }
          </strong>
          <small>IDEAS THAT TRAVEL.</small>
          <span className="ad-sticker">↗</span>
        </>
      )}
    </div>
  );
}
function Card({ p, editable = false, onTitleChange, priority = false }) {
  const optimizedCover = !editable && !p.managed && p.coverImage?.startsWith("/projects/") && projectCardCovers[p.id];
  return (
    <Link className={"project-card" + (editable ? " is-editable" : "")} to={"/work/" + p.id} onClick={e=>{if(editable){e.preventDefault();}}}>
      <div className="cover">
        {p.coverImage ? (optimizedCover ? (
          <picture>
            <source type="image/avif" srcSet={optimizedCover.avif} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" />
            <source type="image/webp" srcSet={optimizedCover.webp} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" />
            <img src={optimizedCover.fallback} alt={p.title} width="640" height="640" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
          </picture>
        ) : (
          <img src={p.coverImage} alt={p.title} width="960" height="960" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
        )) : (
          <Art index={p.cover} />
        )}
        <span className="cover-arrow">
          <Arrow />
        </span>
      </div>
      <div className="card-meta">
        <h3 contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>{if(editable)onTitleChange?.(p.id,e.currentTarget.innerText)}}>{p.title}</h3>
        <ArrowUpRight className="card-title-arrow" size={17} strokeWidth={1.4} aria-hidden="true" />
      </div>
      <p className="project-card-summary">{p.summary}</p><div className="card-sub">
        {projectTags(p).map(tag=><span className="project-tag" key={tag}>{tag}</span>)}
      </div>
    </Link>
  );
}

function BlogCard({ post, editable = false, onChange }) {
  return (
    <Link className={"blog-card" + (editable ? " is-editable" : "")} to={`/journal/${post.id}`} onClick={e=>{if(editable)e.preventDefault();}}>
      <div className="blog-cover">{post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" decoding="async" /> : <Art index={post.cover || 0} />}</div>
      <div className="blog-card-meta"><span>{post.category || "Notes"}</span><span>{post.date}</span></div>
      <h3 contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>onChange?.(post.id,{title:e.currentTarget.innerText})}>{post.title}</h3>
      <p contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>onChange?.(post.id,{excerpt:e.currentTarget.innerText})}>{post.excerpt}</p>
      <span className="blog-read"><span>Read note</span> <ArrowUpRight size={16} /></span>
    </Link>
  );
}

function AnimatedNumber({ value, editable = false, onBlur }) {
  const raw = String(value ?? "");
  const ref = React.useRef(null);
  const [display, setDisplay] = useState(raw);
  useEffect(() => {
    const match = raw.match(/^(.*?)(\d+(?:\.\d+)?)([^\d]*)$/);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, observer;
    const finish = () => { cancelAnimationFrame(frame); setDisplay(raw); };
    if (editable || !match || preference.matches) { finish(); return; }
    const animate = () => {
      const started = performance.now(), target = Number(match[2]);
      const decimals = (match[2].split('.')[1] || '').length;
      const tick = now => {
        const progress = Math.min(1, (now - started) / 1250);
        const number = (target * (1 - (1 - progress) ** 3)).toFixed(decimals);
        setDisplay(progress === 1 ? raw : match[1] + number.padStart(match[2].length, '0') + match[3]);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { animate(); observer.disconnect(); }
    }, { threshold: .4 });
    observer.observe(ref.current);
    preference.addEventListener('change', finish);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); preference.removeEventListener('change', finish); };
  }, [raw, editable]);
  return <strong ref={ref} className="stat-value" aria-label={editable ? undefined : raw} contentEditable={editable} suppressContentEditableWarning onBlur={onBlur}>{display}</strong>;
}

function StatsBand({ stats, editable = false, onChange }) {
  const shown=editable?stats:stats.filter(stat=>Number.parseFloat(stat.value)>0);
  if(!shown.length)return null;
  return (
    <section className="stats-band" aria-label="Selected practice statistics">
      <div className="folio-section-label"><span>03 / A FEW NUMBERS</span><span>Updated as the practice grows</span></div>
      <div className="stats-grid">
        {shown.map((stat) => <article key={stat.id}><AnimatedNumber value={stat.value} editable={editable} onBlur={e=>onChange?.(stat.id,{value:e.currentTarget.innerText})}/><div><h3 contentEditable={editable} suppressContentEditableWarning onBlur={e=>onChange?.(stat.id,{label:e.currentTarget.innerText})}>{stat.label}</h3><p contentEditable={editable} suppressContentEditableWarning onBlur={e=>onChange?.(stat.id,{detail:e.currentTarget.innerText})}>{editable||!/replace|add the year/i.test(stat.detail||'')?stat.detail?.replace(/Advertising/g,'Communication Design'):""}</p></div></article>)}
      </div>
    </section>
  );
}

async function clientLogo(file) {
  if (file.size > 2000000) throw new Error("Choose a logo under 2 MB.");
  if (!file.name.toLowerCase().endsWith(".svg")) return optimizeImage(file);
  const doc = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") throw new Error("Choose a valid SVG logo.");
  doc.querySelectorAll("script,foreignObject,iframe,style,animate,set").forEach(node=>node.remove());
  doc.querySelectorAll("*").forEach(node=>Array.from(node.attributes).forEach(attr=>{
    if (/^on/i.test(attr.name) || /href$/i.test(attr.name) && !attr.value.startsWith("#") || /url\(/i.test(attr.value) && !/url\(#[^)]+\)/.test(attr.value)) node.removeAttribute(attr.name);
  }));
  const svg=new XMLSerializer().serializeToString(doc);
  if(cloud.ready)return uploadMedia(new Blob([svg],{type:"image/svg+xml"}),file.name);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function ClientsStrip({ clients, editable = false, onChange, onCollectionChange }) {
  const ref = React.useRef(null);
  const [error,setError] = useState("");
  const visible = editable ? clients : clients.filter(client => client.visible !== false && client.image);
  useEffect(()=>{
    const nodes=Array.from(ref.current?.querySelectorAll(".client-tile")||[]);
    if(editable || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("is-revealed");observer.unobserve(entry.target);}
    }),{threshold:.15});
    const tops=[...new Set(nodes.map(node=>node.offsetTop))];
    nodes.forEach(node=>{node.style.setProperty("--row-delay",Math.min(tops.indexOf(node.offsetTop),3)*100+"ms");node.classList.add("will-reveal");observer.observe(node);});
    return ()=>observer.disconnect();
  },[clients,editable]);
  if(!visible.length && !editable) return null;
  return <section className="clients-strip" ref={ref} aria-label="Client collaborations">
    <div className="folio-section-label"><span>02 / SELECTED COLLABORATIONS</span><span>Good work starts with good company.</span></div>
    <div className="client-logo-row">{visible.map(client=><div className="client-tile" key={client.id}>
      <a className="client-logo-stage" href={editable?undefined:safeLink(client.url)||undefined} aria-label={client.name}>{client.image?<img src={client.image} alt={client.name} loading="lazy"/>:<span className="logo-placeholder">Logo</span>}</a>
      {editable&&<div className="client-controls" data-editor-ui>
        <input aria-label="Client name" value={client.name} onChange={e=>onChange(client.id,{name:e.target.value})}/>
        <input aria-label="Client link" placeholder="https://" value={client.url||""} onChange={e=>onChange(client.id,{url:e.target.value})}/>
        <label>Upload SVG logo<input type="file" accept=".svg,image/svg+xml,image/png,image/webp" onChange={async e=>{try{if(e.target.files[0]){onChange(client.id,{image:await clientLogo(e.target.files[0])});setError("");}}catch(err){setError(err.message);}}}/></label>
        <button type="button" onClick={()=>onCollectionChange(clients.filter(c=>c.id!==client.id))}>Remove logo</button>
      </div>}
    </div>)}</div>
    {editable&&<div className="canvas-insert" data-editor-ui><button onClick={()=>onCollectionChange([...clients,{id:crypto.randomUUID(),name:"Client name",image:"",url:"",visible:true}])}>+ Add client logo</button><small>Square tiles · grayscale · SVG stays vector</small>{error&&<p role="alert">{error}</p>}</div>}
  </section>;
}
function Grid({ block, cover = 0 }) {
  if (block.layout === "pair") return <div className="case-image-pair">{block.images?.map((src,i)=><figure key={src}><img src={src} alt={block.alts?.[i]||"Project visual"} loading="lazy" decoding="async"/></figure>)}</div>;
  if (block.layout === "quartet") return <div className="case-image-quartet">{block.images?.map((src,i)=><figure key={src}><img src={src} alt={block.alts?.[i]||"Project visual"} loading="lazy" decoding="async"/></figure>)}</div>;
  const { width, height, boxes } = composition(Number(block.preset));
  return (
    <div
      className="composition-layout"
      style={{ aspectRatio: `${width}/${height}` }}
    >
      {boxes.map((box, i) => (
        <div
          key={i}
          style={{
            left: (box.x / width) * 100 + "%",
            top: (box.y / height) * 100 + "%",
            width: (box.w / width) * 100 + "%",
            height: (box.h / height) * 100 + "%",
          }}
        >
          {block.images?.[i] ? (
            <img src={block.images[i]} alt={block.alts?.[i] || "Project composition " + (i + 1)} loading="lazy" decoding="async" />
          ) : (
            <Art index={(cover + i) % 9} />
          )}
        </div>
      ))}
    </div>
  );
}
function HtmlPreview(props) {
  if (props.block.component === "divar-categories") return <DivarCategories />;
  return <HtmlFrame {...props} />;
}
function HtmlFrame({ block, editable = false, onChange, onTitleChange }) {
  const frameRef = React.useRef(null);
  const [frameHeight, setFrameHeight] = useState(() => window.matchMedia("(max-width:700px)").matches ? (block.mobileHeight || 640) : (block.previewHeight || 640));
  useEffect(() => {
    if (!block.autoHeight) return;
    const resize = event => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.type !== "desartly:preview-size") return;
      const height = Number(event.data.height);
      if (Number.isFinite(height) && height >= 100 && height <= 16000) setFrameHeight(Math.ceil(height) + (block.scrollSync ? 2 : 0));
    };
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, [block.autoHeight, block.scrollSync]);
  useEffect(() => {
    if (!block.scrollSync) return;
    let frame = 0;
    const send = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = frameRef.current;
        if (!node) return;
        node.contentWindow?.postMessage({type:"desartly:preview-viewport", top:-node.getBoundingClientRect().top, height:window.innerHeight}, "*");
      });
    };
    const message = event => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "desartly:preview-ready") send();
      if (event.data?.type === "desartly:preview-scroll") {
        const top = Number(event.data.top);
        const node = frameRef.current;
        if (!node || !Number.isFinite(top) || top < 0 || top > node.clientHeight) return;
        window.scrollTo({top:window.scrollY + node.getBoundingClientRect().top + top - 24, behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
      }
    };
    window.addEventListener("scroll", send, {passive:true});
    window.addEventListener("resize", send);
    window.addEventListener("message", message);
    send();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", send); window.removeEventListener("resize", send); window.removeEventListener("message", message); };
  }, [block.scrollSync]);
  const html = block.html || "<main style='font-family:system-ui;padding:32px;background:#f5f6fa;color:#202632'><p style='font-size:12px;letter-spacing:.08em;text-transform:uppercase'>HTML sample</p><h1 style='font-size:36px;margin:18px 0'>Your UX prototype lives here.</h1><button style='padding:12px 16px;border:1px solid #202632;background:white'>Try the interaction</button></main>";
  return <section className={"html-block" + (editable ? " html-block-editor" : "")}>
    {editable && <><label className="html-upload" data-editor-ui>Upload HTML file<input type="file" accept=".html,.htm,text/html" onChange={async e => { const file=e.target.files?.[0]; if (!file) return; if(file.size>2000000){e.target.setCustomValidity("Choose an HTML file under 2 MB.");e.target.reportValidity();return;} onChange?.(await file.text()); }}/></label><input className="html-block-title" aria-label="HTML sample title" value={block.title || "UX sample"} onChange={e=>onTitleChange?.(e.target.value)} /><textarea aria-label="HTML sample source" value={html} onChange={e=>onChange?.(e.target.value)} spellCheck={false} /></>}
    <iframe ref={frameRef} loading={block.scrollSync ? "eager" : "lazy"} scrolling={block.autoHeight?"no":undefined} className={block.autoHeight?"auto-height-preview":undefined} style={block.autoHeight?{height:frameHeight}:undefined} title={block.title || "HTML UX sample"} sandbox="allow-scripts" srcDoc={previewHtml(html,block.autoHeight)} />
  </section>;
}
function Footer() {
  const {pages,setPages}=React.useContext(PageContent);
  const editable=React.useContext(EditingPath)!==null;
  const defaults={description:"Desartly · A practice across disciplines.",copyright:`© ${new Date().getFullYear()} Desartly`,items:[{id:"services",label:"Services",url:"/services"},{id:"journal",label:"Journal",url:"/journal"},{id:"privacy",label:"Privacy",url:"/privacy"}]};
  const footer={...defaults,...pages["/site"]?.footer};
  const patch=values=>setPages(current=>({...current,"/site":{...current["/site"],footer:{...footer,...values}}}));
  const patchItem=(id,values)=>patch({items:footer.items.map(item=>item.id===id?{...item,...values}:item)});
  return <footer className="desartly-footer">
    <div className="personal-colophon"><img src="/brand/samurai/pencil.webp" alt="" width="96" height="96"/><span>Selected work by <Link to="/about">Ali Komeili</Link><small>Desartly is my independent design portfolio.</small></span></div>
    <Link to="/" className="logo">Desartly<span>®</span></Link>
    <p contentEditable={editable} suppressContentEditableWarning onBlur={e=>patch({description:e.currentTarget.innerText})}>{footer.description}</p>
    <div className="footer-items">{footer.items.map((item,index)=><div className="footer-item" key={item.id}>
      {editable?<><span contentEditable suppressContentEditableWarning onBlur={e=>patchItem(item.id,{label:e.currentTarget.innerText})}>{item.label}</span><div className="footer-item-tools" data-editor-ui><input aria-label="Footer link destination" placeholder="Link (optional)" value={item.url||""} onChange={e=>patchItem(item.id,{url:e.target.value})}/><button aria-label="Move footer item up" disabled={!index} onClick={()=>{const items=[...footer.items];[items[index-1],items[index]]=[items[index],items[index-1]];patch({items});}}>↑</button><button aria-label="Remove footer item" onClick={()=>patch({items:footer.items.filter(i=>i.id!==item.id)})}>×</button></div></>:safeLink(item.url)?<a href={safeLink(item.url)}>{item.label}</a>:<span>{item.label}</span>}
    </div>)}{editable&&<button data-editor-ui onClick={()=>patch({items:[...footer.items,{id:crypto.randomUUID(),label:"New item",url:""}]})}>+ Add footer item</button>}</div>
    <small contentEditable={editable} suppressContentEditableWarning onBlur={e=>patch({copyright:e.currentTarget.innerText})}>{footer.copyright}</small>
  </footer>;
}
function Home({ projects, stats = initialStats, clients = initialClients, blogPosts = initialBlogPosts, homeSections = initialHomeSections, editable = false, onPagePatch, onProjectTitleChange, onStatsChange, onClientChange, onClientsChange, onBlogChange, pageOverride, onSectionsChange, onCoverChange, onFeaturedChange, onFeaturedOrder }) {
  const routedPage = usePage();
  const page = pageOverride || routedPage;
  const { categories, categoryIds, setCategories } = React.useContext(Taxonomy);
  const selected = [...new Map([
    ...(page.selectedProjects || []).map(id => projects.find(project => project.id === id)).filter(Boolean),
    ...categories.map(category => projects.find(project => matchesCategory(project, category))).filter(Boolean),
    ...projects,
  ].map(project => [project.id, project])).values()].slice(0, 3);
  const [slideIndex, setSlideIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = () => { if (preference.matches) setAutoPlay(false); };
    document.addEventListener("visibilitychange", onVisibility);
    preference.addEventListener("change", onPreference);
    return () => { document.removeEventListener("visibilitychange", onVisibility); preference.removeEventListener("change", onPreference); };
  }, []);
  const rotating = !editable && autoPlay && !hovered && !focused && pageVisible && selected.length > 1;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setSlideIndex(i => (i + 1) % selected.length), 5000);
    return () => window.clearTimeout(timer);
  }, [rotating, slideIndex, selected.length]);
  const touchStart = React.useRef(null);
  const activeIndex = selected.length ? slideIndex % selected.length : 0;
  const activeProject = selected[activeIndex];
  const moveSlide = delta => setSlideIndex(current => (current + delta + selected.length) % Math.max(1, selected.length));
  const sectionMap = {
    intro: <section className="folio-intro">
      <div className="folio-kicker"><span className="eyebrow">ALI KOMEILI / INDEPENDENT DESIGNER</span><span>Desartly · Portfolio</span></div>
      <div className="intro-slider" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}} role="region" aria-roledescription="carousel" aria-label="Introduction to my design practice" onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==="ArrowRight"){e.preventDefault();moveSlide(1)}if(e.key==="ArrowLeft"){e.preventDefault();moveSlide(-1)}}} tabIndex={0} onTouchStart={e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{if(!touchStart.current)return;const dx=e.changedTouches[0].clientX-touchStart.current.x,dy=e.changedTouches[0].clientY-touchStart.current.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))moveSlide(dx<0?1:-1);touchStart.current=null}}>
        <div className="intro-slide-copy"><span className="eyebrow hero-discipline"><i aria-hidden="true"/> PRODUCT · BRANDING · COMMUNICATION</span><EditableHeading first={page.title ?? "Useful products."} second={page.subtitle ?? "Distinct identities."} editable={editable} label="Hero heading" onChange={(title,subtitle)=>onPagePatch?.({title,subtitle})}/><p contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>onPagePatch?.({intro:e.currentTarget.innerText})}>{(page.intro || "I’m Ali, an independent designer creating digital products, brand identities and communication—from campaigns to packaging.").replace(/branding and advertising/gi,"branding and communication design")}</p><div className="hero-actions"><Link to="/work" className="hero-work">View all projects <ArrowUpRight size={18}/></Link><Link to="/contact" className="hero-contact">Request a proposal <ArrowRight size={18}/></Link></div><div className="hero-signature" aria-hidden="true"><img className="samurai-signature" src="/brand/samurai/drawing.webp" alt="" width="112" height="112"/><span>Ali Komeili<br/>Focus. Precision. Character.</span><svg viewBox="0 0 64 64"><path d="M32 4v56M4 32h56M12 12l40 40M12 52l40-40"/></svg></div></div>
        {activeProject && <Link className="intro-slide-visual" to={"/work/"+activeProject.id} onClick={e=>{if(editable)e.preventDefault();}} aria-label={"Explore "+activeProject.title} key={activeProject.id}>{activeProject.coverImage ? <img src={activeProject.coverImage} alt={activeProject.title} decoding="async"/> : <Art index={activeProject.cover}/>}<span className="hero-project-index" aria-hidden="true">FEATURED / {String(activeIndex+1).padStart(2,"0")}</span><span className="intro-slide-caption"><span>{projectDiscipline(activeProject)}</span><span>{activeProject.title} <ArrowUpRight size={17}/></span></span></Link>}
        <div className="intro-slider-controls"><div className="intro-slide-tabs">{selected.map((project,i)=><button key={project.id} onClick={()=>setSlideIndex(i)} aria-label={"Show slide "+(i+1)+": "+projectDiscipline(project)} aria-pressed={i===activeIndex}><span>{String(i+1).padStart(2,"0")}</span><span>{projectDiscipline(project)}</span></button>)}</div><div className="intro-slide-arrows"><button aria-label={autoPlay ? "Pause slideshow" : "Play slideshow"} onClick={()=>setAutoPlay(v=>!v)}>{autoPlay ? <Pause size={16}/> : <Play size={16}/>}</button><button aria-label="Previous introduction slide" onClick={()=>moveSlide(-1)} disabled={selected.length<2}><ArrowLeft size={18}/></button><button aria-label="Next introduction slide" onClick={()=>moveSlide(1)} disabled={selected.length<2}><ArrowRight size={18}/></button></div><span className="sr-only" aria-live={rotating ? "off" : "polite"}>{activeProject ? `Slide ${activeIndex+1} of ${selected.length}: ${projectDiscipline(activeProject)}` : ""}</span></div>
      </div>
    </section>,
    selected: <section className="folio-selected" id="selected-work">
      <div className="folio-section-label"><img className="samurai-peek" src="/brand/samurai/peek.webp" alt="" width="100" height="100"/><span>01 / SELECTED WORK</span><Link to="/work"><span>All projects</span> <Arrow/></Link></div>
      <div className="portfolio-section-heading"><h2>Selected projects.</h2><p>Product & AI · Branding · Communication Design</p></div>
      {editable ? <SortableGroup axis="x" className="cards home-project-grid editable-cards" values={selected} onReorder={order=>onFeaturedOrder?.(order.map(p=>p.id))}>{selected.map(p=><SortableBlock key={p.id} value={p}>{controls=><><button className="card-drag-handle drag-handle" data-editor-ui aria-label={`Reorder ${p.title}`} onPointerDown={e=>controls.start(e)}><GripVertical size={15}/> Move card</button><Card p={p}/></>}</SortableBlock>)}</SortableGroup> : <div className="cards home-project-grid">{selected.map(p=><Card key={p.id} p={p}/>)}</div>}
    </section>,
    practice: <section className="folio-perspective"><div><span className="eyebrow">02 / THE PRACTICE</span><EditableHeading as="h2" first={page.practiceTitle ?? "Clarity in thinking."} second={page.practiceSubtitle ?? "Character in the details."} editable={editable} label="Practice heading" onChange={(practiceTitle,practiceSubtitle)=>onPagePatch?.({practiceTitle,practiceSubtitle})}/><Link to="/about" onClick={e=>{if(editable)e.preventDefault();}}><span>A little about me</span> <Arrow/></Link></div><div className="folio-disciplines">{categories.map((c,i)=><Link key={c} to={"/work?category="+categoryIds[i]} onClick={e=>{if(editable)e.preventDefault();}}><small>0{i+1}</small><div><h3 contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={()=>{}}>{c}</h3><p contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>onPagePatch?.({[`practiceDescription${i}`]:e.currentTarget.innerText})}>{page[`practiceDescription${i}`] || ["Useful interfaces and intelligent workflows, shaped around people.","A coherent identity, from the first impression to the smallest detail.","Advertising, packaging and every touchpoint that brings a brand to life."][i] || "An evolving part of my design practice."}</p></div><Arrow/></Link>)}</div></section>,
    clients: <ClientsStrip clients={clients} editable={editable} onChange={onClientChange} onCollectionChange={onClientsChange}/>,
    stats: <StatsBand stats={stats} editable={editable} onChange={onStatsChange}/>,
    journal: <section className="journal-preview"><div className="folio-section-label"><span>04 / FIELD NOTES</span><Link to="/journal" onClick={e=>{if(editable)e.preventDefault();}}><span>All notes</span> <Arrow/></Link></div><div className="blog-grid">{blogPosts.slice(0, 2).map(post => <BlogCard key={post.id} post={post}/>)}</div></section>,
    contact: <ContactBand editable={editable} page={page} onPatch={onPagePatch}/>,
  };
  const normalizedSections = (homeSections?.length ? homeSections : initialHomeSections).map(section => typeof section === "string" ? { id: section, visible: true } : section);
  const patchSection = (id, values) => onSectionsChange?.(normalizedSections.map(section=>section.id===id?{...section,...values}:section));
  const renderSection = section => sectionMap[section.id] || (section.type === 'html' ? <HtmlPreview block={section} editable={editable} onChange={html=>patchSection(section.id,{html})} onTitleChange={title=>patchSection(section.id,{title})}/> : section.type === 'image' ? <figure className="custom-image"><img src={section.image || undefined} alt={section.title || ''}/>{editable && <input data-editor-ui type="file" accept="image/*" onChange={async e=>{if(e.target.files[0])patchSection(section.id,{image:await optimizeImage(e.target.files[0])});}}/>}<figcaption contentEditable={editable} suppressContentEditableWarning onBlur={e=>patchSection(section.id,{title:e.currentTarget.innerText})}>{section.title}</figcaption></figure> : <section className="blog-copy"><h2 contentEditable={editable} suppressContentEditableWarning onBlur={e=>patchSection(section.id,{title:e.currentTarget.innerText})}>{section.title}</h2><p contentEditable={editable} suppressContentEditableWarning onBlur={e=>patchSection(section.id,{text:e.currentTarget.innerText})}>{section.text}</p></section>);
  if (!editable) return <main className="folio-home">{normalizedSections.filter(s=>s.visible!==false).map(section=><React.Fragment key={section.id}>{renderSection(section)}</React.Fragment>)}</main>;
  return <main className="folio-home home-canvas"><SortableGroup axis="y" values={normalizedSections} onReorder={onSectionsChange}>{normalizedSections.map((section,index)=><SortableBlock key={section.id} value={section}>{controls=><div className={section.visible===false?'canvas-section is-hidden':'canvas-section'}><div className="canvas-section-tools" data-editor-ui><button className="drag-handle" aria-label={`Drag ${section.label || section.type}`} onPointerDown={e=>controls.start(e)}><GripVertical size={16}/></button><strong>{section.label || section.type}</strong><button disabled={index===0} onClick={()=>{const next=[...normalizedSections];[next[index-1],next[index]]=[next[index],next[index-1]];onSectionsChange(next);}}>↑</button><button disabled={index===normalizedSections.length-1} onClick={()=>{const next=[...normalizedSections];[next[index+1],next[index]]=[next[index],next[index+1]];onSectionsChange(next);}}>↓</button><button onClick={()=>patchSection(section.id,{visible:section.visible===false})}>{section.visible===false?'Show':'Hide'}</button>{section.type && <button onClick={()=>onSectionsChange(normalizedSections.filter(s=>s.id!==section.id))}>Remove</button>}</div>{renderSection(section)}{section.id==='intro' && activeProject && onCoverChange && <div className="canvas-insert" data-editor-ui><label>Replace square cover<input type="file" accept="image/*" onChange={async e=>{if(e.target.files[0])onCoverChange?.(activeProject.id,await optimizeImage(e.target.files[0],{purpose:"cover",aspect:1}));}}/></label></div>}{section.id==='selected' && <div className="canvas-insert" data-editor-ui>{selected.map((project,i)=><label key={i}>Card {i+1}<select aria-label={`Featured card ${i+1}`} value={project.id} onChange={e=>onFeaturedChange?.(i,e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>)}</div>}</div>}</SortableBlock>)}</SortableGroup><div className="canvas-insert" data-editor-ui><span>Add a section</span>{['text','image','html'].map(type=><button key={type} onClick={()=>onSectionsChange([...normalizedSections,{id:crypto.randomUUID(),type,visible:true,title:'New section',text:'Write here.'}])}><Plus size={14}/>{type === 'html'?'HTML prototype':type}</button>)}</div></main>;
}
function EditableHeading({as:Tag="h1", first, second, editable, onChange, label="Heading"}) {
  const value=[first,second].filter(Boolean).join("\n");
  return <Tag className="unified-heading" contentEditable={editable} suppressContentEditableWarning role={editable?"textbox":undefined} aria-label={editable?label:undefined} aria-multiline={editable?true:undefined} onBlur={e=>{if(editable){const [first,...rest]=e.currentTarget.innerText.split("\n");onChange?.(first,rest.join("\n"));}}}>{value}</Tag>;
}
function ContactBand({ editable = false, page = {}, onPatch }) {
 const patch = field => e => onPatch?.({ [field]: e.currentTarget.innerText });
 return <section className="contact-band folio-contact compact-contact samurai-invitation">
   <div className="contact-signal" aria-hidden="true"><span className="signal-orbit"/><span className="signal-cut"/><span className="signal-caption">間 / MA<br/>SPACE FOR THE NEXT MOVE</span></div>
   <div className="contact-invitation"><span className="eyebrow">WORK WITH ALI KOMEILI</span><EditableHeading as="h2" first={page.contactTitle ?? "A clear brief."} second={page.contactSubtitle ?? "A considered next move."} editable={editable} label="Contact heading" onChange={(contactTitle,contactSubtitle)=>onPatch?.({contactTitle,contactSubtitle})}/><p contentEditable={editable} suppressContentEditableWarning onBlur={patch("contactNote")}>{page.contactNote || "Share the idea. I’ll help shape the direction."}</p></div>
   <Link to="/contact" className="portfolio-action contact-primary" onClick={e=>{if(editable)e.preventDefault();}}><span>Request a proposal</span><Arrow/></Link>
 </section>;
}

function Journal({ blogPosts }) {
  const page = usePage();
  const [params, setParams] = useSearchParams();
  const activeTopic = params.get("topic") || "all";
  const query = params.get("q") || "";
  const topicLabels = Array.from(new Set(blogPosts.map(post => post.category || "Notes")));
  const topics = [{ id: "all", label: "All notes" }, ...topicLabels.map(label => ({ id: slugify(label), label }))];
  const visiblePosts = blogPosts.filter(post => (activeTopic === "all" || slugify(post.category || "Notes") === activeTopic) && `${post.title} ${post.excerpt}`.toLowerCase().includes(query.toLowerCase()));
  const countFor = topic => topic.id === "all" ? blogPosts.length : blogPosts.filter(post => slugify(post.category || "Notes") === topic.id).length;
  const chooseTopic = topic => setParams({...query ? {q:query} : {},...topic.id === "all" ? {} : {topic:topic.id}});
  return <main className="page journal-page">
    <div className="page-title"><span className="eyebrow">THE JOURNAL / {blogPosts.length} NOTES</span><h1>{page.title || "Notes from the practice."}</h1><p>{page.intro || "Small observations on product thinking, visual systems and the work between."}</p></div>
    <section className="journal-discovery" aria-label="Filter journal">
      <div className="work-explorer-top"><span className="work-explorer-label">FIELD NOTES</span><span className="work-explorer-result" role="status">{visiblePosts.length} notes{(query||activeTopic!=='all')&&<button onClick={()=>setParams({})}>Clear filters</button>}</span></div>
      <div className="work-explorer-controls"><FilterTabs label="Journal topics" value={activeTopic} onChange={id=>chooseTopic({id})} items={topics.map(t=>({...t,count:countFor(t)}))}/>
      <label className="journal-discovery-search"><span>Search the journal</span><input type="search" aria-label="Search notes" placeholder="An idea, a topic…" value={query} onChange={e=>setParams({...activeTopic === "all" ? {} : {topic:activeTopic},...e.target.value ? {q:e.target.value} : {}},{replace:true})}/></label></div>
    </section>
    <div className="journal-layout journal-layout-full">
      <div className="blog-grid blog-list">{visiblePosts.length ? visiblePosts.map(post => <BlogCard key={post.id} post={post}/>) : <p className="empty-state">No notes in this topic yet.</p>}</div>
    </div>
  </main>;
}

function BlogPost({ blogPosts }) {
  const { slug } = useParams();
  const post = blogPosts.find(item => item.id === slug);
  if (!post) return <NotFound />;
  return <main className="blog-post-page"><Link className="back" to="/journal"><ArrowLeft size={16}/> All notes</Link><div className="blog-post-heading"><span className="eyebrow">{post.category || "NOTES"} / {post.date}</span><h1>{post.title}</h1><p>{post.excerpt}</p></div>{(post.heroImage||post.coverImage)&&<div className="blog-post-cover"><img src={post.heroImage||post.coverImage} alt={post.title} decoding="async" /></div>}{(post.blocks || []).map(block => block.type === "markdown" ? <section className="blog-copy" key={block.id}><MarkdownContent source={block.markdown}/></section> : block.type === "html" ? <HtmlPreview key={block.id} block={block}/> : ["grid","composition"].includes(block.type) ? <Grid key={block.id} block={block}/> : block.type === "image" ? <figure className="blog-image" key={block.id}>{block.image ? <img src={block.image} alt={block.alt || ""}/> : <Art index={(post.cover || 0)+1}/>}<figcaption>{block.caption}</figcaption></figure> : <section className="blog-copy" key={block.id}><h2>{block.title}</h2><p>{block.text}</p></section>)}</main>;
}
function BlogEditorBlocks({ blocks = [], onPatch, onMove, onRemove, onUpload, onReorder }) {
  return <SortableGroup axis="y" values={blocks} onReorder={onReorder} className="blog-editor-blocks">{blocks.map((block, index) => <SortableBlock value={block} key={block.id}>{controls => <>
    <div className="blog-block-controls" data-editor-ui><button className="drag-handle" aria-label="Drag note block" onPointerDown={e=>controls.start(e)}><GripVertical size={16}/></button><span>{String(index + 1).padStart(2, "0")} / {block.type.toUpperCase()}</span><button type="button" aria-label="Move note block up" disabled={index === 0} onClick={() => onMove(index, -1)}>↑</button><button type="button" aria-label="Move note block down" disabled={index === blocks.length - 1} onClick={() => onMove(index, 1)}>↓</button><button type="button" aria-label="Delete note block" onClick={() => onRemove(block.id)}><Trash2 size={13}/></button></div>
    {block.type === "markdown" ? <MarkdownEditor value={block.markdown||""} onChange={markdown=>onPatch(block.id,{markdown})}/> : block.type === "html" ? <HtmlPreview block={block} editable onChange={html=>onPatch(block.id,{html})} onTitleChange={title=>onPatch(block.id,{title})}/> : block.type === "image" ? <figure className="blog-image"><div className="blog-image-placeholder">{block.image ? <img src={block.image} alt={block.alt || ""}/> : <span>Image block</span>}<input type="file" accept="image/*" aria-label="Blog image" onChange={e=>onUpload(block.id,e)}/></div><input className="blog-image-alt" aria-label="Blog image alt text" value={block.alt || ""} onChange={e=>onPatch(block.id,{alt:e.target.value})} placeholder="Describe the image for accessibility"/><figcaption contentEditable suppressContentEditableWarning onBlur={e=>onPatch(block.id,{caption:e.currentTarget.innerText})}>{block.caption}</figcaption></figure> : <section className="blog-copy"><h2 contentEditable suppressContentEditableWarning onBlur={e=>onPatch(block.id,{title:e.currentTarget.innerText})}>{block.title}</h2><p contentEditable suppressContentEditableWarning onBlur={e=>onPatch(block.id,{text:e.currentTarget.innerText})}>{block.text}</p></section>}
  </>}</SortableBlock>)}</SortableGroup>;
}
function PageModules({blocks = [], onChange}) {
  const patch = (id, values) => onChange(blocks.map(block=>block.id===id?{...block,...values}:block));
  if (!onChange) return <div className="page-modules">{blocks.map(block=>block.type==='markdown'?<section className="blog-copy" key={block.id}><MarkdownContent source={block.markdown}/></section>:block.type==='html'?<HtmlPreview key={block.id} block={block}/>:block.type==='image'?<figure className="blog-image" key={block.id}>{block.image && <img src={block.image} alt={block.alt||''}/>}<figcaption>{block.caption}</figcaption></figure>:<section className="blog-copy" key={block.id}><h2>{block.title}</h2><p>{block.text}</p></section>)}</div>;
  return <div className="page-modules"><BlogEditorBlocks blocks={blocks} onPatch={patch} onReorder={onChange} onRemove={id=>onChange(blocks.filter(b=>b.id!==id))} onMove={(i,d)=>{const next=[...blocks];[next[i+d],next[i]]=[next[i],next[i+d]];onChange(next);}} onUpload={async(id,e)=>{if(e.target.files[0])patch(id,{image:await optimizeImage(e.target.files[0])});}}/><div className="canvas-insert" data-editor-ui><span>Add a module</span>{['text','image','html','markdown'].map(type=><button key={type} onClick={()=>onChange([...blocks,{id:crypto.randomUUID(),type,title:'New section',text:'Write here.',caption:'',html:''}])}><Plus size={14}/>{type==='html'?'HTML file / prototype':type}</button>)}</div></div>;
}
function Work({ projects }) {
  const reducedMotion = useReducedMotion();
  const page = usePage();
  const { categories } = React.useContext(Taxonomy);
  const [params, setParams] = useSearchParams();
  const active = params.get("category") === "advertising" ? "communication-design" : params.get("category");
  const visibleCategories = disciplines;
  const industry = params.get("industry");
  const disciplineProjects = projects.filter(p=>!active||slugify(projectDiscipline(p))===active);
  const industries = [...new Set(disciplineProjects.map(projectIndustry).filter(Boolean))].sort();
  useEffect(() => { const previous=document.title; document.title="Projects — Desartly"; return () => { document.title=previous; }; }, []);
  return (
    <main className="page">
      <div className="page-title work-title-with-samurai">
        <img className="samurai-edge" src="/brand/samurai/edge-hang.webp" alt="" width="140" height="140" aria-hidden="true"/>
        <span className="eyebrow">
          THE PORTFOLIO / {projects.length} PROJECTS
        </span>
        <h1>{page.title || "Projects"}</h1>
        <p>
          {page.intro ||
            "Product thinking. Visual identities. Ideas that move."}
        </p>
      </div>
      <WorkFilters projects={projects} active={active} industry={industry} setParams={setParams}/>
      {!disciplineProjects.some(p=>!industry||slugify(projectIndustry(p))===industry)&&<p className="filter-empty">No projects in this selection. <button onClick={()=>setParams({})}>View all projects</button></p>}
      <AnimatePresence mode="wait" initial={false}>
      <motion.div key={(active || "all")+(industry||"")} className="cards work-results"
        initial={{ opacity: reducedMotion ? 1 : 0 }}
        animate={{ opacity: 1, transition: { duration: reducedMotion ? 0 : .18, ease: "easeOut" } }}
        exit={{ opacity: reducedMotion ? 1 : 0, transition: { duration: reducedMotion ? 0 : .1, ease: "easeIn" } }}>
        {projects
          .filter(
            (p) =>
              (!active || slugify(projectDiscipline(p)) === active) && (!industry || slugify(projectIndustry(p)) === industry),
          )
          .map((p, index) => (
            <Card key={p.id} p={p} priority={index < 3} />
          ))}
      </motion.div>
      </AnimatePresence>
    </main>
  );
}
function Project({ projects }) {
  const { slug } = useParams();
  const p = projects.find((p) => p.id === slug);
  if (!p) return <NotFound />;
  const hasBrief = [p.challenge,p.role,p.deliverables,p.outcome,p.credits].some(value=>value?.trim());
  const suggestions = [
    ...projects.filter(item=>isVisibleProject(item)&&item.id!==p.id&&projectTags(item).some(tag=>projectTags(p).includes(tag))),
    ...projects.filter(item=>isVisibleProject(item)&&item.id!==p.id&&!projectTags(item).some(tag=>projectTags(p).includes(tag))),
  ].slice(0,2);
  return (
    <main className={`project-page project-${p.id}`}>
      <Link className="back" to="/work">
        <ArrowLeft size={16} /> All projects
      </Link>
      <div className="project-heading">
        <span className="eyebrow">
          {projectTags(p).join(" / ")}
        </span>
        <h1>{p.title}</h1>
        <p>{p.summary}</p>
      </div>
      <CaseBrief project={p} withCover/>
      {!hasBrief&&<div className="project-facts">
        <div>
          <small>DISCIPLINE</small>
          <p>{projectTags(p).join(" / ")}</p>
        </div>
        <div>
          <small>STATUS</small>
          <p>{p.sample === false ? "Real project" : "Concept study"}</p>
        </div>

      </div>}
      {p.blocks.filter(b=>b.type!=='text'||(b.text?.trim()&&!/Use this space|Describe your role|Write here\./.test(b.text))).map((b) =>
        b.type === "text" ? (
          <section className={"text-block"+((!b.layout||b.layout==="chapter")?" case-chapter":b.layout==="statement"?" case-statement":b.layout==="interlude"?" case-interlude":b.layout==="note"?" case-note":"")} key={b.id}>
            <div>{b.chapter&&<span className="eyebrow">{b.chapter}</span>}<h2>{b.title}</h2></div>
            <p>{b.text}</p>
          </section>
        ) : b.type === "image" ? (
          <figure className={"case-single-image"+(b.layout==="portrait"?" case-portrait":b.layout==="offset"?" case-offset":"")} key={b.id}>{b.title&&<h2 className="case-image-heading">{b.title}</h2>}<img src={b.image} alt={b.alt||b.caption||"Project detail"} loading="lazy" style={b.aspectRatio?{aspectRatio:b.aspectRatio,objectFit:b.fit||"cover"}:undefined}/></figure>
        ) : b.type === "markdown" ? <MarkdownContent source={b.markdown} key={b.id}/> : b.type === "html" ? (
          <HtmlPreview block={b} key={b.id} />
        ) : (
          <section className="composition-block" key={b.id}>
            <Grid block={b} cover={p.cover} />
          </section>
        ),
      )}
      {p.relatedNote&&<Link className="related-note" to={"/journal/"+p.relatedNote}>Read the thinking behind this work <Arrow/></Link>}
      {suggestions.length>0&&<section className="project-suggestions" aria-label="More projects"><div className="project-suggestions-heading"><small>KEEP EXPLORING</small><span>{suggestions.length} SELECTED PROJECTS</span></div><div className="project-suggestion-grid">{suggestions.map(item=><Link className="project-suggestion-card" to={"/work/"+item.id} key={item.id}><div className="project-suggestion-cover">{item.coverImage?<img src={item.coverImage} alt="" loading="lazy" decoding="async"/>:<Art index={item.cover}/>}</div><div className="project-suggestion-copy"><small>{projectTags(item).join(" / ")}</small><div><h2>{item.title}</h2><ArrowUpRight size={22}/></div><p>{item.summary}</p></div></Link>)}</div></section>}
      <ContactBand/>
    </main>
  );
}
function About() {
  const page = usePage();
  return (
    <main className="page about">
      <span className="eyebrow">ALI KOMEILI / THE PRACTICE</span>
      <h1>
        {page.title || (
          <>
            <span>Curiosity connects</span>
            <br />
            <span>everything I do.</span>
          </>
        )}
      </h1>
      <div className="about-grid">
        <div className="portrait-art">
          <img src="/brand/samurai/drawing.webp" alt="The scribbled samurai, Ali Komeili’s personal design character" width="400" height="400"/><small>Ali Komeili<br/>Designer · Desartly</small>
        </div>
        <div>
          <h2>
            <span>I’m Ali Komeili.</span>
            <br /><span>I think in systems.</span>
            <br /><span>I care about the details.</span>
          </h2>
          <p>
            My practice brings together product design, AI agents, branding and
            advertising. I’m interested in the space where a useful experience
            meets a distinct visual voice.
          </p>
          <p>
            I’m open to joining thoughtful teams and collaborating on
            independent projects.
          </p>
          <Link className="portfolio-action" to="/about#resume">
            <span>View resume</span> <Arrow />
          </Link>
        </div>
      </div>
      <Resume embedded/>
      <Link className="about-certificates-card" to="/certificates">
        <div><span className="eyebrow">CONTINUING THE PRACTICE</span><h2>Learning, with proof.</h2><p>Explore my certificates in design, creative technology and human-centred experiences.</p><span className="certificate-card-action">View my certificates <Arrow /></span></div>
        <div className="certificate-card-art" aria-hidden="true"><span>AK</span><span>DESIGN / LEARNING</span><span>↗</span></div>
      </Link>
      <ContactBand />
    </main>
  );
}
function Resume({embedded=false}) {
  const {pages}=React.useContext(PageContent);const page=pages["/resume"]||{};const Tag=embedded?"section":"main";const Heading=embedded?"h2":"h1";
  return (
    <Tag id="resume" className={embedded?"embedded-resume":"page narrow"}>
      <span className="eyebrow">RÉSUMÉ / ALI KOMEILI</span>
      <Heading>
        {page.title || (
          <>
            <span>Experience meets</span>
            <br />
            <span>curiosity.</span>
          </>
        )}
      </Heading>
      <p className="lead">Product & AI · Branding · Communication Design</p>
      <ResumeProfile profile={page.resumeProfile}/>
      <button className="button" onClick={() => window.print()}>
        Print resume
      </button>
    </Tag>
  );
}
function Services() {
  const page = usePage();
  const { categories, categoryIds } = React.useContext(Taxonomy);
  return (
    <main className="page">
      <span className="eyebrow">WAYS TO WORK TOGETHER</span>
      <h1>
        {page.title || (
          <>
            From a first thought
            <br />
            to a considered result.
          </>
        )}
      </h1>
      <div className="services">
        {categories.map((c, i) => (
          <div key={c}>
            <small>0{i + 1}</small>
            <h2>{c}</h2>
            <p>
              {
                [
                  "Product discovery, UX flows, interface design, design systems and AI agent experiences.",
                  "Visual identity, art direction, brand guidelines and applications.",
                  "Advertising concepts, packaging, key visuals and connected brand touchpoints.",
                ][i]
              }
            </p>
            <Link to="/contact">
              Discuss a project <Arrow />
            </Link>
          </div>
        ))}
      </div>
      <ContactBand />
    </main>
  );
}
function Contact(){const page=usePage(),editingPath=React.useContext(EditingPath);return <ProposalContact page={page} previewOnly={Boolean(editingPath)}/>;}
function Certificates({ certificates }) {
  const page = usePage();
  return (
    <main className="page certificates-page">
      <span className="eyebrow">LEARNING / CREDENTIALS</span>
      <h1>{page.title || "Always a student."}</h1>
      <p className="lead">
        A record of learning, practice and new perspectives.
      </p>
      {certificates.length ? (
        <React.Suspense fallback={<p className="credential-loading">Loading credentials…</p>}><CredentialGallery certificates={certificates}/></React.Suspense>
      ) : (
        <div className="credential-empty">
          <span>01 / SPACE FOR WHAT’S NEXT</span>
          <h2>Credentials will live here.</h2>
          <p>A growing record of practice and learning.</p>
        </div>
      )}
    </main>
  );
}
function PagePosts({ projects }) {
  const location = useLocation();
  if (location.pathname === "/work") return null;
  const entries = projects.filter((p) => p.parentPath === location.pathname);
  if (!entries.length) return null;
  return (
    <section className="section contextual-posts">
      <div className="section-head">
        <h2>
          From the studio <span>({entries.length})</span>
        </h2>
      </div>
      <div className="cards">
        {entries.map((p) => (
          <Card key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
const Studio = React.lazy(()=>import("./cms/Studio.jsx"));
function LegacyStudioRedirect(){const {pathname}=useLocation();const base=pathname.replace(/\/(edit|new)\/?$/,"")||"/";const isNew=/\/new\/?$/.test(pathname);let to="/studio";if(base.startsWith("/work"))to="/studio/projects"+(isNew?"/new":base.startsWith("/work/")?"/"+base.slice(6):"");else if(base.startsWith("/journal")||base.startsWith("/blog"))to="/studio/articles"+(isNew?"/new":base.split("/")[2]?"/"+base.split("/")[2]:"");else if(base!=="/"&&base!=="/admin")to="/studio/layout?path="+encodeURIComponent(base);return <Navigate to={to} replace/>;}
function OwnerWorkspace(props) {
 const location=useLocation(),{pages,setPages}=React.useContext(PageContent);
 const base=new URLSearchParams(location.search).get('path')||'/';
 if(base.startsWith('/work/'))return <Navigate to={'/studio/projects/'+base.split('/')[2]} replace/>;
 if(base.startsWith('/journal/'))return <Navigate to={'/studio/articles/'+base.split('/')[2]} replace/>;
 if(!['/','/work','/journal','/about','/services','/privacy','/contact','/certificates'].includes(base))return <Navigate to="/studio/pages" replace/>;
 return <Editor {...props} key={base} contextPath={base} pages={pages} setPages={setPages}/>;
}
function Editor({projects,certificates,contextPath='/',pages,setPages,stats,setStats,clients,setClients,blogPosts,homeSections,setHomeSections}) {
 const [certificateDraft,setCertificateDraft]=useState(certificates);
 const [notice,setNotice]=useState(''),[saving,setSaving]=useState(false),[inspectorOpen,setInspectorOpen]=useState(false);
 const page=pages[contextPath]||{};
 const payload={path:contextPath,page,...contextPath==='/'?{stats,clients,homeSections}:{},...contextPath==='/certificates'?{certificates:certificateDraft}:{}};
 const snapshot=JSON.stringify(payload),[savedSnapshot,setSavedSnapshot]=useState(snapshot),dirty=snapshot!==savedSnapshot;
 const latest=React.useRef(null);
 const patch=values=>setPages(current=>({...current,[contextPath]:{...current[contextPath],...values}}));
 async function save(publish=false){
  if(saving)return false;setSaving(true);
  try{const r=await fetch('/api/cms/page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,publish,draftVersion:cloud.version})});const data=await r.json();if(!r.ok)throw Error(data.error);cloud.version=data.draftVersion;setSavedSnapshot(snapshot);setNotice(publish?'This page is live. Other drafts remain private.':'Page draft saved.');return true;}catch(e){setNotice(e.message);return false;}finally{setSaving(false);}
 }
 latest.current=save;
 function commit(publish){flushSync(()=>document.activeElement?.blur());return latest.current(publish);}
 useEffect(()=>{const warn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};const shortcut=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();commit(false);}};window.addEventListener('beforeunload',warn);window.addEventListener('keydown',shortcut);return()=>{window.removeEventListener('beforeunload',warn);window.removeEventListener('keydown',shortcut);};},[dirty]);
 async function leave(e,url){if(dirty){e.preventDefault();if(await commit(false))window.location.assign(url);}}
 const pageLinks=[['/','Home'],['/work','Projects'],['/journal','Journal'],['/about','About'],['/contact','Contact'],['/certificates','Certificates'],['/services','Services'],['/privacy','Privacy']];
 return <div className={'editor page-studio '+(inspectorOpen?'inspector-open':'inspector-closed')}>
 <div className="editor-toolbar" data-editor-ui><div><a className="studio-return" href="/studio/pages" onClick={e=>leave(e,'/studio/pages')}><ArrowLeft size={16}/> Studio</a><b>Page editor</b><span className="local-badge">{pageLinks.find(([p])=>p===contextPath)?.[1]}</span></div><div><button className="inspector-toggle" onClick={()=>setInspectorOpen(!inspectorOpen)} aria-expanded={inspectorOpen} aria-controls="editor-inspector">{inspectorOpen?'Close options':'Page options'}</button><span className="save-state" role="status">{saving?'Saving…':dirty?'Unsaved changes':'Saved'}</span><button className="save-changes" disabled={saving||!dirty} onClick={()=>commit(false)}>Save draft</button><button className="dark" disabled={saving} onClick={()=>commit(true)}>Publish this page</button><a href={contextPath} target="_blank" rel="noreferrer">View live <ArrowUpRight size={15}/></a></div></div>
 <div className="save-notice" role="status">{notice||'Edit page copy and layout here. Manage projects, articles and media in Studio.'}</div>
 <div className="editor-layout"><aside id="editor-inspector" aria-label="Page options"><div className="studio-map"><div className="map-heading"><span>DESARTLY STUDIO</span><h2>Pages</h2></div><div className="map-page-grid">{pageLinks.map(([path,label])=><a key={path} href={'/studio/layout?path='+encodeURIComponent(path)} className={path===contextPath?'active':''} onClick={e=>leave(e,e.currentTarget.href)}>{label}</a>)}</div><p className="form-note">Projects, journal, media, navigation and site settings have one home in Studio.</p><a href="/studio" onClick={e=>leave(e,'/studio')}>Open workspace ↗</a></div>
 {(contextPath==='/'?['title','subtitle','intro','contactNote']:['title','intro','body']).map(field=><label key={field}>{field}<textarea rows={3} value={page[field]||''} placeholder="Use default text" onChange={e=>patch({[field]:e.target.value})}/></label>)}
 {contextPath==='/'&&<div className="home-selections"><label>Featured projects</label>{[0,1,2].map(i=><label key={i}>Position {i+1}<select value={page.selectedProjects?.[i]||''} onChange={e=>{const ids=[...(page.selectedProjects||[])];ids[i]=e.target.value;patch({selectedProjects:ids});}}><option value="">Automatic</option>{projects.filter(isVisibleProject).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>)}</div>}
 </aside><div className="editor-canvas" onClickCapture={e=>{if(e.target.closest("a")&&!e.target.closest("[data-editor-ui]"))e.preventDefault();}}><div className="canvas-context-bar" data-editor-ui><span>{contextPath}</span><small>Click page text to edit · Save draft · Publish this page</small></div>
 <EditingPath.Provider value={contextPath}>
 {contextPath==='/'?<Home projects={projects.filter(isVisibleProject)} stats={stats} clients={clients} blogPosts={blogPosts} homeSections={homeSections} pageOverride={page} editable onPagePatch={patch} onStatsChange={(id,v)=>setStats(list=>list.map(s=>s.id===id?{...s,...v}:s))} onClientChange={(id,v)=>setClients(list=>list.map(s=>s.id===id?{...s,...v}:s))} onClientsChange={setClients} onSectionsChange={setHomeSections} onFeaturedOrder={selectedProjects=>patch({selectedProjects})} onFeaturedChange={(i,id)=>{const ids=[...(page.selectedProjects||[])];ids[i]=id;patch({selectedProjects:ids});}}/>:contextPath==='/certificates'?<CredentialEditor items={certificateDraft} onChange={setCertificateDraft} onUpload={file=>optimizeImage(file)} onNotice={setNotice}/>:<><VisualCopy editable scope="site" copy={page.copy||{}} onChange={(key,value)=>patch({copy:{...page.copy,[key]:value}})}>{contextPath==='/about'?<About/>:contextPath==='/services'?<Services/>:contextPath==='/contact'?<Contact/>:contextPath==='/work'?<div className="page"><h1>{page.title||'Projects'}</h1><p>{page.intro||'Product thinking. Visual identities. Ideas that move.'}</p><p data-editor-ui>Project cards are managed in Studio → Projects.</p></div>:contextPath==='/journal'?<div className="page"><h1>{page.title||'Journal'}</h1><p>{page.intro||'Notes on design and making things.'}</p><p data-editor-ui>Articles are managed in Studio → Journal.</p></div>:<main className="page"><h1>{page.title||'Privacy'}</h1><p>{page.intro}</p><p>{page.body}</p></main>}</VisualCopy><PageModules blocks={page.blocks||[]} onChange={blocks=>patch({blocks})}/></>}
 </EditingPath.Provider></div></div></div>;
}
function NotFound() {
  return (
    <main className="page">
      <span className="eyebrow">404 / A CONNECTION MISSING</span>
      <h1>
        Let’s find
        <br />
        another way.
      </h1>
      <Link className="button dark" to="/">
        Back to Desartly <Arrow />
      </Link>
    </main>
  );
}
function App() {
  const [projects, setProjects] = useState(() =>
      read("pol-published", initialProjects),
    );
  const [taxonomy, setTaxonomy] = useState(() =>
    read("pol-categories", categories),
  );
  const [certificates, setCertificates] = useState(() =>
    read("pol-certificates", []),
  );
  const [stats, setStats] = useState(() => read("pol-stats", initialStats));
  const [clients, setClients] = useState(() => read("pol-clients", initialClients));
  const [blogPosts, setBlogPosts] = useState(() => readJournalPosts());
  const [homeSections, setHomeSections] = useState(() => read("pol-home-sections", initialHomeSections));
  const [navItems, setNavItems] = useState(() => read("pol-nav", defaultNav));
  const [pages, setPages] = useState(() => read("pol-page-content", {}));
  const location = useLocation();
  useEffect(() => {
    if(location.hash){requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());}else window.scrollTo(0, 0);
  }, [location.pathname,location.hash]);
  const isWorkspace = (!location.pathname.startsWith("/studio") && (/\/(edit|new)\/?$/.test(location.pathname) || location.pathname === "/admin" || location.pathname.startsWith("/edit/"))) || location.pathname === "/studio/layout";
  const isStudio = location.pathname === "/studio" || location.pathname.startsWith("/studio/");
  const edit = isWorkspace || isStudio || location.pathname === "/login";
  const publicProjects = projects.filter(isVisibleProject);
  return (
    <PageContent.Provider value={{ pages, setPages }}><SiteMetadata settings={pages["/site"]?.settings}/>
      <Taxonomy.Provider
        value={{
          categories: disciplines,
          categoryIds: disciplines.map(slugify),
          setCategories: setTaxonomy,
        }}
      >
        <VisualCopy copy={{...pages["/site"]?.copy,...pages[location.pathname]?.copy}} scope="site">
        <SiteMotion disabled={edit}/>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {!edit && (
          <PublicHeader items={Array.isArray(navItems)?navItems:defaultNav}/>
        )}
        <div id="main">
          {isWorkspace && location.pathname!=="/studio/layout" ? <LegacyStudioRedirect/> : isWorkspace ? (
            <OwnerGate>

              <React.Suspense fallback={<p className="page">Loading editor…</p>}><OwnerWorkspace
                {...{
                  projects,
                  setProjects,
                  stats,
                  setStats,
                  clients,
                  setClients,
                  blogPosts,
                  setBlogPosts,
                  homeSections,
                  setHomeSections,
                  navItems,
                  setNavItems,
                  certificates,
                  setCertificates,
                }}
              /></React.Suspense>
            </OwnerGate>
          ) : (
            <Routes>
              <Route path="/studio" element={<OwnerGate><React.Suspense fallback={<p>Opening Studio…</p>}><Studio/></React.Suspense></OwnerGate>}/><Route path="/studio/:section/:id?" element={<OwnerGate><React.Suspense fallback={<p>Opening Studio…</p>}><Studio/></React.Suspense></OwnerGate>}/>
              <Route path="/preview/work/:slug" element={<OwnerGate><Project projects={projects}/></OwnerGate>}/><Route path="/preview/journal/:slug" element={<OwnerGate><BlogPost blogPosts={blogPosts}/></OwnerGate>}/>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={<Home projects={publicProjects} stats={stats} clients={clients} blogPosts={blogPosts} homeSections={homeSections} />}
              />
              <Route path="/work" element={<Work projects={publicProjects} />} />
              <Route path="/journal" element={<Journal blogPosts={blogPosts} />} />
              <Route path="/blog" element={<Journal blogPosts={blogPosts} />} />
              <Route path="/journal/:slug" element={<BlogPost blogPosts={blogPosts} />} />
              <Route path="/blog/:slug" element={<BlogPost blogPosts={blogPosts} />} />
              <Route
                path="/work/:slug"
                element={<Project key={location.pathname} projects={publicProjects} />}
              />
              <Route path="/about" element={<About />} />
              <Route path="/resume" element={<Navigate to="/about#resume" replace />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/certificates"
                element={<Certificates certificates={certificates} />}
              />
              <Route
                path="/privacy"
                element={
                  <main className="page narrow">
                    <h1>{pages["/privacy"]?.title || "Privacy, simply."}</h1>
                    <p>
                      {pages["/privacy"]?.body || "When you contact me, I use the details you share to discuss your project and prepare a proposal. If you choose the email option, your email app sends the message to Komeilipv@gmail.com. Requests submitted directly through this site are stored privately in my workspace. To ask about your information or request its removal, email Komeilipv@gmail.com. Owner access uses a secure session cookie."}
                    </p>
                  </main>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
          {!edit && <PagePosts projects={publicProjects} />}{!edit && <PageModules blocks={pages[location.pathname]?.blocks || []}/>} 
        </div>
        {!edit && <Footer />}
        </VisualCopy>
      </Taxonomy.Provider>
    </PageContent.Provider>
  );
}
const root = createRoot(document.getElementById("root"));
root.render(<SiteBootSkeleton/>);
function ContentUnavailable(){return <main className="content-unavailable" role="alert"><a href="/">Desartly</a><h1>A brief pause.</h1><p>The portfolio could not load. Please try again in a moment.</p><button className="button dark" onClick={()=>location.reload()}>Try again</button><a href="mailto:Komeilipv@gmail.com">Contact Ali</a></main>}
bootstrapCloud().finally(() => root.render(cloud.error&&!location.pathname.startsWith('/login')?<ContentUnavailable/>:<BrowserRouter><App /></BrowserRouter>));
