import React from 'react';
import {Download,FileText} from 'lucide-react';

export function CaseStudySkill(){
 return <section className="cms-skill-download" aria-labelledby="cms-skill-title">
  <FileText size={22} aria-hidden="true"/>
  <div><h2 id="cms-skill-title">Your case-study assistant</h2><p>Give your assistant a library folder. Build an evidence-led story and publish through the CMS.</p><code>$desartly-case-study</code><span>Product · Branding · Communication Design</span></div>
  <a className="cms-button" href="/downloads/desartly-case-study.zip?v=1.0.1" download="desartly-case-study.zip"><Download size={16} aria-hidden="true"/>Download skill <small>ZIP · v1.0.1</small></a>
 </section>;
}
