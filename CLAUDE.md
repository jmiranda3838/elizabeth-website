# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a therapy practice website built with **Astro** (static site generator). The site uses a component-based architecture with CSS custom properties for theming.

## Development

**Start dev server**: `npm run dev` (runs on http://localhost:4321)

**Build for production**: `npm run build` (outputs to dist/)

**Preview production build**: `npm run preview`

## Verification

Run **`npm run check`** before committing — it is the single gate for this repo and runs:

- **`npm run check:types`** — `astro check` (TypeScript strict mode across `.astro`/`.ts`).
- **`npm run check:docs`** — verifies this file's component/script counts still match the filesystem, so the registry and counts above never drift again. If it fails, it prints the expected numbers; update CLAUDE.md to match.
- **`npm run check:links`** — offline validator: every `withBase('…')` / `href`/`src` internal path must resolve to a real page in `src/pages/`, a redirect key in `astro.config.mjs`, or an asset under `public/`. Catches broken `.html` links and base-path mistakes before deploy.
- **`npm run check:format`** — `prettier --check .` (config in `.prettierrc.json`, scope in `.prettierignore`). Markdown, the vendored `html2canvas`, `feedback-worker/`, and `.claude/` are intentionally excluded. Run **`npm run format`** to auto-fix any failures. **Gotcha**: Prettier's Astro parser rejects HTML comments (`<!-- -->`) placed *inside* a `{…}` JSX expression — use a JSX comment `{/* … */}` there instead (top-level template comments are fine).
- **`npm run build`** — the production build.

**Visual check (Playwright MCP)**: to confirm a UI change renders, run `npm run preview`, then `browser_navigate` to `http://localhost:4321/elizabeth-website/index.html` (the `/elizabeth-website` base path is required) and `browser_take_screenshot`. Old reference shots live in `migration-baselines/` for ad-hoc comparison.

## Architecture

### File Structure

```
src/
├── pages/                  # Astro pages (routes)
│   ├── index.astro         # Homepage (hero, services + walk-and-talk note, Reiki band, approach, Sacred Promises, roots, support areas, quote, guiding-stars constellation, process, testimonials, garden-gate CTA)
│   ├── about.astro         # About page, "vision board" design (imports src/styles/pages/about.css)
│   ├── reiki.astro         # Reiki page, dawn "Conduit" theme (imports src/styles/pages/reiki.css)
│   ├── resources.astro     # Resources page, "Lending Library" theme (imports src/styles/pages/resources.css)
│   ├── fees.astro
│   ├── faqs.astro          # FAQ page (has co-located <style is:global> for FAQ-specific CSS)
│   └── contact.astro       # Contact page, threshold doorway hero (imports src/styles/pages/contact.css)
├── layouts/
│   └── BaseLayout.astro    # Main HTML wrapper (loads all 10 JS modules via withBase())
├── lib/
│   └── withBase.ts         # Prefixes internal paths with Astro's base (see "Base path" below)
├── components/
│   ├── global/             # Site-wide components
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── sections/           # Reusable page sections
│   │   ├── CTA.astro
│   │   └── DecorativeDivider.astro
│   └── illustrations/      # SVG illustration components (83 files, 9 subdirectories)
│       ├── icons/           # Small functional icons (23 components)
│       ├── botanicals/      # Decorative plant elements (11 components)
│       ├── dividers/        # Section/page dividers (4 components)
│       ├── frames/          # Corner and border frame elements (10 components)
│       ├── scenes/          # Large illustrations (10 components)
│       ├── apothecary/      # Specialty topic icons (8 components)
│       ├── specimens/       # Service card specimen illustrations (6 components)
│       ├── moon/            # Moon phase icons (3 components)
│       └── misc/            # Other decorative elements (8 components)
│       (Each subdirectory has an index.ts barrel file for grouped imports)
├── styles/
│   ├── global.css          # Main entry (imports all modules below)
│   ├── tokens.css          # Design tokens (colors, spacing, typography)
│   ├── base.css            # Reset and base styles
│   ├── typography.css      # Heading and text utilities
│   ├── layout.css          # Grid, flex, spacing, icon, and component utilities
│   ├── utilities.css       # Decorative elements, helpers
│   ├── animations.css      # Keyframes and reveal system
│   ├── print.css           # Print media styles
│   ├── components/         # Component-level styles
│   │   ├── buttons.css     # .btn, .btn-primary, .btn-outline, .btn-ghost, .btn-lg
│   │   ├── header.css      # .header, .nav-*, .mobile-nav-*, .nav-contact-*
│   │   └── footer.css      # .footer, .footer-*, .botanical-footer
│   ├── sections/           # Section-level styles
│   │   ├── hero.css        # .hero-botanical, garland, floating botanicals
│   │   ├── service-cards.css # .services-grid, .service-card, .specimen-card, .specimen-latin, .services-soon-note
│   │   ├── approach.css    # .approach-*, .grimoire-section, .botanical-frame
│   │   ├── support-areas.css # .apothecary-*, .areas-grid
│   │   ├── process-steps.css # .moon-journey-*, .moon-step, .steps-grid
│   │   ├── testimonials.css  # .journal-*, .testimonial-*, .client-wishes
│   │   ├── cta.css         # .decorative-divider, .cta-band, .botanical-cta
│   │   ├── beyond-band.css # .beyond-band* (homepage Reiki band)
│   │   ├── illuminated-quote.css # .illuminated-*, .manuscript-corner*, .quote-attribution
│   │   ├── promises.css    # .promises-*, .book-spine, .page-script, .promise-* (Sacred Promises book spread)
│   │   ├── roots.css       # .roots-* (Hidden Strength photo-over-roots figure)
│   │   ├── constellation.css # .constellation-*, .star-* (dark guiding-stars section)
│   │   ├── garden-gate.css # .garden-gate-section, .gate-* (final CTA)
│   │   └── page-hero.css   # .page-hero (shared by faqs, fees)
│   └── pages/              # Page-specific styles imported directly by .astro pages
│       ├── reiki.css       # All reiki.astro styles (.conduit-*, .isisnt-*, .light-step*, .lantern-*, .bloom-*)
│       ├── about.css       # All about.astro styles (.board-*, .pinned-*, .polaroid, .washi-*, .twine-*)
│       ├── resources.css   # All resources.astro styles (.library-*, .shelf-*, .checkout-*, .bookmark-*, .catalog-*, .helpdesk-*, .lending-*)
│       └── contact.css     # All contact.astro styles (.threshold-*, .doorway-*, .candle-glow, .floating-botanical, .contact-*, .form-*, .hint-text, .location-note)

public/
├── images/                 # Static image assets
└── scripts/                # Client-side JavaScript (10 IIFE modules, loaded via is:inline)
    ├── mobile-nav.js       # Mobile nav toggle + focus trap
    ├── faq-accordion.js    # FAQ accordion + print handling
    ├── smooth-scroll.js    # Anchor link smooth scrolling
    ├── header-scroll.js    # Header scroll behavior + active nav state
    ├── form-validation.js  # Contact form validation
    ├── scroll-reveal.js    # Reveal animations + service card touch effects
    ├── constellation.js    # Dynamic constellation SVG lines (homepage guiding-stars section)
    ├── conduit.js          # Drifting light motes (reiki page)
    ├── library.js          # Pull-out book spines on the shelf (resources page)
    ├── review-comments.js  # Comment-on-anything review overlay (inert unless ?review=on)
    └── vendor/
        └── html2canvas.min.js  # Vendored; used by review-comments.js for screenshots
```

### Key Conventions

**Routing**: Astro config uses `build.format: 'file'`, so routes produce `.html` extensions (e.g., `/about.html`, `/contact.html`). All internal links must use `.html` suffixes. The retired `/therapy` and `/ways` URLs are kept alive via the `redirects` option in `astro.config.mjs` (Astro emits meta-refresh stubs): `/therapy → /` and `/ways → /index.html#services` (their content was merged into the homepage).

**Base path & internal links (footgun)**: The site is currently built with `base: '/elizabeth-website'` for the GitHub Pages preview deploy (`astro.config.mjs:6-11`; reverts to `/` at launch). **Every internal link and asset path MUST go through the `withBase()` helper** (`src/lib/withBase.ts`, imported as `@/lib/withBase`): `href={withBase('/about.html')}`, `src={withBase('/images/x.png')}`, `src={withBase('/scripts/x.js')}`. `withBase()` leaves external URLs, anchors (`#…`), `mailto:`/`tel:`, and protocol-relative (`//…`) paths untouched, so it is safe to wrap everything. **Gotcha**: CSS `url()` cannot read Astro's `BASE_URL`, so base-aware backgrounds must use an inline `background-image` style or an imported SVG component (the hero already does this) — never a bare `url(/images/…)` in a `.css` file. `npm run check:links` (see Verification) validates that every `withBase('…')` path resolves.

**Path aliases** (from tsconfig.json):
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@layouts/*` → `src/layouts/*`
- `@styles/*` → `src/styles/*`
- `@illustrations/*` → `src/components/illustrations/*`

**Pages**: Each `.astro` file in `src/pages/` becomes a route. Pages use `BaseLayout` and contain page-specific content. Pages with complex page-specific styling import a dedicated CSS file from `src/styles/pages/` (reiki, about, resources, contact). The faqs page still uses a co-located `<style is:global>` block. The homepage is styled entirely from globally-imported `src/styles/sections/*.css`.

**Components**: Reusable Astro components with props. Example:
```astro
<CTA
  title="Ready to begin?"
  description="Schedule a free consultation."
  buttonText="Get Started"
  buttonHref="/contact.html"
  variant="botanical"
/>
```

**Layouts**: `BaseLayout.astro` wraps all pages with common structure (head, header, footer, scripts).

**Illustrations**: SVG components in `src/components/illustrations/` accept `class` and `style` props and render a bare `<svg>` element. They use `currentColor` for theming via CSS color inheritance. Import using barrel files:
```astro
import { IconHeart, IconShield } from "@illustrations/icons";
import { Wildflower, HerbSprig } from "@illustrations/botanicals";
```

**Generated/ignored paths**: Do not edit or rely on `dist/`, `.astro/`, `.playwright-mcp/`, `node_modules/`, or `migration-baselines/`. Source of truth is `src/` and `public/`.

### CSS-to-Page Mapping

| Page | Global CSS | Page-specific CSS (`src/styles/pages/`) | Co-located CSS (`<style is:global>`) | Scoped CSS (`<style>`) |
|------|-----------|------------------------------------------|--------------------------------------|------------------------|
| index.astro | hero, service-cards, beyond-band, approach, promises, roots, support-areas, illuminated-quote, constellation, process-steps, testimonials, garden-gate | — | — | — |
| about.astro | layout utilities | `pages/about.css` (all `.board-*`, `.pinned-*`, `.polaroid`, `.washi-*`, `.twine-*`, `.cert-*`) | — | — |
| reiki.astro | — | `pages/reiki.css` (all `.conduit-*`, `.honest-*`, `.isisnt-*`, `.light-step*`, `.feel-*`, `.lantern-*`, `.bloom-*`) | — | — |
| faqs.astro | page-hero | — | `.faq-*`, `.crisis-callout` | — |
| contact.astro | process-steps (.steps-grid) | `pages/contact.css` (all `.threshold-*`, `.doorway-*`, `.candle-glow`, `.floating-botanical`, `.contact-*`, `.form-*`, `.hint-text`, `.form-subtitle`, `.form-footer`, `.location-note`) | — | — |
| fees.astro | page-hero | — | — | — |
| resources.astro | — | `pages/resources.css` (all `.library-*`, `.shelf-*`, `.welcome-desk*`, `.checkout-*`, `.bookmark-*`, `.catalog-*`, `.helpdesk-*`, `.lending-*`) | — | — |

### Design System (src/styles/tokens.css)

**CSS Variables** define the entire design system:
- Backgrounds: `--warm-paper`, `--soft-sand`, `--blush-wash`
- Ink/text: `--espresso`, `--slate-olive`
- Accents: `--sage`, `--sage-warm`, `--muted-rose`, `--dusty-peach`, `--warm-clay`, `--misty-blue`, `--soft-coral`
- Typography: Cormorant Garamond (serif headings), Inter (body), Raleway (navigation), Great Vibes (decorative script)
- Text scale: `--text-xs` through `--text-6xl`
- Spacing scale: `--space-1` through `--space-32`
- Layout: `--max-width`, `--max-width-narrow`, `--max-width-text`
- Transitions: `--transition-fast`, `--transition-base`, `--transition-slow`
- Border radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- Shadows: `--shadow-subtle`, `--shadow-soft`

**Visual Theme**: Feminine botanical aesthetic with dusty rose accents, sage green tones, and soft blush-cream backgrounds. SVG botanical decorations throughout.

### Utility Classes (src/styles/layout.css)

**Layout**: `.container`, `.container-narrow`, `.container-text`, `.section`, `.section-lg`, `.section-sm`

**Backgrounds**: `.bg-paper`, `.bg-sand`, `.bg-blush`

**Grid**: `.grid`, `.grid-2`, `.grid-3`, `.grid-4` (collapse to single column at 768px)

**Flex**: `.flex`, `.flex-col`, `.items-center`, `.justify-center`, `.justify-between`

**Spacing**: `.mt-10`, `.mt-12`, `.mb-2`, `.mb-4`, `.mb-6`, `.mb-10`, `.mb-12`, `.mx-auto`, `.gap-4`, `.gap-6`, `.gap-8`

**Sizing**: `.w-full`, `.p-6`, `.p-8`

**Typography**: `.text-sm`, `.text-xs`, `.italic`, `.underline`, `.text-center` (in typography.css), `.text-secondary` (in typography.css)

**Icons**: `.icon-lg` (48px), `.icon-sm` (20px), `.icon-sage`, `.icon-centered`

**Components**: `.callout-box`

### Class Name Glossary

The codebase uses metaphor-heavy class names. Here's what they map to:

| Class Prefix | UI Element | CSS Location |
|---|---|---|
| `.hero-botanical` | Homepage hero with floating SVG plants | sections/hero.css |
| `.garland-*` | Hanging botanical garland in hero | sections/hero.css |
| `.service-card`, `.specimen-card` | Service offering cards with botanical specimen illustrations | sections/service-cards.css |
| `.specimen-corner` | Decorative corner on service cards | sections/service-cards.css |
| `.approach-*` | "My approach to therapy" section | sections/approach.css |
| `.grimoire-section` | Ornate framed content block (like an old book page) | sections/approach.css |
| `.botanical-frame`, `.frame-corner` | Decorative corner elements on framed sections | sections/approach.css |
| `.apothecary-*` | Support areas / specialty topics grid | sections/support-areas.css |
| `.moon-journey-*`, `.moon-step` | Process steps section (styled as moon phases) | sections/process-steps.css |
| `.journal-*`, `.testimonial-*` | Testimonials section (styled as journal entries) | sections/testimonials.css |
| `.client-wishes` | Additional testimonial display | sections/testimonials.css |
| `.cta-band`, `.botanical-cta` | Call-to-action sections with vine decorations (used by CTA.astro, fees, faqs) | sections/cta.css |
| `.decorative-divider` | Leaf/vine section dividers | sections/cta.css |
| `.beyond-band` | Homepage Reiki teaser band | sections/beyond-band.css |
| `.illuminated-*`, `.manuscript-*` | Illuminated manuscript quote section (homepage) | sections/illuminated-quote.css |
| `.promises-*`, `.promise-*`, `.page-script` | Sacred Promises book spread (homepage) | sections/promises.css |
| `.constellation-*`, `.star-*` | Dark guiding-stars constellation map (homepage) | sections/constellation.css |
| `.garden-gate-*`, `.gate-*` | Final CTA section with garden gate illustration (homepage) | sections/garden-gate.css |
| `.roots-*` | Hidden Strength photo-over-roots section (homepage) | sections/roots.css |
| `.services-soon-note`, `.soon-badge` | Walk-and-talk "coming soon" note under the services grid | sections/service-cards.css |
| `.page-hero` | Shared hero banner for inner pages (faqs, fees) | sections/page-hero.css |
| `.threshold-*`, `.doorway-*`, `.candle-glow`, `.floating-botanical` | Contact page doorway hero (self-drawing arch, load-timed animation) | pages/contact.css |
| `.conduit-*` | Reiki page hero and light-channel theme | pages/reiki.css |
| `.board-*`, `.pinned-*`, `.polaroid` | About page vision-board collage and pinned paper cards | pages/about.css |
| `.shelf-*`, `.library-*` | Resources page hero: bookshelf with pull-out spines | pages/resources.css |
| `.checkout-*` | Resources page library checkout cards (self-assessments) | pages/resources.css |
| `.catalog-*` | Resources page card-catalog drawers (client forms) | pages/resources.css |
| `.helpdesk-*` | Resources page crisis-support section | pages/resources.css |
| `.bookmark-band`, `.lending-cta` | Resources page quote interludes and closing CTA | pages/resources.css |
| `.faq-item`, `.faq-question`, `.faq-answer` | Accordion FAQ items | faqs.astro |
| `.crisis-callout` | Emergency/crisis information box | faqs.astro |
| `.contact-grid`, `.contact-detail-*` | Contact page layout | contact.astro |
| `.form-*` | Contact form inputs and layout | contact.astro |

### Illustration Component Registry

All 83 SVG components organized by subdirectory. Import via barrel files: `import { Name } from "@illustrations/subdir"`.

**icons/** (23): ArrowRight, IconChat, IconCheckCircle, IconClock, IconCollaborative, IconCompass, IconCrescentMoon, IconCrown, IconCrystal, IconEmail, IconGraduation, IconHandsOpen, IconHeart, IconImagePlaceholder, IconLicense, IconLocation, IconPhone, IconSeedling, IconShield, IconStar, IconSun, IconTraining, PlusExpand

**botanicals/** (11): FloatingBotanical1, FloatingBotanical2, HerbSprig, InitialFlourish, LavenderSprig, LeafBranch, PageBotanical, PressedFlower, SeedPodCluster, WelcomeWreath, Wildflower

**frames/** (10): CtaVineLeft, CtaVineRight, FrameCornerBL, FrameCornerBR, FrameCornerTL, FrameCornerTR, ManuscriptCornerBL, ManuscriptCornerBR, ManuscriptCornerTL, ManuscriptCornerTR

**apothecary/** (8): Butterfly, DroopingFlower, KintsugiBowl, Moth, Seedling, SpectrumArc, TwoFlowers, WillowBranch

**specimens/** (6): BloomingFlower, IntertwinedStems, SpreadingTree, TagBloomingFlower, TagIntertwinedStems, TagTree

**misc/** (8): CatalogPull, Clothespin, ConstellationStar, ManuscriptMargin, MoonPath, QuoteMark, SpecimenDivider, TagString

**scenes/** (10): BookSpine, DoorwayFrame, GardenGate, Garland, GateFrame, GateDoorLeft, GateDoorRight, HandsCupped, LightChannel, RootsSystem

**dividers/** (4): FooterDivider, LeafDivider, PageDivider, VineDivider

**moon/** (3): FullMoon, NewMoon, WaxingMoon

### Animation System

**Scroll reveals**: Add `.reveal` class to elements for fade-in on scroll via IntersectionObserver.

**Staggered delays**: Use `.stagger-1` through `.stagger-8` for sequential transition delays:
```html
<div class="reveal stagger-1">Item 1</div>  <!-- 0.1s delay -->
<div class="reveal stagger-2">Item 2</div>  <!-- 0.2s delay -->
<div class="reveal stagger-3">Item 3</div>  <!-- 0.3s delay -->
```

Classes apply `transition-delay` from 0.1s to 0.8s in 0.1s increments.

### JavaScript (public/scripts/)

Ten IIFE-wrapped modules loaded via `<script is:inline>` in BaseLayout (each `src` wrapped in `withBase()`). Page-specific modules query their page's selectors and bail when absent, so they are inert everywhere else:

| Module | Functionality |
|--------|--------------|
| `mobile-nav.js` | Mobile menu toggle, body scroll lock, escape key close, focus trap |
| `faq-accordion.js` | FAQ accordion open/close, keyboard nav, print expand/collapse |
| `smooth-scroll.js` | Anchor link smooth scrolling with header offset |
| `header-scroll.js` | Header shadow on scroll past 100px, active nav link detection |
| `form-validation.js` | Contact form validation, error states, success feedback |
| `scroll-reveal.js` | IntersectionObserver reveal animations, service card touch effects |
| `constellation.js` | Dynamic SVG lines connecting constellation stars (homepage guiding-stars section) |
| `conduit.js` | Drifting light-mote particles in the hero (reiki page) |
| `library.js` | Pull-out lendable book spines with note slips (resources page) |
| `review-comments.js` | Comment-on-anything review overlay; inert unless `?review=on` (or device-remembered). See "Review & feedback overlay" below |

Plus a vendored dependency: `public/scripts/vendor/html2canvas.min.js` (used by `review-comments.js` to screenshot the page when a comment is submitted).

**Note**: Scripts use `is:inline` to prevent Astro/Vite bundling.

### Review & feedback overlay

The site ships a "comment on anything" overlay so Elizabeth (or any reviewer) can leave feedback without GitHub:

- **Client**: `public/scripts/review-comments.js` is inert by default. It activates with `?review=on` in the URL (then remembers the device via `localStorage`). When active, the reviewer hovers/clicks any element, types a comment, and submits; the script screenshots the page (via vendored `html2canvas`) and captures element metadata (CSS selector, text, viewport).
- **Server**: `feedback-worker/` is a Cloudflare Worker (`POST /comments` rate-limited + origin/key-gated, `GET /comments` lists). Each submission commits the screenshot to a `feedback-assets` branch and opens a GitHub issue labelled `site-feedback`.
- **Operating / rotating the key / removing it**: deployed out-of-band via `npx wrangler deploy` (not in CI). See the `review-comment-overlay` entry in Claude's memory for the full operate/rotate/remove runbook. Do **not** change the overlay's behavior as a side effect of unrelated edits.

### Accessibility

- Skip link present on all pages
- ARIA labels on interactive elements
- `prefers-reduced-motion` respected for animations
- Keyboard navigation support for accordions and menus
- Semantic HTML5 structure throughout

### Responsive Breakpoints

Media queries at: 480px, 600px, 768px, 900px, 1024px (mobile-first approach)

## Editing Content

**To add/edit pages**: Create or modify `.astro` files in `src/pages/`

**To update navigation**: Edit `src/components/global/Header.astro` and `Footer.astro`

**To change design tokens**: Edit `src/styles/tokens.css`

**To modify CTA sections**: Use the `<CTA>` component with props, or edit `src/components/sections/CTA.astro` for the template

**To add a new illustration**: Run the `/new-illustration` skill (`.claude/skills/new-illustration/`), which creates the `.astro` file in the right subdirectory, updates that subdirectory's `index.ts` barrel, and bumps the counts in this file. (Manual path: create the `.astro` file, add it to the barrel, then run `npm run check:docs` to confirm the counts here are still correct.)

**To add a new page**: Run the `/new-page` skill (`.claude/skills/new-page/`), which scaffolds `src/pages/<name>.astro` on `BaseLayout` (plus a `src/styles/pages/<name>.css` for complex pages) and reminds you to wire nav links through `withBase()`.
