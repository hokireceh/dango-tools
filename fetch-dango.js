#!/usr/bin/env node
/**
 * fetch-dango.js — fetch Dango docs dari 3 sumber ke ./docs/dango-docs/
 * Sources:
 *   1. https://docs.dango.exchange/        (The Dango Book)
 *   2. https://dango-4.gitbook.io/dango-docs (GitBook)
 *   3. https://raw.githubusercontent.com/left-curve/left-curve/main (GitHub)
 * Usage: node fetch-dango.js
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "./docs/dango-docs";
const DELAY = 800;

const BOOK_PAGES = [
  { slug: "index",        url: "https://docs.dango.exchange/" },
  { slug: "all-chapters", url: "https://docs.dango.exchange/print.html" },
];

const GITBOOK_PAGES = [
  { slug: "about",         url: "https://dango-4.gitbook.io/dango-docs" },
  { slug: "architecture",  url: "https://dango-4.gitbook.io/dango-docs/architecture-and-technology" },
  { slug: "core-features", url: "https://dango-4.gitbook.io/dango-docs/core-features" },
  { slug: "trading",       url: "https://dango-4.gitbook.io/dango-docs/trading" },
  { slug: "referral",      url: "https://dango-4.gitbook.io/dango-docs/referral-system" },
  { slug: "points",        url: "https://dango-4.gitbook.io/dango-docs/points" },
  { slug: "audits",        url: "https://dango-4.gitbook.io/dango-docs/audits" },
  { slug: "accounts",      url: "https://dango-4.gitbook.io/dango-docs/accounts" },
  { slug: "roadmap",       url: "https://dango-4.gitbook.io/dango-docs/roadmap" },
  { slug: "team",          url: "https://dango-4.gitbook.io/dango-docs/team" },
  { slug: "community",     url: "https://dango-4.gitbook.io/dango-docs/community" },
];

const GH_BASE = "https://raw.githubusercontent.com/left-curve/left-curve/main";
const GH_FILES = [
  { slug: "README",                path: "README.md" },
  { slug: "AGENTS",                path: "AGENTS.md" },
  { slug: "CONTRIBUTING",          path: "CONTRIBUTING.md" },
  { slug: "TYPESCRIPT_GUIDELINES", path: "TYPESCRIPT_GUIDELINES.md" },
  { slug: "telemetry",             path: "telemetry.md" },
  { slug: "dango-README",          path: "dango/README.md" },
  { slug: "sdk-README",            path: "sdk/README.md" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function htmlToMd(html) {
  const clean = (s) => s.replace(/<[^>]+>/g, "").trim();
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => "\n\n# " + clean(t) + "\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => "\n\n## " + clean(t) + "\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => "\n\n### " + clean(t) + "\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => "\n\n#### " + clean(t) + "\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => "\n- " + clean(t))
    .replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, (_, t) => "| " + clean(t) + " ")
    .replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (_, t) => "| " + clean(t) + " ")
    .replace(/<tr[^>]*>/gi, "\n")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, t) => "\n```\n" + clean(t) + "\n```\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => "`" + clean(t) + "`")
    .replace(/<\/(p|div|section|article|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function fetchUrl(url, label) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "fetch-dango-docs/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) { console.warn("  ⚠  " + label + ": HTTP " + res.status); return null; }
    return await res.text();
  } catch (e) {
    console.warn("  ✗  " + label + ": " + e.message); return null;
  }
}

async function saveFile(dir, name, content) {
  await writeFile(join(dir, name), content, "utf8");
}

async function main() {
  const t0 = Date.now();
  let ok = 0, skip = 0, fail = 0;

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   fetch-dango.js  -  Dango Docs      ║");
  console.log("╚══════════════════════════════════════╝\n");

  const dir1 = join(OUT, "1-dango-book");
  const dir2 = join(OUT, "2-gitbook");
  const dir3 = join(OUT, "3-github");
  for (const d of [OUT, dir1, dir2, dir3]) await mkdir(d, { recursive: true });

  // Source 1
  console.log("📖  Source 1: docs.dango.exchange");
  for (const p of BOOK_PAGES) {
    process.stdout.write("  -> " + p.slug + " ... ");
    const raw = await fetchUrl(p.url, p.slug);
    if (!raw) { fail++; continue; }
    const md = htmlToMd(raw);
    if (md.length < 200) { console.log("(kosong/404 - skip)"); skip++; }
    else {
      await saveFile(dir1, p.slug + ".md", "> SOURCE: " + p.url + "\n\n" + md);
      console.log("OK  (" + (md.length/1024).toFixed(1) + " KB)");
      ok++;
    }
    await sleep(DELAY);
  }

  // Source 2
  console.log("\n📚  Source 2: dango-4.gitbook.io");
  for (const p of GITBOOK_PAGES) {
    process.stdout.write("  -> " + p.slug + " ... ");
    const raw = await fetchUrl(p.url, p.slug);
    if (!raw) { fail++; continue; }
    const md = htmlToMd(raw);
    if (md.length < 200) { console.log("(kosong/404 - skip)"); skip++; }
    else {
      await saveFile(dir2, p.slug + ".md", "> SOURCE: " + p.url + "\n\n" + md);
      console.log("OK  (" + (md.length/1024).toFixed(1) + " KB)");
      ok++;
    }
    await sleep(DELAY);
  }

  // Source 3
  console.log("\n🐙  Source 3: github.com/left-curve/left-curve");
  for (const f of GH_FILES) {
    const url = GH_BASE + "/" + f.path;
    process.stdout.write("  -> " + f.slug + " ... ");
    const raw = await fetchUrl(url, f.slug);
    if (!raw) { fail++; continue; }
    if (raw.length < 50) { console.log("(kosong - skip)"); skip++; }
    else {
      await saveFile(dir3, f.slug + ".md", "> SOURCE: " + url + "\n\n" + raw);
      console.log("OK  (" + (raw.length/1024).toFixed(1) + " KB)");
      ok++;
    }
    await sleep(DELAY);
  }

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  const index = [
    "# dango-docs — Index",
    "> Generated: " + new Date().toISOString() + " | Elapsed: " + elapsed + "s",
    "",
    "## Stats",
    "- Fetched : " + ok,
    "- Skipped : " + skip,
    "- Failed  : " + fail,
    "",
    "## Source 1 — Dango Book",
    ...BOOK_PAGES.map((p) => "- [" + p.slug + "](1-dango-book/" + p.slug + ".md)  ->  " + p.url),
    "",
    "## Source 2 — GitBook",
    ...GITBOOK_PAGES.map((p) => "- [" + p.slug + "](2-gitbook/" + p.slug + ".md)  ->  " + p.url),
    "",
    "## Source 3 — GitHub",
    ...GH_FILES.map((f) => "- [" + f.slug + "](3-github/" + f.slug + ".md)  ->  " + GH_BASE + "/" + f.path),
  ].join("\n");
  await saveFile(OUT, "INDEX.md", index);

  console.log("\n─────────────────────────────────");
  console.log("Fetched : " + ok);
  console.log("Skipped : " + skip);
  console.log("Failed  : " + fail);
  console.log("Elapsed : " + elapsed + "s");
  console.log("Output  : " + OUT + "/");
  console.log("─────────────────────────────────\n");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });