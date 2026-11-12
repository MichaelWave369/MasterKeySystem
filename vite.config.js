import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repository>/, while local and
// other hosts typically serve the app from /.
export default defineConfig({
  base: process.env.DEPLOY_TARGET === "github-pages" ? "/MasterKeySystem/" : "/",
});
