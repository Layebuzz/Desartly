import React from 'react';
import { Link } from 'react-router-dom';

import {resumeProfile} from './resume-content.js';
export {resumeProfile} from './resume-content.js';

export function ResumeProfile({profile=resumeProfile,afterExperience,afterExpertise,beforeLearning,sectionOrder,hiddenSections=[],labels={}}) {
  const content=<div className="resume-profile">
    <nav className="resume-index" aria-label="Resume sections">{[['experience','Experience'],['selected-work','Projects'],['expertise','Expertise'],['practice-map','Practice map'],['impact','Design impact'],['selected-credentials','Certificates'],['learning','Learning']].filter(([id])=>!hiddenSections.includes(id)&&(!['selected-work','practice-map','selected-credentials'].includes(id)||sectionOrder)).map(([id,title])=><a href={'#'+id} key={id}>{title}<span>↗</span></a>)}</nav>
    <section id="experience" className="profile-section"><div className="profile-section-heading"><span>01 / EXPERIENCE</span><h3>{labels.experienceTitle||'Experience & creative leadership'}</h3></div><div className="experience-list">{profile.experience.map((job,index)=><article className={'experience-entry'+(!index?' is-current':'')} key={job.company}><span className="experience-sequence" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="experience-heading"><div><small>{job.period||'PROFESSIONAL EXPERIENCE'}</small><h4>{job.company}</h4></div><span>{job.role}</span></div><p>{job.description}</p></article>)}</div></section>
    {afterExperience}
    <section id="expertise" className="profile-section"><div className="profile-section-heading"><span>02 / EXPERTISE</span><h3>{labels.expertiseTitle||'Skills, craft & tools'}</h3></div><div><div className="expertise-grid">{profile.skills.map(skill=><article key={skill.title}><h4>{skill.title}</h4><ul>{skill.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div><div className="software-list"><h4>Tools I work with</h4><div>{profile.tools.map(tool=><span key={tool}>{tool}</span>)}</div><p>{labels.toolsNote||'Advanced Adobe workflows, with fluency across PC, Mac and Office applications.'}</p></div></div></section>
    {afterExpertise}
    <section id="impact" className="profile-section"><div className="profile-section-heading"><span>03 / DESIGN IMPACT</span><h3>{labels.impactTitle||'Design impact'}</h3></div><ol className="impact-list">{profile.impact.map((item,i)=><li key={item}><span>{String(i+1).padStart(2,'0')}</span><p>{item}</p></li>)}</ol></section>
    {beforeLearning}
    <section id="learning" className="profile-section"><div className="profile-section-heading"><span>04 / LEARNING</span><h3>{labels.learningTitle||'Courses & continuing education'}</h3></div><div className="learning-columns"><div className="honours-card"><h4>Honours & distinctions</h4><ul className="honours-list">{profile.honours.map(item=><li key={item}>{item}</li>)}</ul><p>{labels.learningNote||'My development connects human-centred design, strategic thinking and emerging creative technologies.'}</p></div><article className="training-list"><div className="training-heading"><h4>Courses & advanced training</h4><span>{profile.training.length} courses</span></div><div className="training-details"><ul>{profile.training.map(item=><li key={item}>{item}</li>)}</ul></div></article></div></section>
  </div>;
  if(!sectionOrder)return content;
  const children=React.Children.toArray(content.props.children),nav=children.find(c=>c.type==='nav'),sections=children.filter(c=>c.type!=='nav');
  return <div className="resume-profile">{nav}{sectionOrder.filter(id=>!hiddenSections.includes(id)).map(id=>sections.find(c=>c.props.id===id))}</div>;
}
