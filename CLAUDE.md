# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

**Growing Brighter Therapy**: the practice website of Elizabeth Armstrong, LMFT (Orange County, CA). It is a static **Astro** site with plain CSS (custom properties, no framework) and a few vanilla-JS modules.

- **Rebrand in progress**: the logo and `og:site_name` say "Growing Brighter Therapy", but most page titles still end in "| Elizabeth Armstrong Therapy" (about.astro already uses the new brand). Ask before mass-renaming.
- **Pre-launch preview**: the site deploys to GitHub Pages under a subpath, with `noindex`. See "Deploy & launch".
- **Known placeholder (by design, don't "fix" it without asking)**: the contact form has no backend (a valid submit shows an honest "not connected yet, email or call" notice).

## Development

- `npm run dev`: dev server at http://localhost:4321/elizabeth-website/ (the base path is required)
- `npm run build`: production build to `dist/`
- `npm run preview`: serves `dist/` as built, with no rebuild, so run `build` first
- `npm run format`: Prettier auto-fix

## Verification

**`npm run check`** is the single gate. Run it before every commit. It runs, in order:

- **`check:types`**: `astro check` (TypeScript strict across .astro and .ts files). Hints in `public/scripts` and `feedback-worker` are expected noise.
- **`check:docs`** (`scripts/check-docs.mjs`) guards this file against drift. Every page, stylesheet in `styles/pages` and `styles/sections`, component, illustration subdirectory and script must be mentioned here. Every backticked filename and class prefix written here must still exist. If it fails, it names what to add or remove.
- **`check:links`** (`scripts/check-links.mjs`): offline check that every `withBase('…')` and static `href`/`src` path in `.astro` files resolves to a page, a redirect key in `astro.config.mjs`, or a file in `public/`. It does not scan JS or CSS.
- **`check:format`**: `prettier --check .` (`.prettierrc.json`: double quotes, printWidth 100, astro plugin). Excluded: all Markdown, `public/scripts/vendor/`, `feedback-worker/`, `.claude/`. **Gotcha**: the Astro parser rejects HTML comments (`<!-- -->`) *inside* a `{…}` expression. Use `{/* … */}` there.
- **`build`**.

`feedback-worker/` is outside every check. Test it by hand (`cd feedback-worker && npx wrangler dev`).

**Visual check (Playwright MCP)**: `npm run build && npm run preview`, then `browser_navigate` to `http://localhost:4321/elizabeth-website/<page>.html` and `browser_take_screenshot`. Check desktop (~1280px) and mobile (~390px) via `browser_resize`. Save screenshots to the scratchpad, not the repo root.

## Deploy & launch

- **Pushing `main` deploys immediately** to the public preview at https://jmiranda3838.github.io/elizabeth-website/ (`.github/workflows/deploy.yml`, `withastro/action`). CI runs only `astro build`, **not** `npm run check`, so the local gate is the only gate. Push only when asked.
- The feedback Worker deploys separately (`npx wrangler deploy`, out-of-band; see below).
- **Launch checklist** (also the comment at the top of `astro.config.mjs`): set `site` to the real domain and `base` back to `'/'`, remove the `noindex, nofollow` meta in BaseLayout.astro, restore `public/robots.txt` to `Allow: /`, and update `ALLOWED_ORIGINS` in `feedback-worker/wrangler.toml` if the overlay stays.

## Architecture

### Layout

```
src/
├── pages/            # One route each: index, about, reiki, retreat, resources, fees, faqs, contact (.astro)
├── layouts/          # BaseLayout.astro: head/meta, Header, Footer, skip link, loads the public/scripts modules
├── lib/withBase.ts   # Base-path helper (see Key Conventions)
├── scripts/          # garden-gate.js (homepage), retreat-trail.js (retreat): ES modules bundled by Vite
├── components/
│   ├── global/       # Header.astro, Footer.astro (nav lives here)
│   ├── sections/     # CTA.astro, DecorativeDivider.astro: currently UNUSED (pages inline the markup)
│   └── illustrations/ # SVG components by subdir, each with an index.ts barrel:
│                     #   icons/ botanicals/ dividers/ frames/ scenes/ apothecary/ specimens/ moon/ misc/
└── styles/
    ├── global.css    # Entry: imports tokens, base, typography, layout, utilities, animations, print, components/*, sections/*
    ├── components/   # buttons.css (.btn-*), header.css, footer.css
    ├── sections/     # Global section styles (see Class map); all loaded on every page
    └── pages/        # Page-specific: about.css, reiki.css, retreat.css, resources.css, contact.css (imported by their page)
public/
├── images/           # Site photos and art (right-sized derivatives only)
├── scripts/          # IIFE modules + vendor/html2canvas.min.js (see JavaScript)
└── favicon.svg, apple-touch-icon.png, og-image.jpg, robots.txt
scripts/              # check-docs.mjs, check-links.mjs (npm run check:*)
feedback-worker/      # Cloudflare Worker behind the review overlay
```

### Key Conventions

**Routing**: `build.format: 'file'`, so routes are `/about.html` etc. **Every internal link needs the `.html` suffix.** Retired URLs are redirects in `astro.config.mjs`: `/therapy → /` and `/ways → /index.html#services`.

**Base path (footgun)**: the preview builds with `base: '/elizabeth-website'`. **Every internal link and asset path goes through `withBase()`** (`@/lib/withBase`): `href={withBase('/about.html')}`, `src={withBase('/images/x.jpg')}`. It leaves external URLs, `#anchors`, `mailto:`/`tel:` and `//…` untouched, so wrap everything. CSS `url()` cannot see the base, so base-aware backgrounds use an inline `style="background-image: …"` (see the index.astro hero) or an SVG component. Never write a bare `url(/images/…)` in CSS.

**Path aliases**: `@/*` → `src/*`, plus `@components/*`, `@layouts/*`, `@styles/*`, `@illustrations/*`.

**Page styling**, in three patterns:
- The homepage is styled entirely by the global `styles/sections/*.css`.
- Complex pages import one dedicated sheet: about, reiki, retreat, resources and contact each import `@styles/pages/<name>.css`. Keep that page's bespoke rules there, namespaced.
- `faqs.astro` has a co-located `<style is:global>` (`.faq-*`, `.crisis-callout`). `fees.astro` has a scoped `<style>` (`.fees-grid`, `.fee-card`). Both use the shared `.page-hero` and hand-written `.cta-band` markup.

**Illustrations**: each is a bare `<svg>` accepting `class`/`style` props, drawn with `currentColor` so it themes through CSS `color`. Import via the barrel: `import { IconHeart } from "@illustrations/icons";`. **Gotcha**: most illustrations declare only `class`/`style` and do not forward other attributes, so `<IconHeart aria-hidden="true" />` is silently dropped (several about.astro icons are affected). Put `aria-hidden="true"` on a wrapping element instead. The exceptions spread `...rest` (DoorwayFrame, RootsSystem and the retreat-page set: RedRockHorizon, Cairn, VortexSpiral, JuniperSprig, DesertAgave, PricklyPear), and HandsCupped bakes `aria-hidden` in. List a subdir's components with `ls` or by reading its `index.ts`. To add one, use `/new-illustration`.

### Class map

Class names are metaphor-heavy. This is the one map from prefix to UI to file:

| File | Prefixes | UI |
|---|---|---|
| `sections/hero.css` | `.hero-*`, `.garland-*`, `.hanging-bunch`, `.bunch-*`, `.botanical-*` | Homepage hero, hanging garland, floating botanicals |
| `sections/service-cards.css` | `.service-*`, `.specimen-*`, `.services-soon-note`, `.soon-badge` | Service cards as botanical specimens; walk-and-talk "coming soon" note |
| `sections/process-steps.css` | `.moon-*`, `.step-*`, `.steps-grid`, `.vine-divider-*` | Process steps as moon phases (contact.astro reuses `.steps-grid`) |
| `sections/beyond-band.css` | `.beyond-band*` | Homepage Reiki teaser band |
| `sections/approach.css` | `.approach-*`, `.grimoire-section`, `.botanical-frame`, `.frame-*`, `.value-*`, `.magical-*`, `.vine-divider` | "My approach" grimoire page with framed corners |
| `sections/promises.css` | `.promises-*`, `.promise-*`, `.book-spine`, `.page-script` | Sacred Promises book spread |
| `sections/roots.css` | `.roots-*` | Hidden Strength photo over a root system (GSAP-animated) |
| `sections/support-areas.css` | `.apothecary-*`, `.area-*`, `.areas-grid` | Support areas as apothecary jars |
| `sections/illuminated-quote.css` | `.illuminated-*`, `.manuscript-*`, `.quote-attribution` | Illuminated-manuscript quote |
| `sections/constellation.css` | `.constellation-*`, `.star-*` | Dark guiding-stars map (lines drawn by constellation.js) |
| `sections/testimonials.css` | `.journal-*`, `.testimonial-*`, `.client-wishes` | Testimonials as journal entries |
| `sections/garden-gate.css` | `.garden-gate-section`, `.gate-*`, `.garden-*` | Final homepage CTA: an opening garden gate |
| `sections/cta.css` | `.cta-band`, `.botanical-cta`, `.cta-botanical`, `.decorative-divider` | CTA bands with vines (fees, faqs), leaf dividers |
| `sections/page-hero.css` | `.page-hero` | Simple inner-page hero (fees, faqs) |
| `pages/about.css` | `.board-*`, `.pinned-*`, `.pin-*`, `.polaroid`, `.washi-*`, `.twine-*`, `.cert-*`, `.bi-*`, `.paper-card`, `.photo-band` | About page as a vision board |
| `pages/reiki.css` | `.reiki-page`, `.daybreak-*`, `.conduit-*`, `.essence-*`, `.is-pane`, `.isnt-pane`, `.spread-*`, `.light-step*`, `.feel-*`, `.horizon-*`, `.bridge-*`, `.atmos-*`, `.bloom-*` | Reiki page: dawn "conduit" theme (GSAP daybreak on scroll) |
| `pages/retreat.css` | `.retreat-*`, `.mesa-*`, `.trail-*`, `.cairn-*`, `.flagline-*`, `.permit-*`, `.summit-*` | Sedona retreat as a desert trail: red-rock hero (RedRockHorizon), cairn waypoints, a print on prayer flags, a trail permit, the summit (registration). Also restyles the header over its light sky |
| `pages/resources.css` | `.library-*`, `.shelf-*`, `.welcome-desk*`, `.checkout-*`, `.catalog-*`, `.helpdesk-*`, `.bookmark-*`, `.lending-*` | Resources as a lending library: shelf, checkout cards (self-assessments), card catalog (forms), crisis help desk |
| `pages/contact.css` | `.threshold-*`, `.doorway-*`, `.candle-glow`, `.floating-botanical`, `.contact-*`, `.form-*`, `.hint-text`, `.location-note` | Contact page: self-drawing doorway hero, form, details |

Watch out: `.vine-divider` is defined in `animations.css` and `sections/approach.css`, with scoped overrides in `sections/process-steps.css` (under `.moon-journey-section`).

### Design tokens & utilities

- All colors, spacing, type, radii, shadows and transitions are custom properties in `src/styles/tokens.css`. **Use tokens, never raw hex or px, where one exists.** Prefer the semantic aliases (`--text-primary`, `--text-secondary`, `--bg-primary`, `--accent-primary`…) in new CSS. The spacing scale skips steps (no `--space-7`, `--space-9`, `--space-11`), so check before using one. `--espresso` is a sage-gray, not brown.
- Fonts: Cormorant Garamond (`--font-serif`, headings), Inter (`--font-sans`, body), Raleway (`--font-nav`). Great Vibes (decorative script) has no token.
- Theme: feminine botanical, with dusty rose, sage and blush-cream, and SVG botanicals throughout.
- Utilities live in `layout.css` (`.container`, `.container-narrow`, `.section`, `.bg-paper`, `.bg-blush`, `.grid-2`, `.grid-3`, `.flex`, spacing like `.mb-6`, `.icon-lg`, `.callout-box`), `typography.css` (`.eyebrow`, `.lead`, `.text-center`, `.text-secondary`) and `utilities.css` (`.hide-desktop`, decorative helpers). Check there before inventing a class.

### Responsive

**Desktop-first**: base styles target wide screens, and overrides use `@media (max-width: …)`. The main breakpoints are 1024, 900, **768** (the main collapse point, where `.grid-*` go single-column), 600 and 480. The nav switches to the mobile menu at 900. At 1420 the nav contact email and divider hide, at 1340 the nav gaps and logo padding tighten, and at 1100 the nav links shrink to 13px, so five links fit beside the logo down to 901 (`header.css`). The unscrolled header has dark text by default; a page with a dark or photo hero opts into light text itself (the home page in `header.css` via `body:has(.hero-botanical)`, reiki in its own sheet). The header's height is the `--header-h` token (160px, 100px at 900 and below): hero paddings, anchor offsets and the mobile menu read it, so never hard-code the number. The mobile menu is a sibling of the header, not a child, because the header's `backdrop-filter` would otherwise become the containing block for the fixed panel. Don't add `min-width` rules that fight the cascade.

### Animation

- **Scroll reveals** (`scroll-reveal.js`): add `.reveal` (fade up), `.reveal-left`, `.reveal-right` or `.reveal-scale`. The script adds `.visible` once, when the element is 10% in view. Stagger with `.stagger-1` … `.stagger-8` (0.1s steps). Without JavaScript, a `<noscript>` style in BaseLayout.astro shows them outright.
- **GSAP + ScrollTrigger** (npm `gsap`) runs in two page-local bundled scripts: index.astro (roots drawing; depends on the `.roots-*` selectors) and reiki.astro (scrubs the `.daybreak-sun` rising over the `.reiki-page` scroll range). Renaming those classes silently breaks them.
- **Every animation needs a `prefers-reduced-motion` fallback.** In bundled modules, copy `garden-gate.js` or the GSAP blocks. In IIFEs, copy `conduit.js` / `review-comments.js` (`window.matchMedia("(prefers-reduced-motion: reduce)").matches`). Known gap: smooth scrolling is unguarded in two places: `smooth-scroll.js` and the `scrollIntoView` call in `form-validation.js`. Don't put `scroll-behavior: smooth` back on `html`: it animated the initial `#hash` jump while the page was still laying out, so deep links landed in the wrong place.

### JavaScript

There are two patterns:

1. **Site-wide IIFEs** in `public/scripts/`, loaded by BaseLayout via `<script is:inline src={withBase(...)}>` (not bundled). Page-specific modules bail when their selectors are absent.
2. **Page-local bundled modules**: a plain `<script>` after `</BaseLayout>` that Vite bundles. Use this for anything that needs an npm import. Current uses are `src/scripts/garden-gate.js` (homepage gate parallax and touch-open), `retreat-trail.js` in src/scripts (retreat page: draws the dotted trail through every `[data-trail-point]` on scroll, marks passed cairns, and drifts the hero's `.mesa-*` strata; it reads layout offsets, so move waypoints with `left`/margins, never `translate`) and the GSAP blocks above.

| Module | Does |
|---|---|
| `mobile-nav.js` | Mobile menu toggle, body scroll lock, Escape to close, focus trap |
| `faq-accordion.js` | FAQ accordion (one open at a time), keyboard support, expands all for print |
| `smooth-scroll.js` | Anchor smooth-scroll with header offset |
| `header-scroll.js` | Header shadow past 100px; active `.nav-link` by `pathname.endsWith(href)` |
| `form-validation.js` | Contact form validation and errors. **No backend**: a valid submit shows the "not connected" notice |
| `scroll-reveal.js` | Reveal system above, plus service-card touch effects |
| `constellation.js` | Draws the constellation lines. Connections are hard-coded by star **index**, so keep the star order in index.astro in sync |
| `conduit.js` | Drifting light motes in the reiki hero |
| `library.js` | Pull-out book spines with note slips (resources) |
| `review-comments.js` | Review overlay (see below); inert unless activated |

`public/scripts/vendor/html2canvas.min.js` is vendored and used by the overlay for screenshots. Never edit or reformat it.

## Review & feedback overlay

A "comment on anything" overlay lets Elizabeth (or any reviewer) leave feedback without GitHub.

- **Client**: `review-comments.js` is inert unless the URL has `?review=on`, which is remembered per device in `localStorage`. `?review=off` turns it off. `?fb=<selector>` deep-links to the commented element. The reviewer clicks an element and comments. The script screenshots the page and captures the selector, text and viewport. The Worker URL and shared key are hard-coded in the script; that's intentional, since it's public best-effort gating.
- **Server**: `feedback-worker/` is a Cloudflare Worker. `POST /comments` and `GET /comments` are both origin- and key-gated, and POST is rate-limited. Each submission commits the screenshot to the orphan `feedback-assets` branch (never deployed) and opens a GitHub issue labelled `site-feedback`. Closing the issue shows the reviewer "Addressed ✓".
- **Operate / deploy / rotate**: `feedback-worker/README.md`. Account details and the token status are in Claude's `review-comment-overlay` memory.
- Do **not** change the overlay's behavior as a side effect of unrelated edits.

## Editing content

- **Copy about Elizabeth: never invent** credentials, certifications, dates, prices, books, testimonials or bio details. Invented cert cards have happened here before. Unknowns stay as visible `TODO(elizabeth)` placeholders. The verified facts and the private copy constraints are in Claude's local `elizabeth-bio-research` memory: read it before touching bio, credential or Reiki copy, and **never commit its contents** (this repo is public).
- **Facts are duplicated across pages. grep before editing and update every copy.** Fees, session lengths and payment methods appear in both fees.astro and the fees section of faqs.astro. The Resources credit-card form assumes card payment. Credentials (license #, degrees, "licensed since", Reiki dates) repeat in Footer.astro, about.astro (meta description, bio, photo-band caption, cert cards) and reiki.astro.
- **New page**: use `/new-page`. **New illustration**: use `/new-illustration`.
- **Nav**: `Header.astro` and `Footer.astro` (all links through `withBase()`).
- **CTA bands**: edit the hand-written `.cta-band` markup in fees.astro or faqs.astro (styles in `sections/cta.css`). `CTA.astro` is unused; editing it changes nothing on the site.

## Generated / local-only paths

Never edit or rely on `dist/`, `.astro/`, `node_modules/`, `.playwright-mcp/` or `migration-baselines/` (pre-redesign screenshots, now obsolete). `reference/` (design references, photo originals) and the root `quote-*.png` / `s-*.jpeg` files are gitignored local scratch. The source of truth is `src/` and `public/`.
