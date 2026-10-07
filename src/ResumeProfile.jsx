import React from 'react';
import { Link } from 'react-router-dom';

export const resumeProfile = {
  experience: [
    {company:'Azki',role:'Senior Creative Designer',period:'Past six months',description:'Delivered multiple design projects across graphic design and product design, bringing a consistent creative approach to visual communication and digital experiences.'},
    {company:'Divar',role:'Senior Design Expert',description:'Led the graphic production ecosystem, large-scale visual projects and outsourcing workflows. Developed an external vendor network, evolved the visual identity and improved the request-to-delivery process across teams. Integrated AI tools and shared emerging practices to strengthen production quality and scalability.'},
    {company:'Comica',role:'Design Manager',description:'Led creative direction and end-to-end design delivery across strategy, marketing and production. Managed designers, refined creative standards and built scalable processes connecting brand communication with business goals.'},
    {company:'Flightio',role:'Design Team Lead',description:'Directed user-centred, performance-driven design from concept to execution. Aligned work with product strategy, mentored designers and improved creative workflows and quality standards.'},
    {company:'National Elite Foundation',role:'Art Director',description:'Led artistic direction and visual identity across branding, campaigns and multimedia. Guided designers and artists from concept through execution, collaborating with cross-functional teams to support the foundation’s mission.'},
    {company:'Lingoland',role:'Senior Graphic Designer',description:'Created visual and interface design for a language-learning startup. Worked with the product team to translate complex learning concepts into clear, engaging educational experiences.'},
    {company:'3x4 Studio',role:'Senior Graphic Designer',description:'Developed visual identities for a diverse client portfolio, from logos to complete brand guidelines. Built coherent systems expressing each client’s values and positioning.'},
  ],
  skills: [
    {title:'Product & experience',items:['UX and UI design','Wireframing & prototyping','Human-centred product development']},
    {title:'Identity & craft',items:['Visual identity systems','2D illustration','3D modelling & illustration','Branding & advertising']},
    {title:'Creative systems',items:['Creative direction','Design operations & workflow optimisation','Vendor management','AI prompting & integration']},
  ],
  impact: ['Built a scalable graphic production system for a national-scale platform.','Optimised cross-functional workflows to improve clarity and delivery.','Developed an external vendor network supporting consistent, scalable production.','Guided visual identity across multiple campaigns and touchpoints.','Integrated AI tools into design operations and creative practice.'],
  training: ['Graphic Design — Inverseschool, 2015','Human–Computer Interaction','Design for the 21st Century with Don Norman','Visual Design: The Ultimate Guide','Design Thinking: The Ultimate Guide','Emotional Design: How to Make Products People Will Love','The Ultimate Guide to Visual Perception and Design','User Research: Methods and Best Practices','The Practical Guide to Usability','Become a UX Designer from Scratch','Developing a Creative Concept for Branding Projects','3D Self-Portrait Creation for Social Media in Cinema 4D','3D Character Creation in Blender','Low Poly Character Modeling for Video Games','Midjourney Mastery: Create Visually Stunning AI Art — Udemy','Prompt Engineering — LinkedIn Learning'],
  honours:['Top 10% — Visual Design: The Ultimate Guide, Interaction Design Foundation','Top 10% — Human–Computer Interaction, Interaction Design Foundation','Top 10% — Design for the 21st Century with Don Norman','Selected Art Director — National Opportunity Event, Iranian National Elite Foundation Program, 2021','UX Career Track Completion — Interaction Design Foundation'],
  tools:['Figma','Adobe Photoshop','Adobe Illustrator','Adobe InDesign','Adobe Creative Cloud','Blender','Eevee Renderer'],
};

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
