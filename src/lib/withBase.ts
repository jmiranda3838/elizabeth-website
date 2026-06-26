// Prefix a site path with Astro's configured base path so links/assets work
// whether the site is served from the domain root (base = '/') or a subpath
// (e.g. base = '/elizabeth-website' on GitHub Pages).
//
// NOTE: import.meta.env.BASE_URL may or may not carry a trailing slash depending
// on how `base` is written in astro.config.mjs, so we normalize both sides and
// join with exactly one slash. When base returns to '/' at launch this becomes a
// no-op — no second rewrite needed.
export function withBase(path: string): string {
  // Leave external links, anchors, mailto/tel, and protocol-relative URLs alone.
  if (/^(https?:|mailto:|tel:|#|\/\/)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, ""); // drop any trailing slash
  const rel = path.startsWith("/") ? path : "/" + path; // ensure leading slash
  return base + rel; // e.g. "/elizabeth-website" + "/about.html"
}
