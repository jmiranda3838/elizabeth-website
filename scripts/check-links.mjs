#!/usr/bin/env node
// Offline internal-link checker. Run via `npm run check:links` (no dev server needed).
//
// Scans src/**/*.astro for internal paths written as withBase('...'), href="/...",
// or src="/...", and asserts each one resolves to:
//   - a page in src/pages/        (e.g. /about.html  -> src/pages/about.astro)
//   - a redirect key in astro.config.mjs   (e.g. /therapy, /ways)
//   - an asset under public/       (e.g. /images/x.png, /scripts/x.js)
//
// External URLs, anchors (#...), mailto:/tel:, protocol-relative (//...) and
// non-literal (variable/expression) paths are skipped — same rule as withBase().
// Exits 1 on any broken reference, 0 otherwise.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(repoRoot, "src");
const pagesDir = join(srcDir, "pages");
const publicDir = join(repoRoot, "public");

// Assets that Astro generates at build time (not present in public/) — don't flag.
const GENERATED_ASSETS = new Set(["/sitemap-index.xml", "/sitemap-0.xml"]);

// ---- recursive file walk -------------------------------------------------
function walk(dir, filter, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

// ---- build the set of valid routes ---------------------------------------
const validRoutes = new Set(["/"]);

for (const file of walk(
  pagesDir,
  (p) => p.endsWith(".astro") || p.endsWith(".md") || p.endsWith(".mdx"),
)) {
  let rel = file.slice(pagesDir.length).replace(/\\/g, "/"); // e.g. /about.astro
  rel = rel.replace(/\.(astro|md|mdx)$/, ""); // /about
  if (rel.endsWith("/index")) {
    const base = rel.slice(0, -"/index".length) || "";
    validRoutes.add((base || "") + "/");
    validRoutes.add((base || "") + "/index.html");
  } else if (rel === "/index") {
    validRoutes.add("/");
    validRoutes.add("/index.html");
  } else {
    validRoutes.add(rel + ".html");
  }
}

// redirect keys from astro.config.mjs
const cfg = readFileSync(join(repoRoot, "astro.config.mjs"), "utf8");
const redirectBlock = cfg.match(/redirects:\s*\{([\s\S]*?)\}/);
if (redirectBlock) {
  for (const m of redirectBlock[1].matchAll(/['"](\/[^'"]+)['"]\s*:/g)) {
    const key = m[1];
    validRoutes.add(key);
    if (!extname(key)) validRoutes.add(key + ".html");
  }
}

// ---- collect candidate internal paths ------------------------------------
const SKIP = /^(https?:|mailto:|tel:|sms:|#|\/\/|data:)/;
const candidates = []; // { path, file }

for (const file of walk(srcDir, (p) => p.endsWith(".astro"))) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(repoRoot.length + 1);

  const push = (raw) => {
    if (!raw || SKIP.test(raw) || !raw.startsWith("/")) return;
    candidates.push({ path: raw, file: rel });
  };

  // withBase('...') / withBase("...") / withBase(`...`)
  for (const m of text.matchAll(/withBase\(\s*(['"`])([^'"`]+)\1\s*\)/g)) push(m[2]);
  // raw href="/..." / href='/...'  and  src="/..." / src='/...'  (static attributes)
  for (const m of text.matchAll(/(?:href|src)=(['"])(\/[^'"]+)\1/g)) push(m[2]);
}

// ---- validate ------------------------------------------------------------
const broken = [];
for (const { path: raw, file } of candidates) {
  const clean = raw.split("#")[0].split("?")[0];
  if (clean === "") continue; // pure anchor/query

  if (clean === "/" || clean.endsWith(".html")) {
    if (!validRoutes.has(clean)) {
      broken.push({ file, raw, reason: `no page in src/pages/ or redirect for "${clean}"` });
    }
    continue;
  }

  if (extname(clean)) {
    // asset reference
    if (GENERATED_ASSETS.has(clean)) continue;
    const onDisk = join(publicDir, decodeURIComponent(clean));
    if (!(existsSync(onDisk) && statSync(onDisk).isFile())) {
      broken.push({ file, raw, reason: `asset not found at public${clean}` });
    }
    continue;
  }

  // extensionless route (e.g. a redirect key like /therapy)
  if (!validRoutes.has(clean) && !validRoutes.has(clean + ".html")) {
    broken.push({ file, raw, reason: `no route/redirect for "${clean}"` });
  }
}

// ---- report --------------------------------------------------------------
if (broken.length) {
  console.error(`✗ ${broken.length} broken internal reference(s):\n`);
  for (const b of broken) console.error(`  - ${b.file}: ${b.raw}\n      ${b.reason}`);
  process.exit(1);
}

console.log(`✓ All ${candidates.length} internal links/assets resolve.`);
