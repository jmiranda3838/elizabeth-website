#!/usr/bin/env node
// Doc-drift guard for CLAUDE.md. Run via `npm run check:docs`.
//
// Two directions:
//   A. Coverage: everything below that exists on disk must be named in CLAUDE.md
//        - pages (src/pages/**/*.{astro,md,mdx})      -> exact token on the layout tree's `pages/` line
//        - src/styles/{pages,sections}/*.css          -> "<pages|sections>/<file>.css"
//        - src/components/{global,sections}/*.astro   -> "<File>.astro" (whole word)
//        - illustration subdirectories                -> on the layout tree's illustrations line
//        - public/scripts/*.js and src/scripts/*.js   -> "`<file>.js`" (backticked)
//   B. No phantoms: everything CLAUDE.md names must still exist
//        - filenames in backticks or in the layout tree -> a file with that basename
//        - illustration subdirs on the tree line          -> a real subdirectory
//        - backticked class names/prefixes (`.foo`, `.foo-*`, `.foo*`) -> a selector in src/
//
// Exits 1 with a list of what to add/remove, 0 otherwise.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "CLAUDE.md"), "utf8");
const errors = [];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".astro",
  ".git",
  ".playwright-mcp",
  ".wrangler",
]);
const walk = (rel, out = []) => {
  const dir = join(root, rel);
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(rel, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const list = (rel, ext) =>
  walk(rel)
    .filter((p) => dirname(p) === rel && p.endsWith(ext))
    .map((p) => basename(p))
    .sort();
const subdirs = (rel) =>
  readdirSync(join(root, rel), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

// Fenced code blocks (the layout tree) vs. prose.
const fences = [...md.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]).join("\n");
const prose = md.replace(/```[\s\S]*?```/g, "");
const treeLine = (re) => fences.split("\n").find((l) => re.test(l)) ?? "";
const tokens = (line) => (line.split("#")[1] ?? "").split(/[\s,():]+/).filter(Boolean);

// --- A. Coverage -----------------------------------------------------------
const pageTokens = new Set(tokens(treeLine(/──\s*pages\//)));
for (const p of walk("src/pages").filter((p) => /\.(astro|mdx?)$/.test(p))) {
  const route = relative("src/pages", p).replace(/\.(astro|mdx?)$/, "");
  if (!pageTokens.has(route)) {
    errors.push(
      `Page src/pages/${relative("src/pages", p)} is missing from the layout tree's "pages/" line.`,
    );
  }
}

for (const sub of ["pages", "sections"]) {
  for (const f of list(`src/styles/${sub}`, ".css")) {
    if (!md.includes(`${sub}/${f}`)) {
      errors.push(
        `Stylesheet src/styles/${sub}/${f} is not in CLAUDE.md (add a Class map row naming "${sub}/${f}").`,
      );
    }
  }
}

for (const sub of ["global", "sections"]) {
  for (const f of list(`src/components/${sub}`, ".astro")) {
    if (!new RegExp(`(^|[^\\w])${esc(f)}`).test(md)) {
      errors.push(`Component src/components/${sub}/${f} is not mentioned in CLAUDE.md.`);
    }
  }
}

const illoLine = treeLine(/\bicons\/.*\bmisc\//);
const illoListed = new Set([...illoLine.matchAll(/([\w-]+)\//g)].map((m) => m[1]));
const illoReal = subdirs("src/components/illustrations");
if (!illoLine)
  errors.push(`Layout tree: no line listing the illustration subdirs (icons/ … misc/).`);
for (const sub of illoReal) {
  if (!illoListed.has(sub))
    errors.push(`Illustration subdir "${sub}/" is missing from the layout tree.`);
}
for (const sub of illoListed) {
  if (!illoReal.includes(sub))
    errors.push(`Layout tree lists illustration subdir "${sub}/", which doesn't exist.`);
}

for (const rel of ["public/scripts", "src/scripts"]) {
  for (const f of list(rel, ".js")) {
    if (!md.includes(`\`${f}\``)) {
      errors.push(`Script ${rel}/${f} is not documented (backticked) in CLAUDE.md.`);
    }
  }
}

// --- B. No phantoms --------------------------------------------------------
const allFiles = [
  ...walk("src"),
  ...walk("public"),
  ...walk("scripts"),
  ...walk("feedback-worker"),
  ...walk(".github"),
  ...walk(".claude"),
];
const basenames = new Set([...allFiles.map((p) => basename(p)), ...readdirSync(root)]);
const EXT = "astro|css|js|mjs|ts|json|toml|yml|md|txt|svg|png|jpg";

const named = [
  ...[...prose.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()),
  ...[...fences.matchAll(new RegExp(`[\\w./-]+\\.(?:${EXT})\\b`, "g"))].map((m) => m[0]),
];
const FILE_RE = new RegExp(`^[\\w@./-]*?([\\w.-]+\\.(?:${EXT}))$`);
for (const t of named) {
  const m = t.match(FILE_RE);
  if (m && !t.includes("<") && !t.includes("*") && !basenames.has(m[1])) {
    errors.push(`CLAUDE.md names "${t}", but no file "${m[1]}" exists.`);
  }
}

const cssText = allFiles
  .filter((p) => p.startsWith("src") && /\.(css|astro)$/.test(p))
  .map((p) => readFileSync(join(root, p), "utf8"))
  .join("\n");
const CLASS_RE = /^\.([a-z][\w-]*?)(-\*|\*)?$/;
for (const t of [...prose.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim())) {
  const m = t.match(CLASS_RE);
  if (!m) continue;
  const [, name, wildcard] = m;
  const re = wildcard
    ? new RegExp(`\\.${esc(name)}${wildcard === "-*" ? "-" : ""}[\\w-]*`)
    : new RegExp(`\\.${esc(name)}(?![\\w-])`);
  if (!re.test(cssText)) {
    errors.push(`CLAUDE.md names class \`${t}\`, but no matching selector exists in src/.`);
  }
}

if (errors.length) {
  console.error("✗ CLAUDE.md is out of sync with the codebase:\n");
  for (const e of errors) console.error("  - " + e);
  console.error("\nUpdate CLAUDE.md (or the code) so they agree.");
  process.exit(1);
}
console.log(
  "✓ CLAUDE.md matches the codebase (pages, styles, components, illustration subdirs, scripts, named files and classes).",
);
