import {pageBody,knownPublicPath} from '../server/public-content.js';
import {metadata} from '../src/cms/metadata.js';
export {metadata} from '../src/cms/metadata.js';
import {readFile} from 'node:fs/promises';
import {publicOrigin,surfaceRoute} from '../server/site-domains.js';
import {pageHead,sitemap} from '../server/public-render.js';
export {pageHead,sitemap,articleStructuredData} from '../server/public-render.js';
const origin=publicOrigin;
export default {async fetch(request){
 const url=new URL(request.url),path=url.searchParams.get('__path')||url.pathname;
 const route=surfaceRoute(url.hostname,path,url.searchParams.get('__path')?new URLSearchParams([...url.searchParams].filter(([key])=>!['__path','surfacePath'].includes(key))).toString():url.search.slice(1));
 if(route.redirect)return new Response(null,{status:302,headers:{Location:route.redirect,'Cache-Control':'no-store'}});
 if(route.booking){let html=await readFile(new URL('../dist/shell.html',import.meta.url),'utf8');html=html.replace(/<title>[^<]*<\/title>/,'<title>Book a conversation — Ali Komeili · Desartly</title>');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, follow'}});}
 if(route.studio){const html=await readFile(new URL('../dist/studio-app/index.html',import.meta.url),'utf8');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});}
 if(path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /login\nDisallow: /preview/\nDisallow: /api/\nDisallow: /*/edit\nSitemap: '+origin+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
 if(path==='/manifest.webmanifest')return Response.json({name:'Desartly — Ali Komeili',short_name:'Desartly',start_url:'/',display:'browser',background_color:'#ffffff',theme_color:'#202632',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml'}]},{headers:{'Content-Type':'application/manifest+json'}});
 try{const response=await fetch('https://desartly.layebuzz.workers.dev/api/site',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const {site}=await response.json();
 if(path==='/sitemap.xml')return new Response(sitemap(site),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300, stale-while-revalidate=600'}});
 let html;try{html=await readFile(new URL('../dist/shell.html',import.meta.url),'utf8');}catch{html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');}return new Response(pageBody(pageHead(html,site,path),site,path),{status:knownPublicPath(site,path)?200:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});
 }catch{return new Response('Content is temporarily unavailable. Please retry.',{status:503,headers:{'Content-Type':'text/plain','Retry-After':'30'}});}
}};
