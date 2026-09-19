import sharp from "sharp";
import { LocalStore } from "./local-store.js";
import { contentResponse } from "./content-api.js";
import { loadEnv } from "vite";
import { authResponse, isOwner, ownerPath } from "./owner-auth.js";
export function ownerAccessPlugin() {
  let env, store;
  const publicAttempts = new Map();
  let attempts = [];
  function install(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        const requestUrl = new URL(req.url, "http://" + req.headers.host);
        if (
          !requestUrl.pathname.startsWith("/api/") &&
          !ownerPath(requestUrl.pathname)
        )
          return next();
        const request = new Request(requestUrl, {
          method: req.method,
          headers: req.headers,
          ...(["GET", "HEAD"].includes(req.method)
            ? {}
            : { body: req, duplex: "half" }),
        });
        let response = await authResponse(request, env);
        if (!response && requestUrl.pathname.startsWith("/api/")) response = await contentResponse(request, env, store, store, async bytes => {
          const input = sharp(bytes, {limitInputPixels: 40000000}).rotate();
          const meta=await input.metadata();
          const widths=[640,1280,1920].filter((w,i)=>i===0||w<(meta.width||1920));
          if(meta.width>640)widths.push(Math.min(meta.width,1920));
          return Promise.all([...new Set(widths)].sort((a,b)=>a-b).map(async width=>({width,bytes:await input.clone().resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer()})));
        });
        if (
          !response &&
          ownerPath(requestUrl.pathname) &&
          !(await isOwner(request, env))
        )
          response = new Response(null, {
            status: 302,
            headers: {
              Location:
                "/login?next=" +
                encodeURIComponent(requestUrl.pathname + requestUrl.search),
              "Cache-Control": "no-store",
            },
          });
        if (!response) return next();
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch {
        res.statusCode = 500;
        res.end("Owner access unavailable");
      }
    });
  }
  return {
    name: "pol-owner-access",
    configResolved(config) {
      const vars = loadEnv(config.mode, config.root, "OWNER_");
      store = new LocalStore(config.root);
      env = {
        LOCAL: true,
        PUBLIC_RATE_LIMITER: {async limit({key}){const now=Date.now();const times=(publicAttempts.get(key)||[]).filter(t=>now-t<60000);if(times.length>=20)return {success:false};times.push(now);publicAttempts.set(key,times);return {success:true};}},
        ...vars,
        OWNER_RATE_LIMITER: {
          async limit() {
            const now = Date.now();
            attempts = attempts.filter((t) => now - t < 60000);
            if (attempts.length >= 5) return { success: false };
            attempts.push(now);
            return { success: true };
          },
        },
      };
    },
    configureServer: install,
    configurePreviewServer: install,
  };
}
