---
name: new-page
description: Scaffold a new Astro page in src/pages/ on BaseLayout, with the correct withBase()/.html routing and (for complex pages) a dedicated src/styles/pages/ stylesheet. Use when adding a new route/page to the therapy site.
---

# New page

Scaffolds a new route the way this repo expects (see CLAUDE.md "Routing", "Base path", and the CSS-to-Page mapping).

## Inputs (ask the user for any not given)
- **Page name** — lowercase filename, no extension (e.g. `groups`). The route becomes `/<name>.html` (Astro `build.format: 'file'`).
- **Page title** — for the `<title>` (the convention is `"<Title> | Elizabeth Armstrong Therapy"`).
- **Meta description** — one or two sentences for SEO/OG.
- **Styling** — **simple** (reuse global utility classes + shared sections like `.page-hero`) or **complex** (needs its own `src/styles/pages/<name>.css`).
- **Nav** — should this page appear in the header/footer nav?

## Steps
1. **Create `src/pages/<name>.astro`** using this pattern (matches `fees.astro` / `about.astro`):
   ```astro
   ---
   import { withBase } from "@/lib/withBase";
   import BaseLayout from "../layouts/BaseLayout.astro";
   // For a complex page, also: import "../styles/pages/<name>.css";
   ---
   <BaseLayout title="<Title> | Elizabeth Armstrong Therapy" description="<meta description>">
     <section class="page-hero">
       <div class="container">
         <p class="eyebrow">…</p>
         <h1><Title></h1>
         <p class="lead">…</p>
       </div>
     </section>

     <section class="section bg-paper">
       <div class="container container-narrow">
         …
       </div>
     </section>
   </BaseLayout>
   ```
2. **If complex**, create `src/styles/pages/<name>.css` and import it in the page (as commented above). Keep all of this page's bespoke class rules there; namespace classes so they don't collide with other pages (see how `pages/about.css`, `pages/contact.css` are scoped).
3. **If it needs nav**, edit `src/components/global/Header.astro` and `Footer.astro`. **Every internal link must use `withBase()`**: `href={withBase('/<name>.html')}`. Ask before changing nav.
4. **Verify**: `npm run check:links` (the new route + any links resolve) and `npm run check:types`. If you added a complex page, also confirm `npm run build` succeeds.

## Gotchas (from CLAUDE.md)
- Internal links/assets go through `withBase()` — the site is served from the `/elizabeth-website` base path.
- Links must include the `.html` suffix.
- CSS `url()` can't read the base path; use an inline `background-image` or an imported SVG component for base-aware backgrounds.
- If you add a complex page, update the **CSS-to-Page Mapping** table and the page list in `CLAUDE.md` to match.
