import {isOwner} from './owner-auth.js';
import {materialize} from '../src/cms/materialize.js';
import {portfolioDefaults,validatePortfolioConfig} from '../src/cms/portfolio-model.js';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function portfolioResponse(request,env,store){
 const url=new URL(request.url);if(url.pathname!=='/api/studio/portfolio')return null;
 if(!await isOwner(request,env))return json({error:'Owner sign-in required.'},401);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Request origin rejected.'},403);
 if(!store)return json({error:'Portfolio storage is unavailable.'},503);
 try{const state=await store.read(),site=materialize(structuredClone(state.draft)),projects=site.projects.filter(p=>!p.archived),saved=state.portfolioMaker;
 if(request.method==='GET')return json({config:saved?.config||portfolioDefaults(projects),version:saved?.version||0,updatedAt:saved?.updatedAt||null,projects,about:site.pages?.['/about']||{},resume:site.pages?.['/resume']?.resumeProfile||{},profile:site.profile||{}});
 if(Number(request.headers.get('Content-Length')||0)>64000)return json({error:'Portfolio settings are too large.'},413);const raw=await request.text();if(raw.length>64000)return json({error:'Portfolio settings are too large.'},413);const body=JSON.parse(raw);
 if(!Number.isInteger(body.version)||body.version!==(saved?.version||0))return json({error:'Portfolio order changed in another session. Reload before saving.'},409);
 const config=validatePortfolioConfig(body.config),updatedAt=new Date().toISOString();const next={config,version:(saved?.version||0)+1,updatedAt};await store.write({...state,portfolioMaker:next},state.revision);return json(next);
 }catch(e){return json({error:e.message||'Portfolio request failed.'},e.status||400);}
}
