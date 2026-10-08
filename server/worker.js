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
export default {
  async scheduled(controller,env,ctx){ctx.waitUntil(Promise.allSettled([sendBookingOwnerEmails(env),processTelegramQueue(env)]));},
  async fetch(request, env, ctx) {
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
    const response = await env.ASSETS.fetch(request);
    if (ownerPath(url.pathname) || url.pathname === "/login") {
      const privateResponse = new Response(response.body, response);
      privateResponse.headers.set("Cache-Control", "no-store");
      privateResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
      return privateResponse;
    }
    return response;
  },
};
