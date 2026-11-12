import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repository>/, while local and
// other hosts typically serve the app from /.
export default defineConfig({
  // Match React 19 JSX transform even when a component does not import React explicitly.
  esbuild: { jsx: "automatic" },
  base: process.env.DEPLOY_TARGET === "github-pages" ? "/MasterKeySystem/" : "/",
});
