import {surfaceRoute,publicOrigin} from './site-domains.js';
import {pageHead,sitemap} from './public-render.js';
import {pageBody,knownPublicPath} from './public-content.js';
import {publicSite} from '../src/cms/schema.js';

// Render from the local asset binding and D1, never from the Vercel origin.
export async function workerPageResponse(request,env,store){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 // Real assets (including the Studio bundle) must bypass page routing.
 if(/\.[a-z0-9]+$/i.test(path)&&!['/robots.txt','/sitemap.xml','/manifest.webmanifest'].includes(path))return env.ASSETS.fetch(request);
 const route=surfaceRoute(url.hostname,path,url.search.slice(1));
 if(route.redirect)return new Response(null,{status:302,headers:{Location:route.redirect,'Cache-Control':'no-store'}});
 const respond=(body,status=200,type='text/html; charset=utf-8',extra={})=>new Response(request.method==='HEAD'?null:body,{status,headers:{'Content-Type':type,'Cache-Control':'public, max-age=0, must-revalidate','X-Desartly-Host':'cloudflare',...extra}});
 if(path==='/robots.txt')return respond('User-agent: *\nAllow: /\nAllow: /api/site\nAllow: /api/media/\nAllow: /api/static\nDisallow: /studio\nDisallow: /login\nDisallow: /preview/\nDisallow: /api/\nDisallow: /*/edit\nSitemap: '+publicOrigin+'/sitemap.xml\n',200,'text/plain; charset=utf-8');
 if(path==='/manifest.webmanifest')return respond(JSON.stringify({name:'Desartly — Ali Komeili',short_name:'Desartly',start_url:'/',display:'browser',background_color:'#ffffff',theme_color:'#202632',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml'}]}),200,'application/manifest+json');
 try{
  const shellPath=route.studio?'/studio-app/index.html':'/shell.html';
  const shell=await env.ASSETS.fetch(new Request(new URL(shellPath,url),{method:'GET'}));
  if(!shell.ok)throw Error('Missing surface shell');
  let html=await shell.text();
  if(route.studio)return respond(html,200,undefined,{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'});
  if(route.booking)return respond(html.replace(/<title>[^<]*<\/title>/,'<title>Book a conversation — Ali Komeili · Desartly</title>'),200,undefined,{'Cache-Control':'no-store','X-Robots-Tag':'noindex, follow'});
  const state=await store.read();
  if(!state.publishedAt)throw Error('No published site');
  const site=publicSite(state.published);
  if(path==='/sitemap.xml')return respond(sitemap(site),200,'application/xml; charset=utf-8');
  return respond(pageBody(pageHead(html,site,path),site,path),knownPublicPath(site,path)?200:404);
 }catch{return respond('Content is temporarily unavailable. Please retry.',503,'text/plain; charset=utf-8',{'Cache-Control':'no-store','Retry-After':'30'});}
}
