#!/usr/bin/env node
// Runs Lighthouse (mobile) several times on one URL and reports the median,
// because single runs can swing 5 to 10 points on Performance.
//
// Usage: node lighthouse.mjs <url> <outDir> <slug> [--runs 3]

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const [url, outDir = "docs/audit", slug = "home", ...rest] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node lighthouse.mjs <url> <outDir> <slug> [--runs 3]");
  process.exit(1);
}
const runsIdx = rest.indexOf("--runs");
const runs = runsIdx >= 0 ? Number(rest[runsIdx + 1]) || 3 : 3;

// Use Playwright's Chromium when Chrome isn't set, so no separate Chrome install is needed
if (!process.env.CHROME_PATH) {
  try {
    const { chromium } = await import("playwright");
    process.env.CHROME_PATH = chromium.executablePath();
  } catch { /* fall back to Lighthouse's own Chrome lookup */ }
}

await mkdir(outDir, { recursive: true });
const median = (xs) => {
  const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

const results = [];
for (let i = 1; i <= runs; i++) {
  const file = path.join(outDir, `lighthouse-${slug}-run${i}.json`);
  console.log(`Lighthouse run ${i}/${runs}: ${url}`);
  try {
    await run("npx", [
      "-y", "lighthouse", url,
      "--only-categories=performance,accessibility,seo,best-practices",
      "--output=json", `--output-path=${file}`,
      "--chrome-flags=--headless=new --no-sandbox", "--quiet",
    ], { maxBuffer: 50 * 1024 * 1024, timeout: 180000 });
    const r = JSON.parse(await readFile(file, "utf8"));
    const score = (k) => (r.categories[k]?.score == null ? null : Math.round(r.categories[k].score * 100));
    results.push({
      run: i,
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      lcpMs: Math.round(r.audits["largest-contentful-paint"]?.numericValue ?? NaN) || null,
      tbtMs: Math.round(r.audits["total-blocking-time"]?.numericValue ?? NaN) || null,
      cls: r.audits["cumulative-layout-shift"]?.numericValue ?? null,
      weightKb: Math.round((r.audits["total-byte-weight"]?.numericValue ?? 0) / 1024) || null,
      topOpportunities: Object.values(r.audits)
        .filter((a) => a.details?.type === "opportunity" && (a.details.overallSavingsMs > 0 || a.details.overallSavingsBytes > 0))
        .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
        .slice(0, 3)
        .map((a) => a.title),
    });
  } catch (e) {
    console.error(`Run ${i} failed: ${e.message.split("\n")[0]}`);
  }
}

const keys = ["performance", "accessibility", "bestPractices", "seo", "lcpMs", "tbtMs", "cls", "weightKb"];
const summary = {
  url,
  date: new Date().toISOString(),
  device: "Lighthouse default mobile emulation",
  runsCompleted: results.length,
  median: Object.fromEntries(keys.map((k) => [k, median(results.map((r) => r[k]))])),
  range: Object.fromEntries(keys.map((k) => {
    const xs = results.map((r) => r[k]).filter((x) => typeof x === "number");
    return [k, xs.length ? [Math.min(...xs), Math.max(...xs)] : null];
  })),
  topOpportunities: results[0]?.topOpportunities ?? [],
  runs: results,
};
await writeFile(path.join(outDir, `lighthouse-${slug}-summary.json`), JSON.stringify(summary, null, 2));
console.log(`\nMedian of ${results.length} runs:`, summary.median);
