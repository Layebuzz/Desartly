import { defineConfig } from "vite";
import { ownerAccessPlugin } from "./server/vite-owner.js";
import {loadingShell} from "./src/shared/loading-screen.js";
export default defineConfig({ plugins: [{name:"desartly-loading-shell",transformIndexHtml:{order:"pre",handler:loadingShell}},ownerAccessPlugin()], base: process.env.VITE_APP_TARGET === "studio" ? "/studio-app/" : "/", build:{copyPublicDir: process.env.VITE_APP_TARGET !== "studio",rollupOptions:{input:{main:"index.html",presentation:"presentation-render.html"}}} });
