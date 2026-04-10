#!/usr/bin/env node
/**
 * fetch-dango.js
 * Fetches Dango documentation from 3 sources and saves to ./dango-docs/
 *
 * Sources:
 *  1. https://docs.dango.exchange/        (The Dango Book - mdBook)
 *  2. https://dango-4.gitbook.io/dango-docs (GitBook docs)
 *  3. https://github.com/left-curve/left-curve (GitHub repo - raw files)
 *
 * Usage: node fetch-dango.js
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTPUT_DIR = "./docs/dango-docs";
const DELAY_MS = 800; // polite delay between requests

// ─────────────────────────────────────────────────────────────
// 1. THE DANGO BOOK  (docs.dango.exchange)
//    Served as mdBook HTML. Pages discoverable via sidebar.
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// 1. THE DANGO BOOK  (docs.dango.exchange)
//    mdBook: print.html = semua chapter dalam 1 halaman (paling reliable)
// ─────────────────────────────────────────────────────────────
const DANGO_BOOK_PAGES = [
  { slug: "index",        url: "https://docs.dango.exchange/" },
  { slug: "all-chapters", url: "https://docs.dango.exchange/print.html" },
];

// ─────────────────────────────────────────────────────────────
// 2. GITBOOK DOCS  (dango-4.gitbook.io/dango-docs)
// ─────────────────────────────────────────────────────────────
const GITBOOK_PAGES = [
  { slug: "about",          url: "https://dango-4.gitbook.io/dango-docs" },
  { slug: "architecture",   url: "https://dango-4.gitbook.io/dango-docs/architecture-and-technology" },
  { slug: "core-features",  url: "https://dango-4.gitbook.io/dango-docs/core-features" },
  { slug: "trading",        url: "https://dango-4.gitbook.io/dango-docs/trading" },
  { slug: "referral",       url: "https://dango-4.gitbook.io/dango-docs/referral-system" },
  { slug: "points",         url: "https://dango-4.gitbook.io/dango-docs/points" },
  { slug: "audits",         url: "https://dango-4.gitbook.io/dango-docs/audits" },
  { slug: "accounts",       url: "https://dango-4.gitbook.io/dango-docs/accounts" },
  { slug: "roadmap",        url: "https://dango-4.gitbook.io/dango-docs/roadmap" },
  { slug: "team",           url: "https://dango-4.gitbook.io/dango-docs/team" },
  { slug: "community",      url: "https://dango-4.gitbook.io/dango-docs/community" },
];

// ─────────────────────────────────────────────────────────────
// 3. GITHUB RAW FILES  (left-curve/left-curve)
//    Fetch key markdown files directly from raw.githubusercontent.com
// ─────────────────────────────────────────────────────────────
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/left-curve/left-curve/main";
const GITHUB_FILES = [
  { slug: "README",                path: "README.md" },
  { slug: "AGENTS",                path: "AGENTS.md" },
  { slug: "CONTRIBUTING",          path: "CONTRIBUTING.md" },
  { slug: "TYPESCRIPT_GUIDELINES", path: "TYPESCRIPT_GUIDELINES.md" },
  { slug: "telemetry",             path: "telemetry.md" },
  { slug: "dango-README",          path: "dango/README.md" },
  { slug: "sdk-README",            path: "sdk/README.md" },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Simple delay */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Strip HTML tags and collapse whitespace for clean text output */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

/** Fetch a single URL, return text or null on failure */
async function fetchPage(url, label) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; fetch-dango-docs/1.0)",
        Accept: "text/html,text/plain,*/*",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`  ⚠  ${label}: HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  ✗  ${label}: ${err.message}`);
    return null;
  }
}

/** Write text content to a file */
async function save(dir, filename, content) {
  const filepath = join(dir, filename);
  await writeFile(filepath, content, "utf8");
  return filepath;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  const stats = { ok: 0, skip: 0, fail: 0 };
  const startTime = Date.now();

  console.log("╔══════════════════════════════════════════╗");
  console.log("║       fetch-dango.js  –  Dango Docs      ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Create output dirs
  const dirBook   = join(OUTPUT_DIR, "1-dango-book");
  const dirGitbook = join(OUTPUT_DIR, "2-gitbook");
  const dirGithub  = join(OUTPUT_DIR, "3-github");
  for (const d of [OUTPUT_DIR, dirBook, dirGitbook, dirGithub]) {
    await mkdir(d, { recursive: true });
  }

  // ── SOURCE 1: The Dango Book ──────────────────────────────
  console.log("📖  Source 1: docs.dango.exchange (The Dango Book)");
  for (const page of DANGO_BOOK_PAGES) {
    process.stdout.write(`  → ${page.slug} ... `);
    const raw = await fetchPage(page.url, page.slug);
    if (raw) {
      const text = stripHtml(raw);
      if (text.length < 200) {
        console.log("(empty/404 — skipped)");
        stats.skip++;
      } else {
        await save(dirBook, `${page.slug}.txt`, `SOURCE: ${page.url}\n\n${text}`);
        console.log(`✓ (${(text.length / 1024).toFixed(1)} KB)`);
        stats.ok++;
      }
    } else {
      stats.fail++;
    }
    await sleep(DELAY_MS);
  }

  // ── SOURCE 2: GitBook ─────────────────────────────────────
  console.log("\n📚  Source 2: dango-4.gitbook.io (GitBook Docs)");
  for (const page of GITBOOK_PAGES) {
    process.stdout.write(`  → ${page.slug} ... `);
    const raw = await fetchPage(page.url, page.slug);
    if (raw) {
      const text = stripHtml(raw);
      if (text.length < 200) {
        console.log("(empty/404 — skipped)");
        stats.skip++;
      } else {
        await save(dirGitbook, `${page.slug}.txt`, `SOURCE: ${page.url}\n\n${text}`);
        console.log(`✓ (${(text.length / 1024).toFixed(1)} KB)`);
        stats.ok++;
      }
    } else {
      stats.fail++;
    }
    await sleep(DELAY_MS);
  }

  // ── SOURCE 3: GitHub Raw Files ────────────────────────────
  console.log("\n🐙  Source 3: github.com/left-curve/left-curve (Raw Files)");
  for (const file of GITHUB_FILES) {
    const url = `${GITHUB_RAW_BASE}/${file.path}`;
    process.stdout.write(`  → ${file.slug} (${file.path}) ... `);
    const raw = await fetchPage(url, file.slug);
    if (raw) {
      if (raw.length < 50) {
        console.log("(empty — skipped)");
        stats.skip++;
      } else {
        await save(dirGithub, `${file.slug}.md`, `SOURCE: ${url}\n\n${raw}`);
        console.log(`✓ (${(raw.length / 1024).toFixed(1)} KB)`);
        stats.ok++;
      }
    } else {
      stats.fail++;
    }
    await sleep(DELAY_MS);
  }

  // ── WRITE INDEX ───────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const index = [
    "# dango-docs — Fetch Index",
    `Generated: ${new Date().toISOString()}`,
    `Elapsed: ${elapsed}s`,
    "",
    "## Structure",
    "```",
    "dango-docs/",
    "  1-dango-book/    → docs.dango.exchange (The Dango Book)",
    "  2-gitbook/       → dango-4.gitbook.io/dango-docs (GitBook)",
    "  3-github/        → raw files from left-curve/left-curve repo",
    "```",
    "",
    "## Stats",
    `- ✓ Fetched : ${stats.ok}`,
    `- ⚠ Skipped : ${stats.skip}`,
    `- ✗ Failed  : ${stats.fail}`,
    "",
    "## Source 1: The Dango Book",
    ...DANGO_BOOK_PAGES.map((p) => `- ${p.slug}.txt  →  ${p.url}`),
    "",
    "## Source 2: GitBook Docs",
    ...GITBOOK_PAGES.map((p) => `- ${p.slug}.txt  →  ${p.url}`),
    "",
    "## Source 3: GitHub Raw Files",
    ...GITHUB_FILES.map((f) => `- ${f.slug}.md  →  ${GITHUB_RAW_BASE}/${f.path}`),
  ].join("\n");

  await save(OUTPUT_DIR, "INDEX.md", index);

  // ── SUMMARY ───────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log(`✓ Fetched : ${stats.ok}`);
  console.log(`⚠ Skipped : ${stats.skip}  (404 / too short)`);
  console.log(`✗ Failed  : ${stats.fail}`);
  console.log(`⏱ Elapsed : ${elapsed}s`);
  console.log(`📁 Output  : ${OUTPUT_DIR}/`);
  console.log("─────────────────────────────────────────\n");

  if (stats.fail > 0) {
    console.log("Note: Some pages failed — they may need login or the URL changed.");
    console.log("Check dango-docs/INDEX.md for the full list.\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});