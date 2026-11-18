---
name: new-illustration
description: Scaffold a new SVG illustration component in src/components/illustrations/, wire it into the subdirectory's index.ts barrel, and pass the repo gate. Use when adding any icon, botanical, frame, divider, scene, apothecary, specimen, moon, or misc illustration.
---

# New illustration component

Scaffolds one SVG illustration the way this repo expects and leaves `npm run check` green.

## Inputs (ask the user for any not given)

- **Component name**: PascalCase (e.g. `LotusBloom`). It is both the filename and the barrel export.
- **Subdirectory**: one of `icons`, `botanicals`, `dividers`, `frames`, `scenes`, `apothecary`, `specimens`, `moon`, `misc`.
- **Short description**: one line for the SVG comment (e.g. "open lotus, three petals").
- **SVG content**: optional. If the user gives SVG content, use it. Otherwise scaffold a placeholder path and tell them to drop the real paths in.

## Steps

1. **Check the name is free**: no `<Name>.astro` in the subdir and no `<Name>` export in its `index.ts`.
2. **Pick the viewBox from siblings.** Open 2–3 files in the chosen subdir and match their viewBox. Typical values: icons mostly `0 0 24 24` (some 32 or 40), apothecary and moon `0 0 60 60`, specimens `0 0 80 100` or `0 0 60 80`. Dividers and scenes vary (wide, e.g. `0 0 400 40`, `0 0 800 400`).
3. **Create `src/components/illustrations/<subdir>/<Name>.astro`** in this shape. It is already Prettier-clean: double quotes, a blank line after the frontmatter, wrapped attributes, explicit closing tags.

   ```astro
   ---
   interface Props {
     class?: string;
     style?: string;
     [key: string]: unknown;
   }
   const { class: className = "", style = "", ...rest } = Astro.props;
   ---

   <svg
     class={className}
     style={style}
     {...rest}
     viewBox="0 0 24 24"
     fill="none"
     xmlns="http://www.w3.org/2000/svg"
   >
     <!-- <short description> -->
     <path d="M4 12 Q12 4 20 12" stroke="currentColor" stroke-width="1" fill="none"></path>
   </svg>
   ```

   - Draw with `currentColor`, never a hard-coded hex, so the component themes through CSS `color`.
   - The `...rest` spread is deliberate: it lets callers pass `aria-hidden="true"` (and `role`, `aria-label`). Most older illustrations lack it and silently drop those attributes (see CLAUDE.md). Copy the pattern from scenes/RootsSystem.astro. Don't bake `aria-hidden` into the component.

4. **Add the barrel export** to `src/components/illustrations/<subdir>/index.ts`, **in alphabetical position** (all barrels are sorted).

   ```ts
   export { default as <Name> } from "./<Name>.astro";
   ```

5. **Verify**: run `npm run format`, then `npm run check`. CLAUDE.md lists subdirectories, not individual components, so no doc edit is needed unless you add a new subdirectory. If you do add one, list it in the CLAUDE.md layout tree and `check:docs` will confirm it.

## Usage

Import it through the barrel, never the file directly: `import { <Name> } from "@illustrations/<subdir>";`, then `<Name class="…" aria-hidden="true" />`.
