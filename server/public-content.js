import {privacyBody} from '../src/privacy-content.js';
import {resolveAbout} from '../src/about-content.js';
import {practiceStats} from '../src/cms/practice-stats.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const links=[['/','Home'],['/work','Projects'],['/about','About'],['/services','Services'],['/journal','Journal'],['/certificates','Certificates'],['/contact','Book a call']];
const visible=items=>(items||[]).filter(d=>!d.archived&&!d.hidden);
const text=value=>typeof value==='string'&&value.trim()?'<p>'+esc(value)+'</p>':'';
function block(b){if(!b||typeof b!=='object')return '';const heading=b.title?'<h2>'+esc(b.title)+'</h2>':'';if(['text','markdown'].includes(b.type))return '<section>'+heading+text(b.text||b.markdown)+'</section>';if(b.type==='image')return heading+image(b.image,b.alt);if(['grid','composition'].includes(b.type))return heading+(b.images||[]).map((url,i)=>image(url,b.alts?.[i]||'')).join('');if(b.type==='html')return heading+text(b.description||'Interactive interface — open the live preview.');return heading+text(b.description);}
function image(url,alt){if(typeof url!=='string'||!/^\/(?![\/\\])|^https:\/\//.test(url))return '';return '<img loading="lazy" src="'+esc(url)+'" alt="'+esc(alt||'')+'" style="max-width:100%;height:auto"/>';}
export function knownPublicPath(site,path){if(links.some(([p])=>p===path)||path==='/privacy')return true;const[area,id,...extra]=path.split('/').filter(Boolean);return !extra.length&&['work','journal'].includes(area)&&visible(area==='work'?site.projects:site.blogPosts).some(d=>d.id===id);}
export function initialPublicContent(site,path){
 if(!knownPublicPath(site,path))return '<main id="main"><h1>Page not found</h1><p>This page is unavailable.</p><a href="/work">Browse projects</a></main>';
 const[area,id]=path.split('/').filter(Boolean),doc=visible(area==='work'?site.projects:area==='journal'?site.blogPosts:[]).find(d=>d.id===id),page=site.pages?.[path]||{};
 const titles={'/':'Ali Komeili — Independent designer','/work':'Selected projects','/journal':'Journal','/about':'About Ali Komeili','/services':'Design services','/certificates':'Certificates','/contact':'Book a project conversation','/privacy':'Privacy'};
 let body=text(doc?.summary||doc?.excerpt||page.intro)+text(doc?null:page.body);
 if(doc){body+=text(doc.author)+text(doc.date);body+=image(doc.heroImage||doc.coverImage,doc.title);for(const key of ['clientDescription','challenge','role','deliverables','outcome','credits'])body+=text(doc[key]);body+=(doc.blocks||[]).map(block).join('');}
 else{body+=(page.blocks||[]).map(block).join('');body+=(page.sections||[]).filter(s=>s&&typeof s==='object'&&s.visible!==false).map(block).join('');if(path==='/'||path==='/work')body+='<ul>'+visible(site.projects).map(p=>'<li><a href="/work/'+encodeURIComponent(p.id)+'">'+esc(p.title)+'</a>'+text(p.summary)+'</li>').join('')+'</ul>';if(path==='/journal')body+='<ul>'+visible(site.blogPosts).map(p=>'<li><a href="/journal/'+encodeURIComponent(p.id)+'">'+esc(p.title)+'</a>'+text(p.excerpt)+'</li>').join('')+'</ul>';}
 if(path==='/about'){
  const about=resolveAbout(page,site.pages?.['/resume']?.resumeProfile);
  if(!page.intro)body+=text(about.intro);if(!page.body)body+=text(about.body);
  if(!about.hiddenSections.includes('experience'))body+='<section><h2>'+esc(about.experienceTitle)+'</h2>'+about.resumeProfile.experience.map(j=>'<article><h3>'+esc(j.company)+' · '+esc(j.role)+'</h3>'+text(j.description)+'</article>').join('')+'</section>';
  if(!about.hiddenSections.includes('expertise'))body+='<section><h2>'+esc(about.expertiseTitle)+'</h2>'+about.resumeProfile.skills.map(g=>'<h3>'+esc(g.title)+'</h3><ul>'+g.items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>').join('')+'</section>';
 }
 if(path==='/certificates')body+=text('A record of learning, practice and new perspectives.')+(site.certificates||[]).map(c=>'<article><h2>'+esc(c.title||c.name)+'</h2>'+text(c.issuer)+text(c.description)+image(c.image,c.title)+'</article>').join('');
 if(path==='/services')body+=(site.categories||[]).slice(0,3).map((name,i)=>'<section><h2>'+esc(name)+'</h2>'+text(['Product discovery, UX flows, interface design, design systems and AI agent experiences.','Visual identity, art direction, brand guidelines and applications.','Advertising concepts, packaging, key visuals and connected brand touchpoints.'][i])+'<a href="/contact">Discuss a project</a></section>').join('');
 if(path==='/privacy'&&!page.body)body+=text(privacyBody);
 if(path==='/contact')body+=text('Choose a project briefing or a mentoring session. Share a little context, then reserve 30 minutes with Ali.')+text('30 minutes · Google Meet')+'<a href="https://book.desartly.info/">Choose an appointment time</a>';
 if(path==='/'&&(!site.homeSections?.length||site.homeSections.some(s=>(typeof s==='string'?s:s.id)==='stats'&&s.visible!==false)))body+='<section aria-label="Selected practice statistics">'+practiceStats(site).map(s=>'<article><strong>'+esc(s.value)+'</strong><h3>'+esc(s.label)+'</h3>'+text(s.detail)+'</article>').join('')+'</section>';
 return '<header><a href="/">Desartly</a><nav aria-label="Main navigation">'+links.map(([url,label])=>'<a href="'+url+'">'+label+'</a>').join(' · ')+'</nav></header><main id="main"><h1>'+esc(doc?.title||page.title||titles[path])+'</h1>'+body+'</main><footer>'+((site.footer||[]).filter(i=>i.visible!==false&&typeof i.url==='string'&&/^\/(?![\/\\])/.test(i.url)).map(i=>'<a href="'+esc(i.url)+'">'+esc(i.label)+'</a>').join(' · '))+'</footer>';
}
export function pageBody(html,site,path){return html.replace(/<div id="root">\s*<\/div>/,'<div id="root"><div class="initial-public-content">'+initialPublicContent(site,path)+'</div></div>');}
