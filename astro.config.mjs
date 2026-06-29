import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // ⚠️ PREVIEW config — review deploy on GitHub Pages (subpath).
  // At launch: set `site` to the real domain, set `base` back to '/', remove the
  // noindex meta in BaseLayout, and restore public/robots.txt to Allow.
  // `site` + `base` drive canonical links, Open Graph URLs (BaseLayout), and the sitemap.
  site: "https://jmiranda3838.github.io",
  base: "/elizabeth-website",

  // Output static HTML files (default behavior)
  output: "static",

  // Build options
  build: {
    // Generate .html file extensions (e.g., /about.html instead of /about/)
    format: "file",
  },

  // Meta-refresh stubs for retired pages (therapy + offerings hub merged into the homepage)
  redirects: {
    "/therapy": "/",
    "/ways": "/index.html#services",
  },

  integrations: [
    sitemap({
      // build.format is 'file', so real pages are .html — keep sitemap URLs in sync.
      serialize(item) {
        const url = new URL(item.url);
        if (url.pathname !== "/" && !url.pathname.endsWith(".html")) {
          url.pathname = url.pathname.replace(/\/$/, "") + ".html";
          item.url = url.toString();
        }
        return item;
      },
    }),
  ],

  // Vite config for CSS
  vite: {
    css: {
      // Preserve CSS custom properties
      devSourcemap: true,
    },
  },
});
