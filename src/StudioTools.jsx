import {publicOrigin} from '../server/site-domains.js';
import {useLocation} from 'react-router-dom';
import {metadata} from './cms/metadata';
import React,{useState,useEffect} from 'react';
const ReactMarkdown=React.lazy(()=>import('react-markdown')); 
export const articleTemplates={
  'Design story':'## The starting point\n\nWhat sparked this idea? Describe the context.\n\n## The design decision\n\nExplain what you explored and why you chose this direction.\n\n> One clear insight worth remembering.\n\n## What I learned\n\n- First observation\n- Second observation\n\n## What comes next\n\nShare your next question or experiment.',
  'UX breakdown':'## The challenge\n\nDescribe the user problem.\n\n## What I observed\n\n1. First observation\n2. Second observation\n\n## The approach\n\nExplain the reasoning behind your solution.\n\n![Describe your design](/your-image.webp)\n\n## The outcome\n\nDescribe the outcome with evidence.\n\n## Takeaways\n\nWhat would you do differently?',
  'Short note':'## An idea worth sharing\n\nWrite your opening thought.\n\n**The key point:** explain it in one sentence.\n\n## Further reading\n\n[Link title](https://example.com)'
};
export function MarkdownContent({source=''}){return <div className="markdown-content"><React.Suspense fallback={<p>Loading article…</p>}><ReactMarkdown skipHtml>{source}</ReactMarkdown></React.Suspense></div>}
export function MarkdownEditor({value='',onChange}){const[tab,setTab]=useState('split');return <section className="markdown-studio" data-editor-ui><div className="markdown-tools"><b>Markdown article</b><select aria-label="Markdown view" value={tab} onChange={e=>setTab(e.target.value)}><option value="split">Write & preview</option><option value="write">Write</option><option value="preview">Preview</option></select><label className="md-import">Import .md<input type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={async e=>{const f=e.target.files[0];if(f&&f.size<500000)onChange(await f.text());}}/></label></div><div className={'markdown-panes '+tab}>{tab!=='preview'&&<textarea aria-label="Markdown source" value={value} onChange={e=>onChange(e.target.value)} spellCheck placeholder="## Start your story"/>}{tab!=='write'&&<MarkdownContent source={value}/>}</div><small>## Heading · **bold** · *italic* · [link](url) · ![description](image URL) · lists · quotes · code</small></section>}
export function SettingsPanel({value,onChange}){
 const[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function password(e){e.preventDefault();const form=e.currentTarget;const data=new FormData(form);if(data.get('newPassword')!==data.get('confirm')){setStatus('The new passwords do not match.');return;}setBusy(true);try{const r=await fetch('/api/owner/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:data.get('current'),newPassword:data.get('newPassword')})});const result=await r.json();if(!r.ok)throw Error(result.error);form.reset();setStatus('Password changed. Sign in again with your new password.');}catch(err){setStatus(err.message)}finally{setBusy(false)}}
 return <main className="studio-settings" data-editor-ui><div className="studio-heading"><span>DESARTLY / STUDIO SETTINGS</span><h1>The details that make it yours.</h1><p>Identity, browser appearance and owner access.</p></div><section><h2>Site identity</h2><p>Use Save settings draft below, then Publish these settings when ready.</p><label>Browser title<input value={value.title||'Desartly'} onChange={e=>onChange({...value,title:e.target.value})}/></label><label>Site description<textarea value={value.description||''} onChange={e=>onChange({...value,description:e.target.value})}/></label><label>Favicon · PNG, WebP or ICO (under 256 KB)<input type="file" accept="image/png,image/webp,.ico" onChange={e=>{const file=e.target.files[0];if(!file)return;if(file.size>262144){setStatus('Choose a favicon under 256 KB.');return;}const reader=new FileReader();reader.onload=()=>onChange({...value,favicon:reader.result});reader.readAsDataURL(file);}}/></label><div className="favicon-preview"><img src={value.favicon||'/favicon.svg'} alt="Favicon preview"/><span>{value.title||'Desartly'}</span><button onClick={()=>onChange({...value,favicon:''})}>Reset icon</button></div></section><section><h2>Owner password</h2><p>This changes your server login. It is separate from saving page edits.</p><form onSubmit={password}><label>Current password<input name="current" type="password" autoComplete="current-password" required/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/></label><label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={12} required/></label><button className="dark" disabled={busy}>{busy?'Changing…':'Change password'}</button></form><p role="status">{status}</p></section></main>
}
export function SiteMetadata({settings,site}){
 const {pathname}=useLocation();
 useEffect(()=>{
  const m=metadata(site,pathname);
  document.title=m.title;
  const setMeta=(selector,attribute,value)=>document.querySelector(selector)?.setAttribute(attribute,value);
  setMeta('meta[name=description]','content',m.description);
  setMeta('link[rel=icon]','href',settings?.favicon||'/favicon.svg');
  setMeta('link[rel=canonical]','href',publicOrigin+pathname);
  setMeta('meta[property="og:title"]','content',m.title);
  setMeta('meta[property="og:description"]','content',m.description);
  setMeta('meta[property="og:url"]','content',publicOrigin+pathname);
  const image=document.querySelector('meta[property="og:image"]');
  if(m.image){const node=image||document.createElement('meta');node.setAttribute('property','og:image');node.content=new URL(m.image,publicOrigin).href;if(!image)document.head.append(node);}else image?.remove();
 },[settings,site,pathname]);return null;
}
