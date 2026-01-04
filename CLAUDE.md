# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static HTML/CSS/JavaScript website for a therapy practice. It uses no build tools, bundlers, or frameworks—all files are hand-coded and served directly.

## Development

**Local development**: Serve files with any static HTTP server (e.g., `python -m http.server 8000` or VS Code Live Server extension) and open in browser.

**No build step required**—edit HTML/CSS/JS files directly and refresh.

## Architecture

### File Structure
- `index.html`, `about.html`, `contact.html`, `therapy.html`, `resources.html`, `fees.html`, `faqs.html` — Page templates
- `css/styles.css` — Single stylesheet with design system
- `js/main.js` — All JavaScript functionality (IIFE pattern)
- `images/` — Image assets including SVG botanical decorations

### Design System (in css/styles.css)

**CSS Variables** define the entire design system:
- Colors: `--warm-paper`, `--sage`, `--dusty-peach`, `--espresso`, `--soft-gold`, etc.
- Typography: Cormorant Garamond (serif headings), Inter (body), Raleway (navigation)
- Spacing scale: `--space-1` through `--space-32`
- Shadows: `--shadow-subtle`, `--shadow-soft`

**Visual Theme**: Coastal/French-country aesthetic with botanical SVG decorations, paper textures, and muted warm tones.

### JavaScript Patterns (js/main.js)

Uses an IIFE to avoid global scope pollution. Key functionality:
- Mobile menu with focus trap and aria-expanded state
- FAQ accordion with keyboard navigation
- Scroll reveal animations via IntersectionObserver
- Smooth scroll with header offset compensation
- Form validation with error states
- Lazy image loading via `data-src` attribute

### Accessibility

- Skip link present on all pages
- ARIA labels on interactive elements
- `prefers-reduced-motion` respected for animations
- Keyboard navigation support for accordions and menus
- Semantic HTML5 structure throughout

### Responsive Breakpoints

Media queries at: 480px, 600px, 768px, 900px, 1024px (mobile-first approach)
