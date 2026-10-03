import React,{useEffect,useRef,useState} from 'react';
import {ArrowDown,Check,Search,X} from 'lucide-react';
import {disciplines,projectDiscipline,projectIndustry} from './project-tags.js';
import './work-filters.css';
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function WorkFilters({projects,active,industry,setParams}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');const root=useRef(null),trigger=useRef(null),search=useRef(null);
 const scope=projects.filter(p=>!active||slug(projectDiscipline(p))===active);
 const industries=[...new Set(scope.map(projectIndustry).filter(Boolean))].sort();
 const selected=industries.find(x=>slug(x)===industry);
 const count=scope.filter(p=>!industry||slug(projectIndustry(p))===industry).length;
 function close(){setOpen(false);setQuery('');trigger.current?.focus();}
 useEffect(()=>{if(!open)return;search.current?.focus();const outside=e=>{if(!root.current?.contains(e.target)){setOpen(false);setQuery('');}};const key=e=>{if(e.key==='Escape'){e.preventDefault();close();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
 function choose(value){setParams({...active?{category:active}:{},...value?{industry:slug(value)}:{}});close();}
 return <section className="work-explorer" aria-label="Filter projects">
  <div className="work-explorer-top"><span className="work-explorer-label">EXPLORE THE WORK</span><span className="work-explorer-result" role="status"><b>{String(count).padStart(2,'0')}</b> {count===1?'project':'projects'}{(active||industry)&&<button onClick={()=>setParams({})} aria-label="Clear all filters"><X size={14}/> Clear</button>}</span></div>
  <div className="work-explorer-controls"><div className="work-discipline-tabs" role="group" aria-label="Design discipline">{['All work',...disciplines].map((name,i)=>{const value=i?slug(name):null;const total=i?projects.filter(p=>projectDiscipline(p)===name).length:projects.length;return <button key={name} aria-pressed={active===value} className={active===value?'selected':''} onClick={()=>setParams(value?{category:value}:{})}><span>{name}</span><sup>{String(total).padStart(2,'0')}</sup></button>})}</div>
  <div className="work-industry" ref={root}><button ref={trigger} className={'industry-trigger '+(industry?'selected':'')} aria-expanded={open} aria-controls="industry-options" onClick={()=>setOpen(v=>!v)}><span><small>Industry</small>{selected||'All industries'}</span><ArrowDown size={18}/></button>
  {open&&<div id="industry-options" className="industry-popover"><label className="industry-search"><Search size={17}/><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find an industry" aria-label="Search industries"/></label><div className="industry-options"><button aria-pressed={!industry} onClick={()=>choose('')}>All industries <span>{scope.length}</span>{!industry&&<Check size={16}/>}</button>{industries.filter(n=>n.toLowerCase().includes(query.toLowerCase())).map(n=><button key={n} aria-pressed={selected===n} onClick={()=>choose(n)}>{n}<span>{scope.filter(p=>projectIndustry(p)===n).length}</span>{selected===n&&<Check size={16}/>}</button>)}{!industries.some(n=>n.toLowerCase().includes(query.toLowerCase()))&&<p role="status">No matching industry. Try another word.</p>}</div></div>}
  </div></div>
 </section>
}
