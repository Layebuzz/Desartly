import {calendarResponse} from './calendar-service.js';
import {mediaBackupResponse} from './media-backup.js';
import { authResponse, isOwner, ownerPath } from "./owner-auth.js";
import { contentResponse } from "./content-api.js";
import { D1Store } from "./content-store.js";
import {cmsResponse} from "./cms-api.js";
import { MediaStorage } from "./media-storage.js";
export default {
  async fetch(request, env) {
    const auth = await authResponse(request, env);
    if (auth) return auth;
    const calendar=await calendarResponse(request,env);if(calendar)return calendar;
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
