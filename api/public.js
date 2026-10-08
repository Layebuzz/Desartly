import {pageBody,knownPublicPath} from '../server/public-content.js';
import {metadata} from '../src/cms/metadata.js';
export {metadata} from '../src/cms/metadata.js';
import {readFile} from 'node:fs/promises';
import {publicOrigin,surfaceRoute} from '../server/site-domains.js';
const origin=publicOrigin;
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function articleStructuredData(site,path){
 const id=path.startsWith('/journal/')?path.slice('/journal/'.length):null;
 const doc=(site.blogPosts||[]).find(p=>p.id===id&&!p.archived&&!p.hidden);if(!doc)return '';
 const data={'@context':'https://schema.org','@type':'Article',headline:doc.title,description:doc.excerpt||'',url:origin+path,...(doc.author?{author:{'@type':'Person',name:doc.author}}:{}),...(typeof doc.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(doc.date)?{datePublished:doc.date}:{}),...(doc.coverImage?{image:new URL(doc.coverImage,origin).href}:{})};
 return '<script type="application/ld+json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>';
}
export function pageHead(html,site,path){const m=metadata(site,path),url=origin+path;return html.replace(/<title>[^<]*<\/title>/,'').replace(/<meta name="description"[^>]*>/,'').replace('</head>',`<title>${escape(m.title)}</title><meta name="description" content="${escape(m.description)}"/><link rel="canonical" href="${escape(url)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${escape(m.title)}"/><meta property="og:description" content="${escape(m.description)}"/><meta property="og:url" content="${escape(url)}"/>${m.image?`<meta property="og:image" content="${escape(new URL(m.image,origin).href)}"/>`:''}<meta name="twitter:card" content="summary_large_image"/>${articleStructuredData(site,path)}</head>`);}
export function sitemap(site){const paths=['/','/work','/journal','/about','/services','/certificates','/contact',...(site.projects||[]).filter(d=>!d.archived&&!d.hidden).map(d=>'/work/'+encodeURIComponent(d.id)),...(site.blogPosts||[]).filter(d=>!d.archived&&!d.hidden).map(d=>'/journal/'+encodeURIComponent(d.id))];return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+escape(origin+p)+'</loc></url>').join('')+'</urlset>';}
export default {async fetch(request){
 const url=new URL(request.url),path=url.searchParams.get('__path')||url.pathname;
 const route=surfaceRoute(url.hostname,path,url.searchParams.get('__path')?new URLSearchParams([...url.searchParams].filter(([key])=>key!=='__path')).toString():url.search.slice(1));
 if(route.redirect)return new Response(null,{status:302,headers:{Location:route.redirect,'Cache-Control':'no-store'}});
 if(route.studio){const html=await readFile(new URL('../dist/studio-app/index.html',import.meta.url),'utf8');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});}
 if(path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /login\nDisallow: /preview/\nDisallow: /api/\nDisallow: /*/edit\nSitemap: '+origin+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
 if(path==='/manifest.webmanifest')return Response.json({name:'Desartly — Ali Komeili',short_name:'Desartly',start_url:'/',display:'browser',background_color:'#ffffff',theme_color:'#202632',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml'}]},{headers:{'Content-Type':'application/manifest+json'}});
 try{const response=await fetch('https://desartly.layebuzz.workers.dev/api/site',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const {site}=await response.json();
 if(path==='/sitemap.xml')return new Response(sitemap(site),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=60'}});
 let html;try{html=await readFile(new URL('../dist/shell.html',import.meta.url),'utf8');}catch{html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');}return new Response(pageBody(pageHead(html,site,path),site,path),{status:knownPublicPath(site,path)?200:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});
 }catch{return new Response('Content is temporarily unavailable. Please retry.',{status:503,headers:{'Content-Type':'text/plain','Retry-After':'30'}});}
}};
