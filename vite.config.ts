import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site at https://<user>.github.io/list/
// so assets need to resolve under the /list/ base path. Local dev (`vite`)
// still uses "/" because we override via the BASE env on the CI build.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/list/" : "/",
}));
