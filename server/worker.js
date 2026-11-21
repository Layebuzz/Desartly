import {ideaResponse} from './idea-service.js';
import {skillResponse} from './skill-service.js';
import {workerPageResponse} from './worker-pages.js';
import {staticAssetResponse} from './static-assets.js';
import {processTelegramQueue} from './telegram-delivery.js';
import {presentationRenderResponse,materialResponse} from './telegram-material-service.js';
import {telegramResponse} from './telegram-service.js';
import {portfolioResponse} from './portfolio-service.js';
import {mailboxResponse} from './mailbox-service.js';
import {calendarResponse,sendBookingOwnerEmails} from './calendar-service.js';
import {mediaBackupResponse} from './media-backup.js';
import { authResponse, isOwner, ownerPath } from "./owner-auth.js";
import { contentResponse } from "./content-api.js";
import { D1Store } from "./content-store.js";
import {cmsResponse} from "./cms-api.js";
import { MediaStorage } from "./media-storage.js";
import {logsResponse,logLater,pruneLogs} from './runtime-logs.js';
export default {
  async scheduled(controller,env,ctx){ctx.waitUntil(Promise.allSettled([sendBookingOwnerEmails(env),processTelegramQueue(env),controller.scheduledTime%3600000<60000?pruneLogs(env):Promise.resolve()]));},
  async fetch(request, env, ctx) {
    const started=Date.now(),requestId=crypto.randomUUID(),url=new URL(request.url);
    try{
      const logResponse=await logsResponse(request,env,ctx);if(logResponse)return logResponse;
      const response=await handleRequest(request,env,ctx);
      if(url.pathname.startsWith('/api/')&&(response.status>=400||!['GET','HEAD'].includes(request.method))){
        let message='';if(response.status>=400&&response.headers.get('Content-Type')?.includes('application/json')){try{message=(await response.clone().json()).error||'';}catch{}}
        logLater(env,ctx,{source:'worker',event:request.method+' request',level:response.status>=500?'error':response.status>=400?'warning':'info',path:url.pathname,requestId,status:response.status,duration:Date.now()-started,message});
      }
      const result=new Response(response.body,response);result.headers.set('X-Request-Id',requestId);return result;
    }catch(error){logLater(env,ctx,{source:'worker',event:'request-exception',level:'error',path:url.pathname,requestId,status:500,duration:Date.now()-started,message:error.message});return Response.json({error:'The service could not complete this request.',requestId},{status:500,headers:{'X-Request-Id':requestId,'Cache-Control':'no-store'}});}
  },
};
async function handleRequest(request,env,ctx){
    if(new URL(request.url).pathname.startsWith('/api/skills'))return skillResponse(request,env,env.DB?new D1Store(env.DB):null,new MediaStorage(env));
    const staticAsset=await staticAssetResponse(request,env,new MediaStorage(env));if(staticAsset)return staticAsset;
    const render=await presentationRenderResponse(request,env);if(render)return render;
    const materials=await materialResponse(request,env,ctx);if(materials)return materials;
    const telegram=await telegramResponse(request,env,ctx);if(telegram)return telegram;
    const auth = await authResponse(request, env);
    if (auth) return auth;
    const mailbox=await mailboxResponse(request,env);if(mailbox)return mailbox;
    const portfolio=await portfolioResponse(request,env,env.DB?new D1Store(env.DB):null);if(portfolio)return portfolio;
    const calendar=await calendarResponse(request,env,ctx);if(calendar){if(request.method==='POST'&&new URL(request.url).pathname==='/api/calendar/book'&&calendar.ok)ctx.waitUntil(processTelegramQueue(env));return calendar;}
    const url = new URL(request.url);
    const backup=await mediaBackupResponse(request,env,env.DB ? new D1Store(env.DB) : null,new MediaStorage(env));if(backup)return backup;
    const ideas=await ideaResponse(request,env);if(ideas)return ideas;
    const cms=await cmsResponse(request,env,env.DB ? new D1Store(env.DB) : null,new MediaStorage(env),null);
    if(cms)return cms;
    if(url.pathname.startsWith("/api/")) return contentResponse(request,env,env.DB ? new D1Store(env.DB) : null,new MediaStorage(env),env.IMAGES ? async bytes => Promise.all([640,1280,2560].map(async width=>{const output=await env.IMAGES.input(new Blob([bytes]).stream()).transform({width,fit:"scale-down"}).output({format:"image/webp",quality:92});return {width,bytes:new Uint8Array(await output.response().arrayBuffer())};})) : null);
    if (ownerPath(url.pathname) && !(await isOwner(request, env)))
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/login?next=" + encodeURIComponent(url.pathname + url.search),
          "Cache-Control": "no-store",
        },
      });
    const response = await workerPageResponse(request,env,env.DB?new D1Store(env.DB):null);
    if (ownerPath(url.pathname) || url.pathname === "/login") {
      const privateResponse = new Response(response.body, response);
      privateResponse.headers.set("Cache-Control", "no-store");
      privateResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
      return privateResponse;
    }
    return response;
}
