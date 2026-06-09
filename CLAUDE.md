# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a therapy practice website built with **Astro** (static site generator). The site uses a component-based architecture with CSS custom properties for theming.

## Development

**Start dev server**: `npm run dev` (runs on http://localhost:4321)

**Build for production**: `npm run build` (outputs to dist/)

**Preview production build**: `npm run preview`

## Architecture

### File Structure

```
src/
├── pages/                  # Astro pages (routes)
│   ├── index.astro         # Homepage (hero, services, approach, support areas, process, testimonials, CTA)
│   ├── about.astro         # About page, "vision board" design (imports src/styles/pages/about.css)
│   ├── therapy.astro       # Therapy page, night theme (imports src/styles/pages/therapy.css)
│   ├── reiki.astro         # Reiki page, dawn "Conduit" theme (imports src/styles/pages/reiki.css)
│   ├── ways.astro          # Offerings hub, 4 cards (imports src/styles/pages/ways.css)
│   ├── resources.astro     # Resources page, "Lending Library" theme (imports src/styles/pages/resources.css)
│   ├── fees.astro
│   ├── faqs.astro          # FAQ page (has co-located <style is:global> for FAQ-specific CSS)
│   └── contact.astro       # Contact page (imports src/styles/pages/contact.css)
├── layouts/
│   └── BaseLayout.astro    # Main HTML wrapper (loads all 9 JS modules)
├── components/
│   ├── global/             # Site-wide components
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── sections/           # Reusable page sections
│   │   ├── CTA.astro
│   │   └── DecorativeDivider.astro
│   └── illustrations/      # SVG illustration components (79 files, 9 subdirectories)
│       ├── icons/           # Small functional icons (23 components)
│       ├── botanicals/      # Decorative plant elements (11 components)
│       ├── dividers/        # Section/page dividers (4 components)
│       ├── frames/          # Corner and border frame elements (10 components)
│       ├── scenes/          # Large illustrations (6 components)
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
│   │   ├── service-cards.css # .services-grid, .service-card, .specimen-card
│   │   ├── approach.css    # .approach-*, .grimoire-section, .botanical-frame
│   │   ├── support-areas.css # .apothecary-*, .areas-grid
│   │   ├── process-steps.css # .moon-journey-*, .moon-step, .steps-grid
│   │   ├── testimonials.css  # .journal-*, .testimonial-*, .client-wishes
│   │   ├── cta.css         # .decorative-divider, .cta-band, .botanical-cta
│   │   └── page-hero.css   # .page-hero (shared by about, faqs, contact, fees, resources)
│   └── pages/              # Page-specific styles imported directly by .astro pages
│       ├── therapy.css     # All therapy.astro styles (.threshold-*, .grimoire-*, .constellation-*, .specimen-tag-*, .garden-gate-*, etc.)
│       ├── reiki.css       # All reiki.astro styles (.conduit-*, .isisnt-*, .light-step*, .lantern-*, .bloom-*)
│       ├── ways.css        # All ways.astro styles (.ways-grid, .way-card*)
│       ├── about.css       # All about.astro styles (.board-*, .pinned-*, .polaroid, .washi-*, .twine-*)
│       ├── resources.css   # All resources.astro styles (.library-*, .shelf-*, .checkout-*, .bookmark-*, .catalog-*, .helpdesk-*, .lending-*)
│       └── contact.css     # All contact.astro styles (.contact-*, .form-*, .hint-text, .location-note)

public/
├── images/                 # Static image assets
└── scripts/                # Client-side JavaScript (9 IIFE modules, loaded via is:inline)
    ├── mobile-nav.js       # Mobile nav toggle + focus trap
    ├── faq-accordion.js    # FAQ accordion + print handling
    ├── smooth-scroll.js    # Anchor link smooth scrolling
    ├── header-scroll.js    # Header scroll behavior + active nav state
    ├── form-validation.js  # Contact form validation
    ├── scroll-reveal.js    # Reveal animations + service card touch effects
    ├── constellation.js    # Dynamic constellation SVG lines (therapy page)
    ├── conduit.js          # Drifting light motes (reiki page)
    └── library.js          # Pull-out book spines on the shelf (resources page)
```

### Key Conventions

**Routing**: Astro config uses `build.format: 'file'`, so routes produce `.html` extensions (e.g., `/about.html`, `/contact.html`). All internal links must use `.html` suffixes.

**Path aliases** (from tsconfig.json):
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@layouts/*` → `src/layouts/*`
- `@styles/*` → `src/styles/*`
- `@illustrations/*` → `src/components/illustrations/*`

**Pages**: Each `.astro` file in `src/pages/` becomes a route. Pages use `BaseLayout` and contain page-specific content. Pages with complex page-specific styling import a dedicated CSS file from `src/styles/pages/` (therapy, reiki, ways, about, resources, contact). The faqs page still uses a co-located `<style is:global>` block.

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
| index.astro | hero, service-cards, approach, support-areas, process-steps, testimonials, cta | — | — | — |
| about.astro | layout utilities | `pages/about.css` (all `.board-*`, `.pinned-*`, `.polaroid`, `.washi-*`, `.twine-*`, `.cert-*`) | — | — |
| therapy.astro | — | `pages/therapy.css` (all `.threshold-*`, `.manuscript-*`, `.grimoire-*`, `.roots-*`, `.constellation-*`, `.specimen-tag-*`, `.garden-gate-*`) | — | — |
| reiki.astro | — | `pages/reiki.css` (all `.conduit-*`, `.honest-*`, `.isisnt-*`, `.light-step*`, `.feel-*`, `.lantern-*`, `.bloom-*`) | — | — |
| ways.astro | page-hero | `pages/ways.css` (`.ways-grid`, `.way-card*`, `.way-icon`, `.soon-chip`) | — | — |
| faqs.astro | page-hero | — | `.faq-*`, `.crisis-callout` | — |
| contact.astro | page-hero, process-steps (.steps-grid) | `pages/contact.css` (all `.contact-*`, `.form-*`, `.hint-text`, `.form-subtitle`, `.form-footer`, `.location-note`) | — | — |
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
| `.cta-band`, `.botanical-cta` | Call-to-action sections with vine decorations | sections/cta.css |
| `.decorative-divider` | Leaf/vine section dividers | sections/cta.css |
| `.threshold-*` | Therapy page hero (arched doorway) | therapy.astro |
| `.manuscript-*` | Illuminated manuscript-style section | therapy.astro |
| `.constellation-*` | Star constellation grid for support areas | therapy.astro |
| `.specimen-tag-*` | Botanical specimen tag cards for services | therapy.astro |
| `.garden-gate-*` | Final CTA section with garden gate illustration | therapy.astro |
| `.roots-*` | Root system illustration section | therapy.astro |
| `.page-hero` | Shared hero banner for inner pages | sections/page-hero.css |
| `.conduit-*` | Reiki page hero and light-channel theme | pages/reiki.css |
| `.way-card`, `.ways-grid` | Offerings hub cards | pages/ways.css |
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

All 79 SVG components organized by subdirectory. Import via barrel files: `import { Name } from "@illustrations/subdir"`.

**icons/** (23): ArrowRight, IconChat, IconCheckCircle, IconClock, IconCollaborative, IconCompass, IconCrescentMoon, IconCrown, IconCrystal, IconEmail, IconGraduation, IconHandsOpen, IconHeart, IconImagePlaceholder, IconLicense, IconLocation, IconPhone, IconSeedling, IconShield, IconStar, IconSun, IconTraining, PlusExpand

**botanicals/** (11): FloatingBotanical1, FloatingBotanical2, HerbSprig, InitialFlourish, LavenderSprig, LeafBranch, PageBotanical, PressedFlower, SeedPodCluster, WelcomeWreath, Wildflower

**frames/** (10): CtaVineLeft, CtaVineRight, FrameCornerBL, FrameCornerBR, FrameCornerTL, FrameCornerTR, ManuscriptCornerBL, ManuscriptCornerBR, ManuscriptCornerTL, ManuscriptCornerTR

**apothecary/** (8): Butterfly, DroopingFlower, KintsugiBowl, Moth, Seedling, SpectrumArc, TwoFlowers, WillowBranch

**specimens/** (6): BloomingFlower, IntertwinedStems, SpreadingTree, TagBloomingFlower, TagIntertwinedStems, TagTree

**misc/** (8): CatalogPull, Clothespin, ConstellationStar, ManuscriptMargin, MoonPath, QuoteMark, SpecimenDivider, TagString

**scenes/** (6): BookSpine, DoorwayFrame, GardenGate, Garland, LightChannel, RootsSystem

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

Nine IIFE-wrapped modules loaded via `<script is:inline>` in BaseLayout. Page-specific modules query their page's selectors and bail when absent, so they are inert everywhere else:

| Module | Functionality |
|--------|--------------|
| `mobile-nav.js` | Mobile menu toggle, body scroll lock, escape key close, focus trap |
| `faq-accordion.js` | FAQ accordion open/close, keyboard nav, print expand/collapse |
| `smooth-scroll.js` | Anchor link smooth scrolling with header offset |
| `header-scroll.js` | Header shadow on scroll past 100px, active nav link detection |
| `form-validation.js` | Contact form validation, error states, success feedback |
| `scroll-reveal.js` | IntersectionObserver reveal animations, service card touch effects |
| `constellation.js` | Dynamic SVG lines connecting constellation stars (therapy page) |
| `conduit.js` | Drifting light-mote particles in the hero (reiki page) |
| `library.js` | Pull-out lendable book spines with note slips (resources page) |

**Note**: Scripts use `is:inline` to prevent Astro/Vite bundling.

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

**To add a new illustration**: Create an `.astro` file in the appropriate `src/components/illustrations/` subdirectory, then add it to that subdirectory's `index.ts` barrel file
