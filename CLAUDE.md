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
├── pages/           # Astro pages (routes)
│   ├── index.astro
│   ├── about.astro
│   ├── therapy.astro
│   ├── resources.astro
│   ├── fees.astro
│   ├── faqs.astro
│   └── contact.astro
├── layouts/
│   └── BaseLayout.astro    # Main HTML wrapper
├── components/
│   ├── global/             # Site-wide components
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── sections/           # Reusable page sections
│   │   ├── CTA.astro
│   │   └── DecorativeDivider.astro
│   └── illustrations/      # SVG illustration components (~74 files)
│       ├── icons/           # Small functional icons (24-48px)
│       ├── botanicals/      # Decorative plant elements
│       ├── dividers/        # Section/page dividers
│       ├── frames/          # Corner and border frame elements
│       ├── scenes/          # Large illustrations (garland, gate, doorway)
│       ├── apothecary/      # Specialty topic icons
│       ├── specimens/       # Service card specimen illustrations
│       ├── moon/            # Moon phase icons
│       └── misc/            # Other decorative elements (quotes, stars)
├── styles/                 # Modular CSS
│   ├── global.css          # Main entry (imports all modules)
│   ├── tokens.css          # Design tokens (colors, spacing, typography)
│   ├── base.css            # Reset and base styles
│   ├── typography.css      # Heading and text utilities
│   ├── layout.css          # Grid and flex utilities
│   ├── components.css      # Buttons, header, footer styles
│   ├── sections.css        # Hero, service cards, CTA styles
│   ├── pages.css           # Page-specific styles
│   ├── utilities.css       # Decorative elements, helpers
│   ├── animations.css      # Keyframes and reveal system
│   ├── therapy-page.css    # Therapy page animations and styles
│   └── print.css           # Print media styles

public/
├── images/                 # Static image assets
└── scripts/
    └── main.js             # Client-side JavaScript (is:inline in layout)
```

### Key Conventions

**Routing**: Astro config uses `build.format: 'file'`, so routes produce `.html` extensions (e.g., `/about.html`, `/contact.html`). All internal links must use `.html` suffixes.

**Path aliases** (from tsconfig.json): `@/*` → `src/*`, `@components/*`, `@layouts/*`, `@styles/*`

**Pages**: Each `.astro` file in `src/pages/` becomes a route. Pages use `BaseLayout` and contain page-specific content.

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

**Illustrations**: SVG components in `src/components/illustrations/` accept `class` and `style` props and render a bare `<svg>` element. They use `currentColor` for theming via CSS color inheritance. Import with `@components/illustrations/...`.

**Generated/ignored paths**: Do not edit or rely on `dist/`, `.astro/`, `.playwright-mcp/`, `node_modules/`, or `migration-baselines/`. Source of truth is `src/` and `public/`.

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

### Animation System

**Scroll reveals**: Add `.reveal` class to elements for fade-in on scroll via IntersectionObserver.

**Staggered delays**: Use `.stagger-1` through `.stagger-8` for sequential transition delays:
```html
<div class="reveal stagger-1">Item 1</div>  <!-- 0.1s delay -->
<div class="reveal stagger-2">Item 2</div>  <!-- 0.2s delay -->
<div class="reveal stagger-3">Item 3</div>  <!-- 0.3s delay -->
```

Classes apply `transition-delay` from 0.1s to 0.8s in 0.1s increments.

### JavaScript (public/scripts/main.js)

Uses an IIFE pattern. Key functionality:
- Mobile menu with focus trap and aria-expanded state
- FAQ accordion with keyboard navigation and print expansion
- Scroll reveal animations via IntersectionObserver
- Header scroll behavior (adds `scrolled` class and box-shadow past 100px)
- Active navigation state detection based on current URL
- Smooth scroll with header offset compensation
- Form validation with error states
- Lazy image loading via `data-src` attribute
- Service card touch effects for mobile
- Dynamic SVG constellation lines connecting service cards (recalculates on resize)

**Note**: Script is loaded with `is:inline` in BaseLayout to prevent Astro/Vite bundling.

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
