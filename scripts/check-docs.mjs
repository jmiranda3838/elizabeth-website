#!/usr/bin/env node
// Doc-drift guard: verify that the counts and the script registry in CLAUDE.md
// still match the filesystem. Run via `npm run check:docs`.
//
// What it checks:
//   1. Total illustration .astro count           -> "(<N> files," and "All <N> SVG components"
//   2. Per-subdir illustration counts            -> tree "<subdir>/ ... (<N> components)"
//                                                   and registry "**<subdir>/** (<N>)"
//   3. Every public/scripts/*.js file is mentioned (backticked) somewhere in CLAUDE.md
//
// Exits 1 (with a clear expected-vs-found report) on any mismatch, 0 otherwise.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const claudeMdPath = join(repoRoot, "CLAUDE.md");
const illoRoot = join(repoRoot, "src/components/illustrations");
const scriptsRoot = join(repoRoot, "public/scripts");

const md = readFileSync(claudeMdPath, "utf8");
const errors = [];

const countFiles = (dir, ext) =>
  readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(ext))
    .length;

// --- 1 & 2: illustrations -------------------------------------------------
const subdirs = readdirSync(illoRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let total = 0;
for (const sub of subdirs) {
  const n = countFiles(join(illoRoot, sub), ".astro");
  total += n;

  const treeRe = new RegExp(`${sub}/[^\\n]*\\((\\d+) components?\\)`);
  const treeMatch = md.match(treeRe);
  if (!treeMatch) {
    errors.push(
      `File-structure tree: no "(N components)" entry found for "${sub}/" (expected ${n}).`,
    );
  } else if (Number(treeMatch[1]) !== n) {
    errors.push(`File-structure tree: "${sub}/" says (${treeMatch[1]} components) but found ${n}.`);
  }

  const regRe = new RegExp(`\\*\\*${sub}/\\*\\* \\((\\d+)\\)`);
  const regMatch = md.match(regRe);
  if (!regMatch) {
    errors.push(`Illustration registry: no "**${sub}/** (N)" entry found (expected ${n}).`);
  } else if (Number(regMatch[1]) !== n) {
    errors.push(`Illustration registry: "**${sub}/** (${regMatch[1]})" but found ${n}.`);
  }
}

if (!md.includes(`(${total} files,`)) {
  errors.push(
    `File-structure tree: illustrations header should read "(${total} files, 9 subdirectories)".`,
  );
}
if (!md.includes(`All ${total} SVG components`)) {
  errors.push(`Illustration registry: header should read "All ${total} SVG components".`);
}

// --- 3: scripts -----------------------------------------------------------
const scriptFiles = readdirSync(scriptsRoot, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith(".js"))
  .map((e) => e.name)
  .sort();

for (const f of scriptFiles) {
  if (!md.includes(`\`${f}\``)) {
    errors.push(
      `JavaScript registry: script "${f}" exists but is not documented (backticked) in CLAUDE.md.`,
    );
  }
}

// --- report ---------------------------------------------------------------
if (errors.length) {
  console.error("✗ CLAUDE.md is out of sync with the filesystem:\n");
  for (const e of errors) console.error("  - " + e);
  console.error(`\nFix CLAUDE.md so the counts/registry match, then re-run "npm run check:docs".`);
  process.exit(1);
}

console.log(
  `✓ CLAUDE.md docs in sync (${total} illustrations across ${subdirs.length} subdirs, ${scriptFiles.length} scripts).`,
);
