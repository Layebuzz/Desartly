import { defineConfig } from "vite";
import { ownerAccessPlugin } from "./server/vite-owner.js";
export default defineConfig({ plugins: [ownerAccessPlugin()] });
