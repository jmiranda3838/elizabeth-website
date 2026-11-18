---
name: new-page
description: Scaffold a new Astro page in src/pages/ on BaseLayout, with the correct withBase()/.html routing and (for complex pages) a dedicated src/styles/pages/ stylesheet. Use when adding a new route/page to the therapy site.
---

# New page

Scaffolds a new route the way this repo expects. See CLAUDE.md for "Routing", "Base path" and "Page styling".

## Inputs (ask the user for any not given)

- **Page name**: a lowercase filename with no extension (e.g. `groups`). The route becomes `/<name>.html`.
- **Page title**: for `<title>`. Most pages use `"<Title> | Elizabeth Armstrong Therapy"`, but the practice is rebranding to "Growing Brighter Therapy" (about.astro already uses it). Ask which suffix to use if the user hasn't said.
- **Meta description**: one or two sentences for SEO and OG.
- **Styling**: **simple** (global utilities plus the shared `.page-hero`, like fees and faqs) or **complex** (its own `src/styles/pages/<name>.css`, like about, reiki, resources and contact).
- **Nav**: should the page appear in the header and footer nav?

## Steps

1. **Create `src/pages/<name>.astro`** in this shape (matches fees.astro, Prettier-clean):

   ```astro
   ---
   import { withBase } from "@/lib/withBase";
   import BaseLayout from "../layouts/BaseLayout.astro";
   // Complex page only:
   // import "@styles/pages/<name>.css";
   ---

   <BaseLayout
     title="<Title> | Elizabeth Armstrong Therapy"
     description="<meta description>"
   >
     <section class="page-hero">
       <div class="container">
         <p class="eyebrow">…</p>
         <h1>Page Title</h1>
         <p class="lead">…</p>
       </div>
     </section>

     <section class="section bg-paper">
       <div class="container container-narrow">…</div>
     </section>
   </BaseLayout>
   ```

   - `BaseLayout` props: `title` (required) and `description` (optional). `npm run format` decides whether they wrap onto separate lines, based on their length.
   - Drop the `withBase` import if the page has no internal links (otherwise `astro check` flags it as unused).
   - Copy about Elizabeth must not be invented. Unknowns stay as `TODO(elizabeth)` placeholders (see CLAUDE.md "Editing content").

2. **If complex**, create `src/styles/pages/<name>.css` and import it. Namespace every class (e.g. `.groups-*`) so nothing collides with the global `styles/sections/*.css`, which loads on every page.
3. **If it needs nav**, ask before changing it, then edit `src/components/global/Header.astro` and `Footer.astro`. Every link is `href={withBase("/<name>.html")}`.
4. **Update CLAUDE.md**: add the page to the `pages/` line of the layout tree. For a complex page, also add a Class map row for its stylesheet. `check:docs` fails until you do.
5. **Verify**: run `npm run format`, then `npm run check`. Optionally do the Playwright visual check described in CLAUDE.md.

## Gotchas

- Internal links and assets always go through `withBase()`, and links need the `.html` suffix.
- CSS `url()` can't see the base path. Use an inline `background-image` style or an SVG component.
- New pages are added to the sitemap automatically. The preview-wide `noindex` meta in BaseLayout covers them too.
