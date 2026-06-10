import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Output static HTML files (default behavior)
  output: 'static',

  // Build options
  build: {
    // Generate .html file extensions (e.g., /about.html instead of /about/)
    format: 'file'
  },

  // Meta-refresh stubs for retired pages (therapy + offerings hub merged into the homepage)
  redirects: {
    '/therapy': '/',
    '/ways': '/index.html#services'
  },

  // Vite config for CSS
  vite: {
    css: {
      // Preserve CSS custom properties
      devSourcemap: true
    }
  }
});
