import React from 'react';
import {Download,FileText} from 'lucide-react';

export function CaseStudySkill({kind='project'}){
 const article=kind==='article',name=article?'desartly-article':'desartly-case-study',version=article?'1.0.1':'1.0.4';
 return <section className="cms-skill-download" aria-labelledby="cms-skill-title">
  <FileText size={22} aria-hidden="true"/>
  <div><h2 id="cms-skill-title">{article?'Your article assistant':'Your case-study assistant'}</h2><p>{article?'Write Persian or English articles with a natural voice, verified research and reader-first SEO.':'Give your assistant a library folder or project files. Build an evidence-led story and publish through the CMS.'}</p><code>{'$'+name}</code><span>{article?'Persian · English · Research · SEO':'Product · Branding · Communication Design'}</span></div>
  <a className="cms-button" href={'/downloads/'+name+'.zip?v='+version} download={name+'.zip'}><Download size={16} aria-hidden="true"/>Download skill <small>ZIP · v{version}</small></a>
 </section>;
}
