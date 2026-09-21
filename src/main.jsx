import React, { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
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
import { CredentialGallery } from "./CredentialGallery";
import { VisualCopy } from "./VisualCopy";
import "./refinement.css";
import "./portfolio.css";
import {bootstrapCloud,saveCloud,cloud,uploadMedia} from "./cloud";
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
  { id: "work", label: "Work", to: "/work" },
  { id: "journal", label: "Journal", to: "/journal" },
  { id: "about", label: "About", to: "/about" },
  { id: "certificates", label: "Certificates", to: "/certificates" },
  { id: "contact", label: "Contact", to: "/contact", arrow: true },
];
function mergeNavigation(items){return items.filter(item=>!["/resume","/resume/"].includes(item.to||item.url));}
function SiteNavLink({ item, active }) {
  const to = safeLink(item.to) || "/";
  const props = { className: [active ? "active" : "", to.split("?")[0] === "/contact" ? "nav-contact-primary" : ""].filter(Boolean).join(" ") };
  if (!to.startsWith("/")) {
    return <a href={to} {...props} target="_blank" rel="noopener noreferrer">{item.label}{item.arrow && <ArrowUpRight size={13} />}</a>;
  }
  return <Link to={to} {...props}>{item.label}{item.arrow && <ArrowUpRight size={13} />}</Link>;
}
function EditableHeader({ navItems, onNavChange, onReorder, onAdd, onRemove }) {
  const [selected, setSelected] = useState(null);
  const dragIndex = React.useRef(null);
  const items = mergeNavigation(Array.isArray(navItems) ? navItems : defaultNav);
  return <header className="editor-page-header">
    <span className="logo">Desartly<span>®</span></span>
    <span className="header-name">DESARTLY<br/>DESIGN PORTFOLIO</span>
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
    "/about": { eyebrow: "THE PRACTICE / DESARTLY", title: "Curiosity connects everything I do.", intro: "My practice brings together product design, AI agents, branding and advertising." },
    "/resume": { eyebrow: "RÉSUMÉ / DESARTLY", title: "Design across disciplines.", intro: "Product & AI · Branding · Advertising" },
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
function Card({ p, editable = false, onTitleChange }) {
  return (
    <Link className={"project-card" + (editable ? " is-editable" : "")} to={"/work/" + p.id} onClick={e=>{if(editable){e.preventDefault();}}}>
      <div className="cover">
        {p.coverImage ? (
          <img src={p.coverImage} alt={p.title} loading="lazy" decoding="async" />
        ) : (
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
        <span>{p.category}</span>
        <span>{p.sample === false ? "Case study" : "Concept"}</span>
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
        {shown.map((stat) => <article key={stat.id}><AnimatedNumber value={stat.value} editable={editable} onBlur={e=>onChange?.(stat.id,{value:e.currentTarget.innerText})}/><div><h3 contentEditable={editable} suppressContentEditableWarning onBlur={e=>onChange?.(stat.id,{label:e.currentTarget.innerText})}>{stat.label}</h3><p contentEditable={editable} suppressContentEditableWarning onBlur={e=>onChange?.(stat.id,{detail:e.currentTarget.innerText})}>{editable||!/replace|add the year/i.test(stat.detail||'')?stat.detail:""}</p></div></article>)}
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
            <img src={block.images[i]} alt={"Project composition " + (i + 1)} />
          ) : (
            <Art index={(cover + i) % 9} />
          )}
        </div>
      ))}
    </div>
  );
}
function HtmlPreview({ block, editable = false, onChange, onTitleChange }) {
  const html = block.html || "<main style='font-family:system-ui;padding:32px;background:#f5f6fa;color:#202632'><p style='font-size:12px;letter-spacing:.08em;text-transform:uppercase'>HTML sample</p><h1 style='font-size:36px;margin:18px 0'>Your UX prototype lives here.</h1><button style='padding:12px 16px;border:1px solid #202632;background:white'>Try the interaction</button></main>";
  return <section className={"html-block" + (editable ? " html-block-editor" : "")}>
    {editable && <><label className="html-upload" data-editor-ui>Upload HTML file<input type="file" accept=".html,.htm,text/html" onChange={async e => { const file=e.target.files?.[0]; if (!file) return; if(file.size>2000000){e.target.setCustomValidity("Choose an HTML file under 2 MB.");e.target.reportValidity();return;} onChange?.(await file.text()); }}/></label><input className="html-block-title" aria-label="HTML sample title" value={block.title || "UX sample"} onChange={e=>onTitleChange?.(e.target.value)} /><textarea aria-label="HTML sample source" value={html} onChange={e=>onChange?.(e.target.value)} spellCheck={false} /></>}
    <iframe loading="lazy" title={block.title || "HTML UX sample"} sandbox="allow-scripts" srcDoc={html} />
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
  const selected = categories.slice(0, 3).map((c, i) => projects.find(p => p.id === page.selectedProjects?.[i]) || projects.find(p => p.category === c)).filter(Boolean);
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
      <div className="folio-kicker"><span className="eyebrow">DESARTLY / INDEPENDENT DESIGNER</span><span>Portfolio · 2026</span></div>
      <div className="intro-slider" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}} role="region" aria-roledescription="carousel" aria-label="Introduction to my design practice" onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==="ArrowRight"){e.preventDefault();moveSlide(1)}if(e.key==="ArrowLeft"){e.preventDefault();moveSlide(-1)}}} tabIndex={0} onTouchStart={e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{if(!touchStart.current)return;const dx=e.changedTouches[0].clientX-touchStart.current.x,dy=e.changedTouches[0].clientY-touchStart.current.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))moveSlide(dx<0?1:-1);touchStart.current=null}}>
        <div className="intro-slide-copy"><span className="eyebrow hero-discipline"><i aria-hidden="true"/> DESIGN ACROSS DISCIPLINES</span><EditableHeading first={page.title ?? "Useful products."} second={page.subtitle ?? "Distinct identities."} editable={editable} label="Hero heading" onChange={(title,subtitle)=>onPagePatch?.({title,subtitle})}/><p contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>onPagePatch?.({intro:e.currentTarget.innerText})}>{page.intro || "Independent design across Product & AI, branding and advertising. I turn complex ideas into clear experiences and distinctive visual systems."}</p><Link to="/about" className="intro-about" onClick={e=>{if(editable)e.preventDefault();}}><span>Meet the designer</span> <ArrowRight size={17}/></Link><div className="hero-signature" aria-hidden="true"><span>Independent mind.<br/>Connected practice.</span><svg viewBox="0 0 64 64"><path d="M32 4v56M4 32h56M12 12l40 40M12 52l40-40"/></svg></div></div>
        {activeProject && <Link className="intro-slide-visual" to={"/work/"+activeProject.id} onClick={e=>{if(editable)e.preventDefault();}} aria-label={"Explore "+activeProject.title} key={activeProject.id}>{activeProject.coverImage ? <img src={activeProject.coverImage} alt={activeProject.title} decoding="async"/> : <Art index={activeProject.cover}/>}<span className="hero-project-index" aria-hidden="true">FEATURED / {String(activeIndex+1).padStart(2,"0")}</span><span className="intro-slide-caption"><span>{activeProject.category}</span><span>{activeProject.title} <ArrowUpRight size={17}/></span></span></Link>}
        <div className="intro-slider-controls"><div className="intro-slide-tabs">{selected.map((project,i)=><button key={project.id} onClick={()=>setSlideIndex(i)} aria-label={"Show slide "+(i+1)+": "+project.category} aria-pressed={i===activeIndex}><span>{String(i+1).padStart(2,"0")}</span><span>{project.category}</span></button>)}</div><div className="intro-slide-arrows"><button aria-label={autoPlay ? "Pause slideshow" : "Play slideshow"} onClick={()=>setAutoPlay(v=>!v)}>{autoPlay ? <Pause size={16}/> : <Play size={16}/>}</button><button aria-label="Previous introduction slide" onClick={()=>moveSlide(-1)} disabled={selected.length<2}><ArrowLeft size={18}/></button><button aria-label="Next introduction slide" onClick={()=>moveSlide(1)} disabled={selected.length<2}><ArrowRight size={18}/></button></div><span className="sr-only" aria-live={rotating ? "off" : "polite"}>{activeProject ? `Slide ${activeIndex+1} of ${selected.length}: ${activeProject.category}` : ""}</span></div>
      </div>
    </section>,
    selected: <section className="folio-selected" id="selected-work">
      <div className="folio-section-label"><span>01 / SELECTED WORK</span><Link to="/work"><span>All projects</span> <Arrow/></Link></div>
      <div className="portfolio-section-heading"><h2>Selected projects.</h2><p>Product & AI · Branding · Advertising</p></div>
      {editable ? <SortableGroup axis="x" className="cards home-project-grid editable-cards" values={selected} onReorder={order=>onFeaturedOrder?.(order.map(p=>p.id))}>{selected.map(p=><SortableBlock key={p.id} value={p}>{controls=><><button className="card-drag-handle drag-handle" data-editor-ui aria-label={`Reorder ${p.title}`} onPointerDown={e=>controls.start(e)}><GripVertical size={15}/> Move card</button><Card p={p} editable onTitleChange={onProjectTitleChange}/></>}</SortableBlock>)}</SortableGroup> : <div className="cards home-project-grid">{selected.map(p=><Card key={p.id} p={p}/>)}</div>}
    </section>,
    practice: <section className="folio-perspective"><div><span className="eyebrow">02 / THE PRACTICE</span><EditableHeading as="h2" first={page.practiceTitle ?? "Clarity in thinking."} second={page.practiceSubtitle ?? "Character in the details."} editable={editable} label="Practice heading" onChange={(practiceTitle,practiceSubtitle)=>onPagePatch?.({practiceTitle,practiceSubtitle})}/><Link to="/about" onClick={e=>{if(editable)e.preventDefault();}}><span>A little about me</span> <Arrow/></Link></div><div className="folio-disciplines">{categories.map((c,i)=><Link key={c} to={"/work?category="+categoryIds[i]} onClick={e=>{if(editable)e.preventDefault();}}><small>0{i+1}</small><div><h3 contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>{if(editable)setCategories(categories.map((v,j)=>j===i?e.currentTarget.innerText:v))}}>{c}</h3><p contentEditable={editable} suppressContentEditableWarning onClick={e=>{if(editable)e.preventDefault();}} onBlur={e=>onPagePatch?.({[`practiceDescription${i}`]:e.currentTarget.innerText})}>{page[`practiceDescription${i}`] || ["Useful interfaces and intelligent workflows, shaped around people.","A coherent identity, from the first impression to the smallest detail.","An idea expressed clearly, across campaigns and touchpoints."][i] || "An evolving part of my design practice."}</p></div><Arrow/></Link>)}</div></section>,
    clients: <ClientsStrip clients={clients} editable={editable} onChange={onClientChange} onCollectionChange={onClientsChange}/>,
    stats: <StatsBand stats={stats} editable={editable} onChange={onStatsChange}/>,
    journal: <section className="journal-preview"><div className="folio-section-label"><span>04 / FIELD NOTES</span><Link to="/journal" onClick={e=>{if(editable)e.preventDefault();}}><span>All notes</span> <Arrow/></Link></div><div className="blog-grid">{blogPosts.slice(0, 2).map(post => <BlogCard key={post.id} post={post} editable={editable} onChange={onBlogChange}/>)}</div></section>,
    contact: <ContactBand editable={editable} page={page} onPatch={onPagePatch}/>,
  };
  const normalizedSections = (homeSections?.length ? homeSections : initialHomeSections).map(section => typeof section === "string" ? { id: section, visible: true } : section);
  const patchSection = (id, values) => onSectionsChange?.(normalizedSections.map(section=>section.id===id?{...section,...values}:section));
  const renderSection = section => sectionMap[section.id] || (section.type === 'html' ? <HtmlPreview block={section} editable={editable} onChange={html=>patchSection(section.id,{html})} onTitleChange={title=>patchSection(section.id,{title})}/> : section.type === 'image' ? <figure className="custom-image"><img src={section.image || undefined} alt={section.title || ''}/>{editable && <input data-editor-ui type="file" accept="image/*" onChange={async e=>{if(e.target.files[0])patchSection(section.id,{image:await optimizeImage(e.target.files[0])});}}/>}<figcaption contentEditable={editable} suppressContentEditableWarning onBlur={e=>patchSection(section.id,{title:e.currentTarget.innerText})}>{section.title}</figcaption></figure> : <section className="blog-copy"><h2 contentEditable={editable} suppressContentEditableWarning onBlur={e=>patchSection(section.id,{title:e.currentTarget.innerText})}>{section.title}</h2><p contentEditable={editable} suppressContentEditableWarning onBlur={e=>patchSection(section.id,{text:e.currentTarget.innerText})}>{section.text}</p></section>);
  if (!editable) return <main className="folio-home">{normalizedSections.filter(s=>s.visible!==false).map(section=><React.Fragment key={section.id}>{renderSection(section)}</React.Fragment>)}</main>;
  return <main className="folio-home home-canvas"><SortableGroup axis="y" values={normalizedSections} onReorder={onSectionsChange}>{normalizedSections.map((section,index)=><SortableBlock key={section.id} value={section}>{controls=><div className={section.visible===false?'canvas-section is-hidden':'canvas-section'}><div className="canvas-section-tools" data-editor-ui><button className="drag-handle" aria-label={`Drag ${section.label || section.type}`} onPointerDown={e=>controls.start(e)}><GripVertical size={16}/></button><strong>{section.label || section.type}</strong><button disabled={index===0} onClick={()=>{const next=[...normalizedSections];[next[index-1],next[index]]=[next[index],next[index-1]];onSectionsChange(next);}}>↑</button><button disabled={index===normalizedSections.length-1} onClick={()=>{const next=[...normalizedSections];[next[index+1],next[index]]=[next[index],next[index+1]];onSectionsChange(next);}}>↓</button><button onClick={()=>patchSection(section.id,{visible:section.visible===false})}>{section.visible===false?'Show':'Hide'}</button>{section.type && <button onClick={()=>onSectionsChange(normalizedSections.filter(s=>s.id!==section.id))}>Remove</button>}</div>{renderSection(section)}{section.id==='intro' && activeProject && <div className="canvas-insert" data-editor-ui><label>Replace square cover<input type="file" accept="image/*" onChange={async e=>{if(e.target.files[0])onCoverChange?.(activeProject.id,await optimizeImage(e.target.files[0]));}}/></label></div>}{section.id==='selected' && <div className="canvas-insert" data-editor-ui>{selected.map((project,i)=><label key={i}>Card {i+1}<select aria-label={`Featured card ${i+1}`} value={project.id} onChange={e=>onFeaturedChange?.(i,e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>)}</div>}</div>}</SortableBlock>)}</SortableGroup><div className="canvas-insert" data-editor-ui><span>Add a section</span>{['text','image','html'].map(type=><button key={type} onClick={()=>onSectionsChange([...normalizedSections,{id:crypto.randomUUID(),type,visible:true,title:'New section',text:'Write here.'}])}><Plus size={14}/>{type === 'html'?'HTML prototype':type}</button>)}</div></main>;
}
function EditableHeading({as:Tag="h1", first, second, editable, onChange, label="Heading"}) {
  const value=[first,second].filter(Boolean).join("\n");
  return <Tag className="unified-heading" contentEditable={editable} suppressContentEditableWarning role={editable?"textbox":undefined} aria-label={editable?label:undefined} aria-multiline={editable?true:undefined} onBlur={e=>{if(editable){const [first,...rest]=e.currentTarget.innerText.split("\n");onChange?.(first,rest.join("\n"));}}}>{value}</Tag>;
}
function ContactBand({ editable = false, page = {}, onPatch }) {
 const patch = field => e => onPatch?.({ [field]: e.currentTarget.innerText });
 return <section className="contact-band folio-contact"><span className="eyebrow">A GOOD PLACE TO START</span><EditableHeading as="h2" first={page.contactTitle ?? "Let’s make"} second={page.contactSubtitle ?? "something matter."} editable={editable} label="Contact heading" onChange={(contactTitle,contactSubtitle)=>onPatch?.({contactTitle,contactSubtitle})}/><div className="folio-contact-actions"><Link to="/contact?reason=hr" className="portfolio-action" onClick={e=>{if(editable)e.preventDefault();}}><span>Hire me</span> <Arrow/></Link><Link to="/contact?reason=client" className="portfolio-action" onClick={e=>{if(editable)e.preventDefault();}}><span>Start a project</span> <Arrow/></Link></div><div><span contentEditable={editable} suppressContentEditableWarning onBlur={patch("contactNote")}>{page.contactNote || "Open to teams and independent collaborations."}</span><Link to="/about#resume" className="portfolio-action" onClick={e=>{if(editable)e.preventDefault();}}><span>View resume</span> <Arrow/></Link></div></section>;
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
    <div className="journal-layout">
      <aside className="journal-topics" aria-label="Journal topics">
        <label className="journal-search">Search notes<input type="search" aria-label="Search notes" value={query} onChange={e=>setParams({...activeTopic === "all" ? {} : {topic:activeTopic},...e.target.value ? {q:e.target.value} : {}},{replace:true})}/></label><span className="eyebrow">TOPICS</span>
        <div>{topics.map(topic => <button key={topic.id} type="button" className={activeTopic === topic.id ? "active" : ""} aria-pressed={activeTopic === topic.id} onClick={() => chooseTopic(topic)}><span>{topic.label}</span><span>{countFor(topic)}</span></button>)}</div>
      </aside>
      <div className="blog-grid blog-list">{visiblePosts.length ? visiblePosts.map(post => <BlogCard key={post.id} post={post}/>) : <p className="empty-state">No notes in this topic yet.</p>}</div>
    </div>
  </main>;
}

function BlogPost({ blogPosts }) {
  const { slug } = useParams();
  const post = blogPosts.find(item => item.id === slug);
  if (!post) return <NotFound />;
  return <main className="blog-post-page"><Link className="back" to="/journal"><ArrowLeft size={16}/> All notes</Link><div className="blog-post-heading"><span className="eyebrow">{post.category || "NOTES"} / {post.date}</span><h1>{post.title}</h1><p>{post.excerpt}</p></div><div className="blog-post-cover">{post.coverImage ? <img src={post.coverImage} alt="" decoding="async" /> : <Art index={post.cover || 0}/>}</div>{(post.blocks || []).map(block => block.type === "markdown" ? <section className="blog-copy" key={block.id}><MarkdownContent source={block.markdown}/></section> : block.type === "html" ? <HtmlPreview key={block.id} block={block}/> : block.type === "image" ? <figure className="blog-image" key={block.id}>{block.image ? <img src={block.image} alt={block.alt || ""}/> : <Art index={(post.cover || 0)+1}/>}<figcaption>{block.caption}</figcaption></figure> : <section className="blog-copy" key={block.id}><h2>{block.title}</h2><p>{block.text}</p></section>)}</main>;
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
  const page = usePage();
  const { categories, categoryIds } = React.useContext(Taxonomy);
  const [params, setParams] = useSearchParams();
  const active = params.get("category");
  return (
    <main className="page">
      <div className="page-title">
        <span className="eyebrow">
          THE PORTFOLIO / {projects.length} EXPLORATIONS
        </span>
        <h1>{page.title || "Work, connected."}</h1>
        <p>
          {page.intro ||
            "Product thinking. Visual identities. Ideas that move."}
        </p>
      </div>
      <div className="filters">
        {["All work", ...categories].map((c, i) => (
          <button
            key={c}
            className={active === (categoryIds[i - 1] || null) ? "active" : ""}
            onClick={() => setParams(i ? { category: categoryIds[i - 1] } : {})}
          >
            {c}
            <span className="filter-count">
              {i
                ? projects.filter((p) => p.category === c).length
                : projects.length}
            </span>
          </button>
        ))}
      </div>
      <div className="cards">
        {projects
          .filter(
            (p) =>
              !active || categoryIds[categories.indexOf(p.category)] === active,
          )
          .map((p) => (
            <Card key={p.id} p={p} />
          ))}
      </div>
      <div className="collection-share"><button onClick={async e=>{const button=e.currentTarget;try{await navigator.clipboard.writeText(window.location.href);button.textContent='Link copied';}catch{button.textContent='Copy this page URL from your browser';}}}>Copy collection link</button><span>Share a focused selection of work.</span></div><p className="sample-note">
        Concept studies across product, identity and communication.
      </p>
    </main>
  );
}
function Project({ projects }) {
  const { slug } = useParams();
  const p = projects.find((p) => p.id === slug);
  if (!p) return <NotFound />;
  return (
    <main className="project-page">
      <Link className="back" to="/work">
        <ArrowLeft size={16} /> All work
      </Link>
      <div className="project-heading">
        <span className="eyebrow">
          {p.category} / {p.sample === false ? "CASE STUDY" : "CONCEPT STUDY"}
        </span>
        <h1>{p.title}</h1>
        <p>{p.summary}</p>
      </div>
      <CaseBrief project={p}/><div className="project-hero">
        {(p.heroImage || p.coverImage) ? (
          <img src={p.heroImage || p.coverImage} alt={p.title} loading="eager" decoding="async" />
        ) : (
          <Art index={p.cover} />
        )}
      </div>
      <div className="project-facts">
        <div>
          <small>DISCIPLINE</small>
          <p>{p.category}</p>
        </div>
        <div>
          <small>STATUS</small>
          <p>{p.sample === false ? "Real project" : "Concept study"}</p>
        </div>
        <div>
          <small>FORMAT</small>
          <p>Case study</p>
        </div>
      </div>
      {p.blocks.filter(b=>b.type!=='text'||(b.text?.trim()&&!/Use this space|Describe your role|Write here\./.test(b.text))).map((b) =>
        b.type === "text" ? (
          <section className="text-block" key={b.id}>
            <h2>{b.title}</h2>
            <p>{b.text}</p>
          </section>
        ) : b.type === "image" ? (
          <figure className="case-single-image" key={b.id}><img src={b.image} alt={b.alt||b.caption||"Project detail"} loading="lazy"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>
        ) : b.type === "html" ? (
          <HtmlPreview block={b} key={b.id} />
        ) : (
          <section className="composition-block" key={b.id}>
            <Grid block={b} cover={p.cover} />
          </section>
        ),
      )}
      {p.relatedNote&&<Link className="related-note" to={"/journal/"+p.relatedNote}>Read the thinking behind this work <Arrow/></Link>}<div className="next-project">
        <small>KEEP EXPLORING</small>
        <Link
          to={
            "/work/" + (projects.find(item=>item.id!==p.id&&item.category===p.category)||projects.find(item=>item.id!==p.id)||p).id
          }
        >
          {(projects.find(item=>item.id!==p.id&&item.category===p.category)||projects.find(item=>item.id!==p.id)||p).title}
          <Arrow />
        </Link>
      </div><ContactBand/>
    </main>
  );
}
function About() {
  const page = usePage();
  return (
    <main className="page about">
      <span className="eyebrow">THE PRACTICE / DESARTLY</span>
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
          <span>D.</span>
          <small>
            Desartly
            <br />
            Designer across disciplines
          </small>
          <div />
        </div>
        <div>
          <h2>
            <span>This is Desartly.</span>
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
      <ContactBand />
    </main>
  );
}
function Resume({embedded=false}) {
  const {pages}=React.useContext(PageContent);const page=pages["/resume"]||{};const Tag=embedded?"section":"main";const Heading=embedded?"h2":"h1";
  return (
    <Tag id="resume" className={embedded?"embedded-resume":"page narrow"}>
      <span className="eyebrow">RÉSUMÉ / DESARTLY</span>
      <Heading>
        {page.title || (
          <>
            <span>Design across</span>
            <br />
            <span>disciplines.</span>
          </>
        )}
      </Heading>
      <p className="lead">Product & AI · Branding · Advertising</p>
      <div className="resume-row">
        <h2>Focus</h2>
        <p>
          Product experience, interface design, agent workflows, visual identity
          and creative campaigns.
        </p>
      </div>

      <div className="resume-row">
        <h2>Let’s talk</h2>
        <Link to="/contact">Start a conversation ↗</Link>
      </div>
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
                  "Campaign concepts, key visuals, digital assets and integrated creative.",
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
function Contact() {
  const page = usePage();
  const { categories } = React.useContext(Taxonomy);
  const [contactParams] = useSearchParams();
  const [reason, setReason] = useState(contactParams.get("reason") === "client" ? "client" : "hr"),
    [saved, setSaved] = useState(false);
  const hr = reason === "hr";
  return (
    <main className="page contact-page">
      <div>
        <span className="eyebrow">THE NEXT CONNECTION</span>
        <h1>
          {page.title ||
            (hr ? (
              <>
                A new team.
                <br />A shared ambition.
              </>
            ) : (
              <>
                Your next idea.
                <br />
                Let’s make it real.
              </>
            ))}
        </h1>
        <p>
          {hr
            ? "Tell me about the role, your team and the way you work."
            : "Tell me what you are building, who it is for and where you need a design partner."}
        </p>
        <div className="contact-decoration">↗</div>
      </div>
      <form
        key={reason}
        onSubmit={(e) => {
          e.preventDefault();
          try {
            localStorage.setItem(
              "pol-contact-" + reason,
              JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
            );
            setSaved(true);
          } catch {
            setSaved(false);
          }
        }}
      >
        <fieldset className="inquiry-switch">
          <legend>I’m reaching out as</legend>
          <div className="choice">
            {[
              ["hr", "HR / Hiring team"],
              ["client", "Client / Collaborator"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={id === reason}
                className={id === reason ? "active" : ""}
                onClick={() => {
                  setReason(id);
                  setSaved(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" required />
        <label htmlFor="email">Work email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <label htmlFor="company">
          {hr ? "Company name" : "Company / Brand"}
        </label>
        <input
          id="company"
          name="company"
          autoComplete="organization"
          required
        />
        {hr ? (
          <>
            <label htmlFor="role">Role you are hiring for</label>
            <input
              id="role"
              name="role"
              required
              placeholder="Product Designer"
            />
            <div className="form-columns">
              <div>
                <label htmlFor="type">Employment type</label>
                <select id="type" name="employment">
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </div>
              <div>
                <label htmlFor="arrangement">Work arrangement</label>
                <select id="arrangement" name="arrangement">
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </div>
            </div>
            <label htmlFor="location">Location / Time zone</label>
            <input
              id="location"
              name="location"
              placeholder="City, country or time zone"
            />
            <label htmlFor="job">Job description link (optional)</label>
            <input id="job" name="jobUrl" type="url" placeholder="https://" />
            <label htmlFor="salary">Compensation range (optional)</label>
            <input
              id="salary"
              name="compensation"
              placeholder="Range and currency"
            />
          </>
        ) : (
          <>
            <label htmlFor="service">What do you need?</label>
            <select id="service" name="service">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option>More than one discipline</option>
            </select>
            <label htmlFor="deliverables">Scope / Deliverables</label>
            <input
              id="deliverables"
              name="deliverables"
              required
              placeholder="A product experience, a new identity, a campaign…"
            />
            <div className="form-columns">
              <div>
                <label htmlFor="budget">Budget range (optional)</label>
                <input
                  id="budget"
                  name="budget"
                  placeholder="Amount and currency"
                />
              </div>
              <div>
                <label htmlFor="timeline">Target timeline</label>
                <input
                  id="timeline"
                  name="timeline"
                  placeholder="When would you like to launch?"
                />
              </div>
            </div>
            <label htmlFor="project-link">
              Website / Brief link (optional)
            </label>
            <input
              id="project-link"
              name="briefUrl"
              type="url"
              placeholder="https://"
            />
          </>
        )}
        <label htmlFor="message">
          {hr
            ? "About the team and opportunity"
            : "About the project and its goals"}
        </label>
        <textarea id="message" name="message" required rows="4" />
        <button className="button dark" type="submit">
          <span>{hr ? "Save hiring inquiry" : "Save project inquiry"}</span>
          <Arrow />
        </button>
        <small className="form-note">
          Local preview: your inquiry is saved on this device. Nothing is sent.
        </small>
        {saved && (
          <p role="status">
            Your {hr ? "hiring" : "project"} inquiry draft is saved.
          </p>
        )}
      </form>
    </main>
  );
}
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
        <CredentialGallery certificates={certificates}/>
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
function OwnerWorkspace(props) {
  const location = useLocation(),
    navigate = useNavigate();
  const { categories, categoryIds } = React.useContext(Taxonomy);
  const started = React.useRef(false);
  const action = /\/new\/?$/.test(location.pathname) ? "new" : "edit";
  const rawBase = location.pathname.replace(/\/(edit|new)\/?$/, "") || "/";
  const base = rawBase === "/resume" ? "/about" : rawBase;
  const { pages, setPages } = React.useContext(PageContent);
  useEffect(() => {
    if (action !== "new" || started.current) return;
    started.current = true;
    const draft = read("pol-draft", props.projects);
    if (base === "/journal" || base.startsWith("/journal/")) {
      const posts = readJournalPosts();
      const post = { id: "note-" + crypto.randomUUID().slice(0, 8), title: "Untitled note", excerpt: "", date: new Date().toISOString().slice(0, 10), category: "Notes", cover: 0, blocks: [{ id: crypto.randomUUID(), type: "text", title: "A new note", text: "Write your note here." }] };
      try { cloud.values["pol-blog-posts"]=[...posts,post]; localStorage.setItem("pol-blog-posts", JSON.stringify([...posts, post])); navigate("/journal/" + post.id + "/edit", { replace: true }); } catch { setError("Browser storage is full. No note was created."); }
      return;
    }
    const parent = draft.find((p) => "/work/" + p.id === base);
    const categoryParam = new URLSearchParams(location.search).get("category");
    const category =
      categories[categoryIds.indexOf(categoryParam)] ||
      parent?.category ||
      categories[0];
    const post = {
      id: "post-" + crypto.randomUUID().slice(0, 8),
      title: "Untitled post",
      category,
      summary: "",
      cover: 0,
      sample: false,
      parentPath: base,
      blocks: [],
    };
    try {
      cloud.values["pol-draft"]=[...draft,post];
      localStorage.setItem("pol-draft", JSON.stringify([...draft, post]));
      navigate("/work/" + post.id + "/edit", { replace: true });
    } catch {
      setError("Browser storage is full. No post was created.");
    }
  }, [action, base, location.search, navigate]);
  const [error, setError] = useState("");
  if (action === "new")
    return (
      <main className="owner-login">
        <p>{error || "Creating a new draft…"}</p>
      </main>
    );
  if (
    base.startsWith("/work/") &&
    !read("pol-draft", props.projects).some((p) => "/work/" + p.id === base)
  )
    return <NotFound />;
  return (
    <Editor
      {...props}
      key={base}
      contextPath={base}
      pages={pages}
      setPages={setPages}
    />
  );
}
function Editor({
  projects,
  setProjects,
  certificates,
  setCertificates,
  contextPath = "/work",
  pages,
  setPages,
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
}) {
  const { categories, categoryIds, setCategories } = React.useContext(Taxonomy);
  const [newCategory, setNewCategory] = useState(""),
    [certificateDraft, setCertificateDraft] = useState(() =>
      read("pol-certificates-draft", certificates),
    );
  const journalContext = contextPath === "/journal" || contextPath.startsWith("/journal/");
  const [blogDraft, setBlogDraft] = useState(() => read("pol-blog-posts", blogPosts)),
    [blogIndex, setBlogIndex] = useState(() => Math.max(0, read("pol-blog-posts", blogPosts).findIndex(post => "/journal/" + post.id === contextPath)));
  const blog = blogDraft[blogIndex];
  const siteNav = mergeNavigation(Array.isArray(navItems) ? navItems : defaultNav);
  const editableHomeSections = homeSections?.length ? homeSections : initialHomeSections;
  function addCategory() {
    const name = newCategory.trim(),
      id = slugify(name);
    if (!id) {
      setNotice("Enter a category name in English.");
      return;
    }
    if (categoryIds.includes(id)) {
      setNotice("That category already exists.");
      return;
    }
    setCategories([...categories, name]);
    setNewCategory("");
    setNotice("Category added. Save draft to retain it.");
  }
  function addPost() {
    const post = {
      id: "post-" + crypto.randomUUID().slice(0, 8),
      title: "Untitled post",
      category: categories[0],
      parentPath: contextPath,
      summary: "",
      cover: 0,
      sample: false,
      blocks: [],
    };
    setDraft([...draft, post]);
    setIndex(draft.length);
    setMode("content");
    setNotice("New post created. Add your title and content.");
  }
  function addBlogPost() {
    const post = { id: "note-" + crypto.randomUUID().slice(0, 8), title: "Untitled note", excerpt: "", date: new Date().toISOString().slice(0, 10), category: "Notes", cover: 0, blocks: [{ id: crypto.randomUUID(), type: "text", title: "A new note", text: "Write your note here." }] };
    setBlogDraft([...blogDraft, post]); setBlogIndex(blogDraft.length); setMode("journal"); setNotice("New note created. Add your title and copy.");
  }
  function patchBlogBlock(blockId, values) {
    setBlogDraft(drafts => drafts.map((post, i) => i === blogIndex ? { ...post, blocks: (post.blocks || []).map(block => block.id === blockId ? { ...block, ...values } : block) } : post));
  }
  function moveBlogBlock(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= (blog?.blocks || []).length) return;
    const blocks = [...(blog.blocks || [])];
    [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
    setBlogDraft(blogDraft.map((post, i) => i === blogIndex ? { ...post, blocks } : post));
  }
  function removeBlogBlock(blockId) {
    setBlogDraft(blogDraft.map((post, i) => i === blogIndex ? { ...post, blocks: (post.blocks || []).filter(block => block.id !== blockId) } : post));
  }
  function uploadBlogImage(blockId, event) {
    upload(event, image => patchBlogBlock(blockId, { image }));
  }
  function updateNav(index, values) {
    setNavItems(siteNav.map((item, i) => i === index ? { ...item, ...values } : item));
  }
  function moveNav(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= siteNav.length) return;
    const reordered = [...siteNav];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setNavItems(reordered);
  }
  function addNavItem() {
    setNavItems([...siteNav, { id: "custom-" + crypto.randomUUID().slice(0, 8), label: "New link", to: "/" }]);
    setNotice("Navigation item added. Set its label and URL, then save the draft.");
  }
  function moveHomeSection(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= editableHomeSections.length) return;
    const reordered = [...editableHomeSections];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setHomeSections(reordered);
  }
  function dropHomeSection(index) {
    if (homeDrag === null || homeDrag === index) return;
    const reordered = [...editableHomeSections];
    const [moved] = reordered.splice(homeDrag, 1);
    reordered.splice(index, 0, moved);
    setHomeSections(reordered);
    setHomeDrag(null);
  }
  const pageMode = !contextPath.startsWith("/work") && contextPath !== "/admin";
  const [draft, setDraft] = useState(() => read("pol-draft", projects)),
    [mode, setMode] = useState(
      contextPath === "/certificates"
        ? "certificates"
        : journalContext
          ? "journal"
        : pageMode
          ? "page"
          : "content",
    ),
    [index, setIndex] = useState(() =>
      Math.max(
        0,
        read("pol-draft", projects).findIndex(
          (p) => "/work/" + p.id === contextPath,
        ),
      ),
    ),
    [notice, setNotice] = useState(""),
    [drag, setDrag] = useState(null),
    [homeDrag, setHomeDrag] = useState(null),
    [inspectorOpen, setInspectorOpen] = useState(false);
  const snapshot=JSON.stringify({draft,pages,categories,stats,clients,siteNav,editableHomeSections,blogDraft,certificateDraft});
  const [savedSnapshot,setSavedSnapshot]=useState(snapshot);
  const [saving,setSaving]=useState(false);
  const dirty=snapshot!==savedSnapshot;
  const latestSave=React.useRef(null);
  function commitActiveField(){flushSync(()=>document.activeElement?.blur());}
  function saveCurrent(){commitActiveField();return latestSave.current.save();}
  function publishCurrent(){commitActiveField();return latestSave.current.publish();}

  useEffect(()=>{const warn=e=>{if(dirty){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  useEffect(()=>{const shortcut=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();document.activeElement?.blur();setTimeout(()=>document.querySelector(".save-changes")?.click(),0);}};window.addEventListener("keydown",shortcut);return()=>window.removeEventListener("keydown",shortcut);},[]);
  const p = draft[index];
  function patch(values) {
    setDraft((d) => d.map((v, i) => (i === index ? { ...v, ...values } : v)));
  }
  function patchProjectById(id, values) {
    setDraft((d) => d.map((project) => project.id === id ? { ...project, ...values } : project));
  }
  function patchStatById(id, values) {
    setStats(current => current.map(stat => stat.id === id ? { ...stat, ...values } : stat));
  }
  function patchClientById(id, values) {
    setClients(current => current.map(client => client.id === id ? { ...client, ...values } : client));
  }
  function patchBlogPostById(id, values) {
    setBlogDraft(current => current.map(post => post.id === id ? { ...post, ...values } : post));
  }
  function blockPatch(id, values) {
    patch({
      blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...values } : b)),
    });
  }
  async function save() {
    if(saving)return false;setSaving(true);
    try {
      await saveCloud({schema:1,projects:draft,pages,categories,stats,clients,nav:siteNav,homeSections:editableHomeSections,blogPosts:blogDraft,certificates:certificateDraft});
      try {
      localStorage.setItem("pol-draft", JSON.stringify(draft));
      localStorage.setItem("pol-page-content", JSON.stringify(pages));
      localStorage.setItem("pol-categories", JSON.stringify(categories));
      localStorage.setItem("pol-stats", JSON.stringify(stats));
      localStorage.setItem("pol-clients", JSON.stringify(clients));
      localStorage.setItem("pol-nav", JSON.stringify(siteNav));
      localStorage.setItem("pol-home-sections", JSON.stringify(editableHomeSections));
      localStorage.setItem("pol-blog-posts", JSON.stringify(blogDraft));
      localStorage.setItem(
        "pol-certificates-draft",
        JSON.stringify(certificateDraft),
      );
      } catch { /* Cloud save remains authoritative if local backup is full. */ }
      setSavedSnapshot(snapshot);
      setNotice("Draft saved to the cloud. Publish when it is ready for visitors.");
      return true;
    } catch (error) {
      setNotice(error.message || "Storage is full. Remove a large image and try again.");return false;
    }finally{setSaving(false);}
  }
  async function publish() {
    if(saving)return;setSaving(true);
    try {
      await saveCloud({schema:1,projects:draft,pages,categories,stats,clients,nav:siteNav,homeSections:editableHomeSections,blogPosts:blogDraft,certificates:certificateDraft},true);
      try {
      localStorage.setItem("pol-published", JSON.stringify(draft));
      localStorage.setItem("pol-page-content", JSON.stringify(pages));
      localStorage.setItem("pol-categories", JSON.stringify(categories));
      localStorage.setItem("pol-stats", JSON.stringify(stats));
      localStorage.setItem("pol-clients", JSON.stringify(clients));
      localStorage.setItem("pol-nav", JSON.stringify(siteNav));
      localStorage.setItem("pol-home-sections", JSON.stringify(editableHomeSections));
      localStorage.setItem("pol-blog-posts", JSON.stringify(blogDraft));
      localStorage.setItem(
        "pol-certificates",
        JSON.stringify(certificateDraft),
      );
      } catch { /* Cloud publication succeeded; local cache is optional. */ }
      setCertificates(certificateDraft);
      setProjects(draft);
      setBlogPosts(blogDraft);
      setSavedSnapshot(snapshot);
      setNotice("Published. Your changes are now visible to everyone.");
    } catch (error) {
      setNotice(error.message || "Storage is full. Reduce image sizes.");
    }finally{setSaving(false);}
  }
  latestSave.current={save,publish};
  async function upload(e, cb) {
    try {
      if (e.target.files[0]) cb(await optimizeImage(e.target.files[0]));
      setNotice("Image converted to WebP. Save your draft to retain it.");
    } catch (err) {
      setNotice(err.message);
    }
  }
  return (
    <div className={"editor" + (inspectorOpen ? " inspector-open" : " inspector-closed")}>
      <div className="editor-toolbar" data-editor-ui>
        <div>
          <Settings2 size={17} />
          <b>Desartly Studio</b>
          <span className="local-badge">{cloud.ready?"CLOUD CMS":"OFFLINE"}</span>
          <select aria-label="Editing collection" value={mode} onChange={e=>setMode(e.target.value)}>{[["page","Page"],["content","Projects"],["journal","Journal"],["site","Navigation"],["certificates","Certificates"],["settings","Settings"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        </div>
        <div>
          <button className="inspector-toggle" onClick={() => setInspectorOpen(value => !value)} aria-expanded={inspectorOpen} aria-controls="editor-inspector">
            <Settings2 size={14} /> {inspectorOpen ? "Close pages" : "Pages & tools"}
          </button>
          <span className="save-state" role="status">{dirty?"Unsaved changes":"All changes saved"}</span><button className="dark save-changes" disabled={saving} onClick={saveCurrent}>{saving?"Saving…":"Save changes"}</button>
          <button disabled={saving} onClick={publishCurrent}>
            Publish website
          </button>
          <a href={contextPath} onClick={async e=>{if(dirty){e.preventDefault();if(await saveCurrent())window.location.assign(contextPath);}}}>Exit <X size={16}/></a>
          <button
            onClick={async () => {
              await fetch("/api/owner/logout", { method: "POST" });
              window.location.assign(contextPath);
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="save-notice" role="status">{notice||"Save changes keeps a private cloud draft. Publish website makes it public."}</div>
      <div className="editor-layout">
        <aside id="editor-inspector" aria-label="Editor map and settings">
          <div className="studio-map" data-editor-ui><div className="map-heading"><span>DESARTLY STUDIO</span><h2>Pages & tools</h2><p>Choose a page, then edit directly on the canvas.</p></div><details open><summary>Pages</summary><div className="map-page-grid">{[["/","Home"],["/work","Work"],["/about","About"],["/contact","Contact"],["/services","Services"],["/privacy","Privacy"]].map(([path,label])=><a key={path} href={path==="/"?"/edit":path+"/edit"} onClick={async e=>{if(dirty){e.preventDefault();if(await saveCurrent())window.location.assign(path==="/"?"/edit":path+"/edit");}}}>{label}</a>)}</div></details>{mode==='page'&&contextPath==='/'&&<details><summary>Home sections</summary>{editableHomeSections.map((section,i)=><button key={section.id} onClick={()=>{setInspectorOpen(false);setTimeout(()=>document.querySelectorAll('.canvas-section')[i]?.scrollIntoView({behavior:'smooth',block:'center'}),0);}}>{section.label||section.id}</button>)}<button onClick={()=>{setInspectorOpen(false);setTimeout(()=>document.querySelector('.editor-canvas footer')?.scrollIntoView({behavior:'smooth'}),0);}}>Footer</button></details>}<details><summary>Content</summary><button onClick={()=>{setMode("content");setInspectorOpen(false);}}>Projects <span>{draft.length}</span></button><button onClick={()=>{setMode("journal");setInspectorOpen(false);}}>Journal <span>{blogDraft.length}</span></button><button onClick={()=>{setMode("certificates");setInspectorOpen(false);}}>Certificates <span>{certificateDraft.length}</span></button></details><details><summary>Site settings</summary><button onClick={()=>{setMode("site");}}>Navigation & links</button><button onClick={()=>{setMode("settings");setInspectorOpen(false);}}>Identity & password</button></details></div><details className="map-details"><summary>Page options</summary><div className="editor-tabs" data-editor-ui>
            <button
              className={mode === "page" ? "active" : ""}
              onClick={() => setMode("page")}
            >
              Page
            </button>
            <button
              className={mode === "content" ? "active" : ""}
              onClick={() => setMode("content")}
            >
              Content
            </button>
            <button className={mode === "site" ? "active" : ""} onClick={() => setMode("site")}>Site</button>
            <button className={mode === "journal" ? "active" : ""} onClick={() => setMode("journal")}>Journal</button>
            <button
              className={mode === "certificates" ? "active" : ""}
              onClick={() => setMode("certificates")}
            >
              Credentials
            </button>
          </div>
          <div className="editor-context" aria-live="polite">
            <span className="eyebrow">EDITING</span>
            <strong>{{page: "Page layout", content: "Projects", journal: "Journal", site: "Navigation", certificates: "Certificates"}[mode]}</strong>
            <small>Canvas first · settings second</small>
          </div>
          <button className="add-block" onClick={addPost}>
            <Plus size={14} /> New post
          </button>
          <button className="add-block" onClick={addBlogPost}><Plus size={14}/> New note</button>
          <div className="category-create">
            <label htmlFor="new-category">New category</label>
            <div>
              <input
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
              />
              <button aria-label="Add category" onClick={addCategory}>
                <Plus size={15} />
              </button>
            </div>
          </div>
          {mode === "site" ? (
            <>
              <label>SITE NAVIGATION</label>
              <p className="form-note">Edit labels, destinations and order. Changes appear in the public header after Publish website.</p>
              {siteNav.map((item, i) => <div className="nav-edit-row" key={item.id || i}>
                <span className="nav-edit-index">{String(i + 1).padStart(2, "0")}</span>
                <input aria-label={`Navigation item ${i + 1} label`} value={item.label} onChange={e => updateNav(i, { label: e.target.value })} />
                <input aria-label={`Navigation item ${i + 1} URL`} value={item.to} onChange={e => updateNav(i, { to: e.target.value })} placeholder="/page or https://…" />
                <button type="button" aria-label={`Move navigation item ${i + 1} up`} disabled={i === 0} onClick={() => moveNav(i, -1)}>↑</button>
                <button type="button" aria-label={`Move navigation item ${i + 1} down`} disabled={i === siteNav.length - 1} onClick={() => moveNav(i, 1)}>↓</button>
                <button type="button" aria-label={`Remove navigation item ${i + 1}`} onClick={() => setNavItems(siteNav.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
              </div>)}
              <button className="add-block" type="button" onClick={addNavItem}><Plus size={14} /> Add navigation item</button>
            </>
          ) : mode === "journal" ? (
            blog ? <>
              <label>NOTE</label><select value={blogIndex} onChange={e=>setBlogIndex(+e.target.value)}>{blogDraft.map((post,i)=><option key={post.id} value={i}>{post.title}</option>)}</select>
              <label>Title</label><input value={blog.title} onChange={e=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,title:e.target.value}:v))}/>
              <label>Excerpt</label><textarea rows="3" value={blog.excerpt} onChange={e=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,excerpt:e.target.value}:v))}/>
              <label>Date</label><input type="date" value={blog.date} onChange={e=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,date:e.target.value}:v))}/>
              <label>Category</label><input value={blog.category} onChange={e=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,category:e.target.value}:v))}/>
              <label>Cover image</label><input type="file" accept="image/*" onChange={e=>upload(e,image=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,coverImage:image}:v)))}/>
              <button className="add-block" onClick={() => setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,blocks:[...(v.blocks||[]),{id:crypto.randomUUID(),type:"text",title:"New paragraph",text:"Write here."}]}:v))}><Plus size={14}/> Text block</button>
              <button className="add-block" onClick={() => setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,blocks:[...(v.blocks||[]),{id:crypto.randomUUID(),type:"image",image:"",alt:"",caption:"Add a caption."}]}:v))}><Plus size={14}/> Image block</button>
              <p className="form-note">Edit directly in the writing canvas. Move or remove blocks beside each module; notes are published with Publish website.</p>
            </> : <p>No notes yet. Add one above.</p>
          ) : mode === "page" ? (
            <>
              <label>Editing page</label>
              <p className="editing-path">{contextPath}</p>
              {(contextPath === "/" ? ["intro", "contactNote"] : ["title", "intro", "body"]).map((field) => (
                <label key={field}>
                  {field}
                  <textarea
                    rows={field === "intro" ? 4 : 2}
                    value={pages[contextPath]?.[field] || ""}
                    placeholder="Use default text"
                    onChange={(e) =>
                      setPages({
                        ...pages,
                        [contextPath]: {
                          ...pages[contextPath],
                          [field]: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
              {contextPath === "/" && <div className="home-selections"><label>Featured projects</label>{categories.slice(0,3).map((category,i)=><label key={category}>Position 0{i+1}<select value={pages["/"]?.selectedProjects?.[i] || ""} onChange={e => {const selectedProjects=[...(pages["/"]?.selectedProjects || [])];selectedProjects[i]=e.target.value;setPages({...pages,"/":{...pages["/"],selectedProjects}})}}><option value="">Automatic · {category}</option>{draft.map(project=><option key={project.id} value={project.id}>{project.title}</option>)}</select></label>)}</div>}
              {contextPath === "/" && <div className="home-section-editor"><label>Homepage sections</label><p className="form-note">Drag to reorder, use the arrows for keyboard control, or hide a section temporarily.</p>{editableHomeSections.map((section,i)=><div className="home-section-row" key={section.id} draggable onDragStart={()=>setHomeDrag(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>dropHomeSection(i)} onDragEnd={()=>setHomeDrag(null)}><GripVertical size={14}/><span>{section.label}</span><label className="checkbox"><input type="checkbox" checked={section.visible !== false} onChange={e=>setHomeSections(editableHomeSections.map((v,j)=>j===i?{...v,visible:e.target.checked}:v))}/> Show</label><button type="button" aria-label={`Move ${section.label} up`} disabled={i===0} onClick={()=>moveHomeSection(i,-1)}>↑</button><button type="button" aria-label={`Move ${section.label} down`} disabled={i===editableHomeSections.length-1} onClick={()=>moveHomeSection(i,1)}>↓</button></div>)}</div>}
              {contextPath === "/" && <div className="home-stat-editor"><label>Home counters</label>{stats.map((stat,i)=><div className="stat-edit-row" key={stat.id}><input aria-label={`${stat.label} value`} value={stat.value} onChange={e=>setStats(stats.map((v,j)=>j===i?{...v,value:e.target.value}:v))}/><input aria-label={`${stat.label} label`} value={stat.label} onChange={e=>setStats(stats.map((v,j)=>j===i?{...v,label:e.target.value}:v))}/><input aria-label={`${stat.label} detail`} value={stat.detail} onChange={e=>setStats(stats.map((v,j)=>j===i?{...v,detail:e.target.value}:v))}/><button type="button" aria-label={`Remove ${stat.label} counter`} onClick={()=>setStats(stats.filter((_,j)=>j!==i))}><Trash2 size={13}/></button></div>)}<button className="add-block" type="button" onClick={()=>setStats([...stats,{id:"stat-"+crypto.randomUUID().slice(0,8),value:"00",label:"New metric",detail:"Add a short proof point."}])}><Plus size={14}/> Add counter</button></div>}
              {contextPath === "/" && <div className="home-client-editor"><label>Selected collaborations</label>{clients.map((client,i)=><div className="client-edit-row" key={client.id}><input aria-label={`Client ${i+1} name`} value={client.name} onChange={e=>setClients(clients.map((v,j)=>j===i?{...v,name:e.target.value}:v))}/><input aria-label={`Client ${i+1} relationship`} value={client.relationship} onChange={e=>setClients(clients.map((v,j)=>j===i?{...v,relationship:e.target.value}:v))}/><input aria-label={`Client ${i+1} URL`} value={client.url} onChange={e=>setClients(clients.map((v,j)=>j===i?{...v,url:e.target.value}:v))}/><label className="checkbox"><input type="checkbox" checked={client.visible !== false} onChange={e=>setClients(clients.map((v,j)=>j===i?{...v,visible:e.target.checked}:v))}/> Show</label><input type="file" accept="image/*" aria-label={`Client ${i+1} logo`} onChange={e=>upload(e,image=>setClients(clients.map((v,j)=>j===i?{...v,image}:v)))}/><button type="button" aria-label={`Remove client ${i+1}`} onClick={()=>setClients(clients.filter((_,j)=>j!==i))}><Trash2 size={13}/></button></div>)}<button className="add-block" type="button" onClick={()=>setClients([...clients,{id:"client-"+crypto.randomUUID().slice(0,8),name:"Client name",relationship:"Add a collaboration",image:"",url:"",visible:true}])}><Plus size={14}/> Add logo</button></div>}
              <p className="form-note">
                Add a new post to this page by appending /new to its URL. Use
                Content to edit posts.
              </p>
            </>
          ) : mode === "certificates" ? (
            <>
              <button
                className="add-block"
                onClick={() =>
                  setCertificateDraft([
                    ...certificateDraft,
                    {
                      id: crypto.randomUUID(),
                      title: "New certificate",
                      issuer: "",
                      date: "",
                      url: "",
                    },
                  ])
                }
              >
                <Plus size={14} /> Add certificate
              </button>
              <p className="form-note">
                Add your actual credentials, certificate image and verification
                link. Publish website to show them on the Certificates page.
              </p>
            </>
          ) : mode === "content" ? (
            <>
              <label>PROJECT</label>
              <select value={index} onChange={(e) => setIndex(+e.target.value)}>
                {draft.map((p, i) => (
                  <option key={p.id} value={i}>
                    {p.title}
                  </option>
                ))}
              </select>
              <label>Category</label>
              <select
                value={p.category}
                onChange={(e) => patch({ category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label>Title</label>
              <input
                value={p.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
              <label>Introduction</label>
              <textarea
                rows="4"
                value={p.summary}
                onChange={(e) => patch({ summary: e.target.value })}
              />
              <label>Square cover</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  upload(e, (image) => patch({ coverImage: image }))
                }
              />
              <label>ADD A SECTION</label>
              <button
                className="add-block"
                onClick={() =>
                  patch({
                    blocks: [
                      ...p.blocks,
                      {
                        id: crypto.randomUUID(),
                        type: "text",
                        title: "New section",
                        text: "Write your story here.",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Text section
              </button>
              <button
                className="add-block"
                onClick={() =>
                  patch({
                    blocks: [
                      ...p.blocks,
                      {
                        id: crypto.randomUUID(),
                        type: "grid",
                        preset: 1,
                        images: [],
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Image composition
              </button>
              <button
                className="add-block"
                onClick={() =>
                  patch({
                    blocks: [
                      ...p.blocks,
                      {
                        id: crypto.randomUUID(),
                        type: "html",
                        title: "UX sample",
                        html: "<main style='font-family:system-ui;padding:32px;background:#f5f6fa;color:#202632'><p style='font-size:12px;letter-spacing:.08em;text-transform:uppercase'>HTML sample</p><h1 style='font-size:36px;margin:18px 0'>Your UX prototype lives here.</h1><button style='padding:12px 16px;border:1px solid #202632;background:white'>Try the interaction</button></main>",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> HTML sample
              </button>
              <p className="form-note">
                Edit directly in the page. Drag section handles to change the
                order. HTML samples render in a sandboxed preview and never
                access the parent page.
              </p>
            </>
          ) : null}
          </details><p className="editor-status" role="status">
            {notice}
          </p>
        </aside>
        <div className={"editor-canvas"+(mode==="content"?" project-edit-canvas":"")}><div className="canvas-context-bar" data-editor-ui><span>{mode==='page'?contextPath:mode==='content'?'Project':mode==='journal'?'Journal':'Site'}</span>{mode==='content' && <><select aria-label="Current project" value={index} onChange={e=>setIndex(+e.target.value)}>{draft.map((project,i)=><option key={project.id} value={i}>{project.title}</option>)}</select><button onClick={addPost}><Plus size={14}/> New project</button></>}{mode==='journal' && <><select aria-label="Current note" value={blogIndex} onChange={e=>setBlogIndex(+e.target.value)}>{blogDraft.map((post,i)=><option key={post.id} value={i}>{post.title}</option>)}</select><button onClick={addBlogPost}><Plus size={14}/> New note</button></>}<small>Click text to write · use handles to move modules</small></div><EditingPath.Provider value={contextPath}><VisualCopy editable copy={pages["/site"]?.copy || {}} scope="site" onChange={(key,value)=>setPages(current=>({...current,"/site":{...current["/site"],copy:{...current["/site"]?.copy,[key]:value}}}))}>{["content","journal","certificates"].includes(mode) && <EditableHeader navItems={siteNav} onNavChange={updateNav} onReorder={setNavItems} onAdd={addNavItem} onRemove={i=>setNavItems(siteNav.filter((_,j)=>j!==i))}/>}
          {mode === "settings" ? <SettingsPanel value={pages["/site"]?.settings||{}} onChange={settings=>setPages(current=>({...current,"/site":{...current["/site"],settings}}))}/> : mode === "journal" ? (
            blog ? <div className="blog-editor-preview"><div className="canvas-insert" data-editor-ui><label>Topic<input value={blog.category||''} onChange={e=>patchBlogPostById(blog.id,{category:e.target.value})}/></label><label>Date<input type="date" value={blog.date||''} onChange={e=>patchBlogPostById(blog.id,{date:e.target.value})}/></label><label>Cover<input type="file" accept="image/*" onChange={e=>upload(e,coverImage=>patchBlogPostById(blog.id,{coverImage}))}/></label></div><div className="blog-post-heading"><span className="eyebrow">{blog.category} / {blog.date}</span><h1 contentEditable suppressContentEditableWarning onBlur={e=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,title:e.currentTarget.innerText}:v))}>{blog.title}</h1><p contentEditable suppressContentEditableWarning onBlur={e=>setBlogDraft(blogDraft.map((v,i)=>i===blogIndex?{...v,excerpt:e.currentTarget.innerText}:v))}>{blog.excerpt}</p></div><div className="blog-post-cover">{blog.coverImage ? <img src={blog.coverImage} alt="" /> : <Art index={blog.cover||0}/>}</div><div className="canvas-insert" data-editor-ui><span>Start with a template</span>{Object.entries(articleTemplates).map(([name,markdown])=><button key={name} onClick={()=>patchBlogPostById(blog.id,{blocks:[...(blog.blocks||[]),{id:crypto.randomUUID(),type:'markdown',markdown}]})}>{name}</button>)}<span>Or add a module</span>{['text','image','html','markdown'].map(type=><button key={type} onClick={()=>patchBlogPostById(blog.id,{blocks:[...(blog.blocks||[]),{id:crypto.randomUUID(),type,title:'New section',text:'Write here.',html:'',image:'',caption:''}]})}><Plus size={14}/> {type === 'html' ? 'HTML file / prototype' : type}</button>)}</div><BlogEditorBlocks blocks={blog.blocks || []} onPatch={patchBlogBlock} onMove={moveBlogBlock} onRemove={removeBlogBlock} onUpload={uploadBlogImage} onReorder={blocks=>patchBlogPostById(blog.id,{blocks})}/></div> : null
          ) : mode === "page" ? (
              contextPath === "/" ? <div className="home-edit-preview"><EditableHeader navItems={siteNav} onNavChange={updateNav} onReorder={setNavItems} onAdd={addNavItem} onRemove={i=>setNavItems(siteNav.filter((_,j)=>j!==i))}/><Home projects={draft} stats={stats} clients={clients} blogPosts={blogDraft} homeSections={editableHomeSections} pageOverride={pages["/"] || {}} editable onPagePatch={values=>setPages(current=>({...current,"/":{...current["/"],...values}}))} onProjectTitleChange={(id,title)=>patchProjectById(id,{title})} onStatsChange={patchStatById} onClientChange={patchClientById} onClientsChange={setClients} onBlogChange={patchBlogPostById} onSectionsChange={setHomeSections} onFeaturedOrder={selectedProjects=>setPages(current=>({...current,"/":{...current["/"],selectedProjects}}))} onCoverChange={(id,coverImage)=>patchProjectById(id,{coverImage})} onFeaturedChange={(i,id)=>{const selectedProjects=[...(pages["/"]?.selectedProjects||[])];selectedProjects[i]=id;setPages({...pages,"/":{...pages["/"],selectedProjects}});}}/><Footer/></div> : (
            <><EditableHeader navItems={siteNav} onNavChange={updateNav} onReorder={setNavItems} onAdd={addNavItem} onRemove={i=>setNavItems(siteNav.filter((_,j)=>j!==i))}/>{contextPath === '/about' ? <About/> : contextPath === '/resume' ? <About/> : contextPath === '/services' ? <Services/> : contextPath === '/contact' ? <Contact/> : contextPath === '/work' ? <Work projects={draft}/> : ['/journal','/blog'].includes(contextPath) ? <Journal blogPosts={blogDraft}/> : <EditablePagePreview contextPath={contextPath} pages={pages} navItems={siteNav} onNavChange={updateNav} onPagePatch={values=>setPages({...pages,[contextPath]:{...pages[contextPath],...values}})}/>}<PageModules blocks={pages[contextPath]?.blocks || []} onChange={blocks=>setPages({...pages,[contextPath]:{...pages[contextPath],blocks}})}/><Footer/></>
            )
          ) : mode === "certificates" ? (
            <div className="credential-editor">
              <span className="eyebrow">CREDENTIALS / EDIT MODE</span>
              <h1>Certificates</h1><button data-editor-ui className="button" onClick={()=>setCertificateDraft([...certificateDraft,{id:crypto.randomUUID(),title:"New certificate",issuer:"",date:"",url:""}])}>Add certificate</button>
              {certificateDraft.length === 0 && (
                <p>Add a certificate to begin.</p>
              )}
              {certificateDraft.map((c, i) => (
                <section key={c.id}>
                  <label>
                    Certificate title
                    <input
                      aria-label="Certificate title"
                      value={c.title}
                      onChange={(e) =>
                        setCertificateDraft(
                          certificateDraft.map((v, j) =>
                            j === i ? { ...v, title: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  {[
                    ["issuer", "Issuer"],
                    ["date", "Date"],
                    ["url", "Verification URL"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        value={c[key]}
                        onChange={(e) =>
                          setCertificateDraft(
                            certificateDraft.map((v, j) =>
                              j === i ? { ...v, [key]: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label>Description<textarea rows={4} value={c.description||""} onChange={e=>setCertificateDraft(current=>current.map(v=>v.id===c.id?{...v,description:e.target.value}:v))}/></label><label className="certificate-honour"><input type="checkbox" checked={!!c.topTenPercent} onChange={e=>setCertificateDraft(current=>current.map(v=>v.id===c.id?{...v,topTenPercent:e.target.checked}:v))}/> Top 10% of class</label><small>Enable the badge only for credentials where this distinction was awarded. Certificate image: 1600–2400 px wide; keep the full document visible.</small>
                  <label>
                    Certificate image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        upload(e, (image) =>
                          setCertificateDraft(
                            certificateDraft.map((v, j) =>
                              j === i ? { ...v, image } : v,
                            ),
                          ),
                        )
                      }
                    />
                  </label>
                  {c.image && <img src={c.image} alt={c.title} />}
                  <button
                    className="add-block"
                    onClick={() =>
                      setCertificateDraft(
                        certificateDraft.filter((v) => v.id !== c.id),
                      )
                    }
                  >
                    Remove certificate
                  </button>
                </section>
              ))}
            </div>
          ) : mode === "site" ? (
            <div className="site-edit-preview"><EditableHeader navItems={siteNav} onNavChange={updateNav} onReorder={setNavItems} onAdd={addNavItem} onRemove={i=>setNavItems(siteNav.filter((_,j)=>j!==i))}/><p data-editor-ui className="form-note">Edit menu labels in place. Use the grip to move a link and its settings button to change the destination.</p><Footer/></div>
          ) : (
            <main className="project-page project-editor-page">
              <div className="project-heading">
                <span className="eyebrow">
                  {p.category} /{" "}
                  {p.sample === false ? "CASE STUDY" : "CONCEPT STUDY"}
                </span>
                <h1
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => patch({ title: e.target.innerText })}
                >
                  {p.title}
                </h1>
                <p contentEditable suppressContentEditableWarning onBlur={e=>patch({summary:e.currentTarget.innerText})}>{p.summary}</p>
              </div>
              <section className="project-upload-guide" data-editor-ui><div><span>01 / PROJECT COVER</span><h2>Choose the image that introduces your project.</h2><p>This square cover appears on project cards and the homepage feature. Choose the main image for the case-study page separately below.</p></div><label className="upload-cover-button">{p.coverImage ? 'Replace project cover' : 'Upload project cover'}<input aria-label="Upload project cover" type="file" accept="image/*" onChange={e=>upload(e,coverImage=>patch({coverImage}))}/></label><small>Recommended: 2400 × 2400 px (1:1). PNG, JPG or WebP. High-quality WebP export; no upscaling. Keep the subject inside the centre 80%.</small></section>
              <section className="project-upload-guide" data-editor-ui><div><span>02 / CASE-STUDY MAIN IMAGE</span><h2>A separate opening image for this project.</h2><p>Recommended: 2400 × 2400 px. This image opens the case study; it does not change the card cover. If empty, your cover is used as a fallback.</p></div><label>Upload main image<input aria-label="Upload main image" type="file" accept="image/*" onChange={e=>upload(e,heroImage=>patch({heroImage}))}/></label>{p.heroImage&&<button onClick={()=>patch({heroImage:""})}>Use cover as main image</button>}</section>
              <div className="project-hero">
                {(p.heroImage || p.coverImage) ? (
                  <img src={p.heroImage || p.coverImage} alt="Project main image" />
                ) : (
                  <Art index={p.cover} />
                )}
              </div>
              <CaseFields project={p} onChange={patch}/><div className="canvas-insert" data-editor-ui><div className="case-content-guide"><strong>03 / CASE-STUDY CONTENT</strong><p>Add text and image compositions below. These images belong inside the story and do not replace your cover. Full-width: 2400 px wide, any aspect ratio. Two-column images: at least 1200 px wide each. Fine text and diagrams: export at 2× display size.</p></div><label>Category<select value={p.category} onChange={e=>patch({category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>{['text','image','grid','html'].map(type=><button key={type} onClick={()=>patch({blocks:[...p.blocks,{id:crypto.randomUUID(),type,title:'New section',text:'Write here.',preset:1,images:[],html:''}]})}><Plus size={14}/>{type==='grid'?'Image composition':type==='image'?'Full-width image':type==='html'?'HTML file / prototype':'Text'}</button>)}</div>
              <SortableGroup
                as="div"
                axis="y"
                values={p.blocks}
                onReorder={(blocks) => patch({ blocks })}
                className="block-list"
              >
                {p.blocks.map((b, i) => (
                  <SortableBlock key={b.id} value={b}>
                    {(controls) => (
                      <>
                        <div className="block-controls" data-editor-ui>
                          <button
                            onPointerDown={(e) => controls.start(e)}
                            className="drag-handle"
                            aria-label="Drag section"
                          >
                            <GripVertical size={16} />
                          </button>
                          <small>
                            {b.type === "text" ? "TEXT" : b.type === "html" ? "HTML SAMPLE" : "IMAGE COMPOSITION"} /{" "}
                            {String(i + 1).padStart(2, "0")}
                          </small>
                          <button
                            aria-label="Move up"
                            disabled={i === 0}
                            onClick={() => {
                              const blocks = [...p.blocks];
                              [blocks[i - 1], blocks[i]] = [
                                blocks[i],
                                blocks[i - 1],
                              ];
                              patch({ blocks });
                            }}
                          >
                            ↑
                          </button>
                          <button
                            aria-label="Move down"
                            disabled={i === p.blocks.length - 1}
                            onClick={() => {
                              const blocks = [...p.blocks];
                              [blocks[i + 1], blocks[i]] = [
                                blocks[i],
                                blocks[i + 1],
                              ];
                              patch({ blocks });
                            }}
                          >
                            ↓
                          </button>
                          <button
                            aria-label="Duplicate section"
                            onClick={() =>
                              patch({
                                blocks: [
                                  ...p.blocks.slice(0, i + 1),
                                  { ...b, id: crypto.randomUUID() },
                                  ...p.blocks.slice(i + 1),
                                ],
                              })
                            }
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            aria-label="Delete section"
                            onClick={() =>
                              patch({
                                blocks: p.blocks.filter((x) => x.id !== b.id),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {b.type === "text" ? (
                          <section className="text-block">
                            <h2
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                blockPatch(b.id, {
                                  title: e.target.innerText,
                                })
                              }
                            >
                              {b.title}
                            </h2>
                            <p
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                blockPatch(b.id, { text: e.target.innerText })
                              }
                            >
                              {b.text}
                            </p>
                          </section>
                        ) : b.type === "image" ? (
                          <figure className="case-single-image"><div data-editor-ui><label>Upload case-study image<input type="file" accept="image/*" onChange={e=>upload(e,image=>blockPatch(b.id,{image}))}/></label><label>Image description<input value={b.alt||""} onChange={e=>blockPatch(b.id,{alt:e.target.value})}/></label><label>Caption<input value={b.caption||""} onChange={e=>blockPatch(b.id,{caption:e.target.value})}/></label></div>{b.image&&<img src={b.image} alt={b.alt||"Project detail"}/>}</figure>
                        ) : b.type === "html" ? (
                          <HtmlPreview block={b} editable onChange={html=>blockPatch(b.id,{html})} onTitleChange={title=>blockPatch(b.id,{title})} />
                        ) : (
                          <>
                            <div className="preset-picker" data-editor-ui>
                              {presets.map((preset) => (
                                <button
                                  className={
                                    Number(b.preset) === preset.id
                                      ? "active"
                                      : ""
                                  }
                                  key={preset.id}
                                  title={"Grid " + preset.id}
                                  onClick={() =>
                                    blockPatch(b.id, { preset: preset.id })
                                  }
                                >
                                  <GridPreview id={preset.id} />
                                  <small>
                                    {String(preset.id).padStart(2, "0")}
                                  </small>
                                </button>
                              ))}
                            </div>
                            <Grid block={b} cover={p.cover} />
                            <div className="grid-uploads" data-editor-ui>
                              {Array.from(
                                { length: presets[Number(b.preset) - 1].count },
                                (_, j) => (
                                  <label key={j}>
                                    Image {j + 1}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        upload(e, (image) => {
                                          const images = [...(b.images || [])];
                                          images[j] = image;
                                          blockPatch(b.id, { images });
                                        })
                                      }
                                    />
                                  </label>
                                ),
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </SortableBlock>
                ))}
              </SortableGroup>
            </main>
          )}
        {["content","journal","certificates"].includes(mode) && <Footer/>}</VisualCopy></EditingPath.Provider></div>
      </div>
    </div>
  );
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
  const isWorkspace =
    /\/(edit|new)\/?$/.test(location.pathname) ||
    location.pathname === "/admin" ||
    location.pathname.startsWith("/edit/");
  const edit = isWorkspace || location.pathname === "/login";
  return (
    <PageContent.Provider value={{ pages, setPages }}><SiteMetadata settings={pages["/site"]?.settings}/>
      <Taxonomy.Provider
        value={{
          categories: taxonomy,
          categoryIds: taxonomy.map(slugify),
          setCategories: setTaxonomy,
        }}
      >
        <VisualCopy copy={pages["/site"]?.copy || {}} scope="site">
        <a className="skip" href="#main">
          Skip to content
        </a>
        {!edit && (
          <header>
            <Link className="logo" to="/" aria-label="Desartly home">
              Desartly<span>®</span>
            </Link>
            <span className="header-name">
              DESARTLY
              <br />
              DESIGN PORTFOLIO
            </span>
            <nav>{mergeNavigation(Array.isArray(navItems) ? navItems : defaultNav).map(item => <SiteNavLink key={item.id || item.to} item={item} active={location.pathname === item.to} />)}</nav>
          </header>
        )}
        <div id="main">
          {isWorkspace ? (
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
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={<Home projects={projects} stats={stats} clients={clients} blogPosts={blogPosts} homeSections={homeSections} />}
              />
              <Route path="/work" element={<Work projects={projects} />} />
              <Route path="/journal" element={<Journal blogPosts={blogPosts} />} />
              <Route path="/blog" element={<Journal blogPosts={blogPosts} />} />
              <Route path="/journal/:slug" element={<BlogPost blogPosts={blogPosts} />} />
              <Route path="/blog/:slug" element={<BlogPost blogPosts={blogPosts} />} />
              <Route
                path="/work/:slug"
                element={<Project key={location.pathname} projects={projects} />}
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
                      This local frontend preview stores edited content and
                      inquiry drafts in your browser. It does not send inquiries
                      or connect to analytics or cloud storage. Owner access
                      uses a server-verified session cookie. A production
                      privacy policy will be added before launch.
                    </p>
                  </main>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
          {!edit && <PagePosts projects={projects} />}{!edit && <PageModules blocks={pages[location.pathname]?.blocks || []}/>}
        </div>
        {!edit && <Footer />}
        </VisualCopy>
      </Taxonomy.Provider>
    </PageContent.Provider>
  );
}
bootstrapCloud().then(()=>createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
));
