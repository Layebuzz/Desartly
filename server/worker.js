import { authResponse, isOwner, ownerPath } from "./owner-auth.js";
import { contentResponse } from "./content-api.js";
import { D1Store } from "./content-store.js";
import { B2Media } from "./b2.js";
export default {
  async fetch(request, env) {
    const auth = await authResponse(request, env);
    if (auth) return auth;
    const url = new URL(request.url);
    if(url.pathname.startsWith("/api/")) return contentResponse(request,env,env.DB ? new D1Store(env.DB) : null,new B2Media(env),env.IMAGES ? async bytes => Promise.all([640,1280,2560].map(async width=>{const output=await env.IMAGES.input(new Blob([bytes]).stream()).transform({width,fit:"scale-down"}).output({format:"image/webp",quality:92});return {width,bytes:new Uint8Array(await output.response().arrayBuffer())};})) : null);
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
