import { defineConfig } from "vite";
import { ownerAccessPlugin } from "./server/vite-owner.js";
export default defineConfig({ plugins: [ownerAccessPlugin()], base: process.env.VITE_APP_TARGET === "studio" ? "/studio-app/" : "/", copyPublicDir: process.env.VITE_APP_TARGET !== "studio" });
