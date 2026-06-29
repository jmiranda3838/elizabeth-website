---
name: new-illustration
description: Scaffold a new SVG illustration component in src/components/illustrations/, wire it into the subdirectory's index.ts barrel, and keep CLAUDE.md's counts/registry in sync. Use when adding any icon, botanical, frame, divider, scene, apothecary, specimen, moon, or misc illustration.
---

# New illustration component

Scaffolds one SVG illustration the way this repo expects, and updates every place that must stay in sync so `npm run check:docs` keeps passing.

## Inputs (ask the user for any not given)
- **Component name** — PascalCase (e.g. `LotusBloom`). This is both the filename and the barrel export.
- **Subdirectory** — one of: `icons`, `botanicals`, `dividers`, `frames`, `scenes`, `apothecary`, `specimens`, `moon`, `misc`.
- **Short description** — one line for the SVG comment (e.g. "open lotus, three petals").
- **viewBox / SVG paths** — optional. If the user gives SVG content, use it. Otherwise scaffold a placeholder and tell them to drop paths in. Match the `viewBox` of sibling files in the chosen subdirectory (icons are usually `0 0 40 40`).

## Steps
1. **Confirm the subdir exists** under `src/components/illustrations/`. Confirm the component name isn't already taken (check the subdir and its `index.ts`).
2. **Create `src/components/illustrations/<subdir>/<Name>.astro`** from this exact template (it matches every other illustration — `class`/`style` props, bare `<svg>`, `currentColor` for theming):
   ```astro
   ---
   interface Props {
     class?: string;
     style?: string;
   }
   const { class: className = '', style = '' } = Astro.props;
   ---
   <svg class={className} style={style} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
     <!-- <short description> -->
     <path d="..." stroke="currentColor" stroke-width="1" fill="none"/>
   </svg>
   ```
   Replace the `viewBox`, comment, and paths. Use `currentColor` (never hard-coded hex) so the component themes via CSS color inheritance. For purely decorative icons, the consumer adds `aria-hidden`; don't bake it in unless siblings do.
3. **Append the barrel export** to `src/components/illustrations/<subdir>/index.ts`:
   ```ts
   export { default as <Name> } from './<Name>.astro';
   ```
4. **Update `CLAUDE.md`** so the doc-guard stays green (this is the step people forget — that's how the counts drifted before):
   - File-structure tree: bump the subdir's `(N components)`.
   - Illustration registry: bump `**<subdir>/** (N):` and add `<Name>` to that line's list.
   - Bump the illustrations total in both `(<T> files, 9 subdirectories)` and `All <T> SVG components`.
5. **Verify**: run `npm run check:docs` (must pass) and `npm run check:types`.

## Notes
- Import it via the barrel, never the file directly: `import { <Name> } from "@illustrations/<subdir>";`.
- If `npm run check:docs` fails, it prints the expected numbers — reconcile CLAUDE.md to match.
