#!/usr/bin/env node
// Crawls an existing website and saves what /audit needs to analyse it:
// screenshots (desktop + mobile), page structure, content, styles and tech hints.
// Read-only: it never submits forms, logs in or clicks buttons.
//
// Usage: node crawl.mjs <url> [outDir] [--max-pages 20]

import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const startArg = args[0];
if (!startArg) {
  console.error("Usage: node crawl.mjs <url> [outDir] [--max-pages 20]");
  process.exit(1);
}
const outDir = args[1] && !args[1].startsWith("--") ? args[1] : "docs/audit";
const maxIdx = args.indexOf("--max-pages");
const maxPages = maxIdx >= 0 ? Number(args[maxIdx + 1]) || 20 : 20;

const start = new URL(startArg);
const origin = start.origin;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|avif|svg|zip|mp4|mov|mp3|css|js|xml|txt|ico|woff2?)$/i;

function normalize(href) {
  try {
    const u = new URL(href, origin);
    if (u.origin !== origin) return null;
    if (SKIP_EXT.test(u.pathname)) return null;
    u.hash = "";
    u.search = "";
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

function slugFor(url) {
  const p = new URL(url).pathname.replace(/^\/|\/$/g, "");
  return (p || "home").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(page, url) {
  let response;
  try {
    response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    response = await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => null);
  }
  // Scroll through the page so lazy-loaded images and scroll animations trigger
  await page.evaluate(async () => {
    const el = window.__auditScroller();
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < el.scrollHeight; y += step) {
      el.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    el.scrollTo(0, 0);
  }).catch(() => {});
  await sleep(800);
  return response;
}

// Finds what actually scrolls. Some sites scroll inside body, main or a wrapper
// div instead of the window, which makes Playwright's fullPage screenshots blank.
const FIND_SCROLLER = () => {
  window.__auditScroller = () => {
    const root = document.scrollingElement || document.documentElement;
    if (root.scrollHeight > window.innerHeight + 50) {
      const s = getComputedStyle(root);
      if (s.overflowY !== "hidden") return root;
    }
    const candidates = [document.body, ...document.querySelectorAll("body > *, main, [data-scroll-container], #__next, #root")];
    let best = null;
    for (const c of candidates) {
      const s = getComputedStyle(c);
      if (/(auto|scroll)/.test(s.overflowY) && c.scrollHeight > c.clientHeight + 50) {
        if (!best || c.scrollHeight > best.scrollHeight) best = c;
      }
    }
    return best || root;
  };
};

// Full-page screenshot when the window scrolls; otherwise scroll-by-scroll
// viewport screenshots of the real scroll container (max 15).
async function fullShots(page, dir, base) {
  const windowScrolls = await page.evaluate(() => {
    const el = window.__auditScroller();
    return el === (document.scrollingElement || document.documentElement);
  });
  if (windowScrolls) {
    await page.screenshot({ path: path.join(dir, `${base}-full.png`), fullPage: true });
    return { mode: "fullPage", shots: 1 };
  }
  const { height, view } = await page.evaluate(() => {
    const el = window.__auditScroller();
    return { height: el.scrollHeight, view: el.clientHeight || window.innerHeight };
  });
  const steps = Math.min(15, Math.ceil(height / view));
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.__auditScroller().scrollTo(0, y), i * view);
    await sleep(500); // let scroll animations settle
    await page.screenshot({ path: path.join(dir, `${base}-scroll-${String(i + 1).padStart(2, "0")}.png`) });
  }
  await page.evaluate(() => window.__auditScroller().scrollTo(0, 0));
  return { mode: "scroll-by-scroll", shots: steps };
}

// Runs inside the page: collects structure, content and styles
function extract() {
  const text = (el) => (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  const meta = (sel) => document.querySelector(sel)?.getAttribute("content") || null;

  const links = [...document.querySelectorAll("a[href]")].map((a) => ({
    text: text(a).slice(0, 80) || a.getAttribute("aria-label") || a.querySelector("img")?.alt || "",
    href: a.getAttribute("href"),
    inNav: !!a.closest("nav, header"),
    inFooter: !!a.closest("footer"),
  }));

  const hashTargets = [...new Set(links.map((l) => l.href).filter((h) => h && h.includes("#")).map((h) => h.split("#")[1]).filter(Boolean))];
  const sections = hashTargets.map((id) => {
    const el = document.getElementById(id);
    return { id, found: !!el, heading: el ? text(el.querySelector("h1,h2,h3")) : null };
  });

  const images = [...document.images].map((img) => ({
    src: img.currentSrc || img.src,
    alt: img.getAttribute("alt"),
    width: img.naturalWidth,
    height: img.naturalHeight,
    displayedWidth: img.clientWidth,
  }));

  const forms = [...document.querySelectorAll("form")].map((f) => ({
    action: f.getAttribute("action"),
    method: f.getAttribute("method"),
    fields: [...f.querySelectorAll("input, select, textarea")]
      .filter((i) => i.type !== "hidden")
      .map((i) => ({
        tag: i.tagName.toLowerCase(),
        type: i.type || null,
        name: i.name || null,
        required: i.required,
        label: text(i.labels?.[0]) || i.getAttribute("aria-label") || i.placeholder || null,
        options: i.tagName === "SELECT" ? [...i.options].map((o) => o.text) : undefined,
      })),
  }));

  const ctas = [...document.querySelectorAll("button, a[class*=btn], a[class*=button], [role=button]")]
    .map((b) => text(b))
    .filter(Boolean)
    .slice(0, 40);

  // Style sampling
  const pick = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight,
      lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textTransform: s.textTransform,
      color: s.color, background: s.backgroundColor,
    };
  };
  const typography = {};
  for (const sel of ["body", "h1", "h2", "h3", "h4", "p", "a", "button", "nav a", "footer"]) {
    typography[sel] = pick(document.querySelector(sel));
  }

  const colorCount = {};
  const fontCount = {};
  const fontSizeCount = {};
  const all = [...document.querySelectorAll("body *")].slice(0, 4000);
  for (const el of all) {
    const s = getComputedStyle(el);
    if (el.clientWidth === 0 && el.clientHeight === 0) continue;
    for (const c of [s.color, s.backgroundColor, s.borderTopColor]) {
      if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") continue;
      colorCount[c] = (colorCount[c] || 0) + 1;
    }
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      fontCount[s.fontFamily] = (fontCount[s.fontFamily] || 0) + 1;
      fontSizeCount[s.fontSize] = (fontSizeCount[s.fontSize] || 0) + 1;
    }
  }
  const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

  const cssVars = {};
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of [...rules]) {
      if (rule.selectorText === ":root" && rule.style) {
        for (const prop of [...rule.style]) {
          if (prop.startsWith("--")) cssVars[prop] = rule.style.getPropertyValue(prop).trim();
        }
      }
    }
  }

  const tech = {
    shopify: !!window.Shopify,
    shopifyTheme: window.Shopify?.theme?.name || null,
    nextjs: !!window.__NEXT_DATA__ || !!document.querySelector("script[src*='/_next/']"),
    wordpress: !!document.querySelector("[href*='wp-content'], [src*='wp-content']"),
    squarespace: !!document.querySelector("[src*='squarespace']"),
    wix: !!document.querySelector("meta[name=generator][content*=Wix]"),
    webflow: !!document.documentElement.getAttribute("data-wf-page"),
    framer: !!document.querySelector("[src*='framer'], meta[name=generator][content*=Framer]"),
    generator: meta("meta[name=generator]"),
    gsap: !!window.gsap,
    analytics: {
      googleAnalytics: !!document.querySelector("script[src*='googletagmanager'], script[src*='google-analytics']"),
      metaPixel: !!document.querySelector("script[src*='connect.facebook.net']"),
    },
  };

  const headingOrder = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({ level: h.tagName, text: text(h).slice(0, 120) }));

  return {
    title: document.title,
    lang: document.documentElement.lang || null,
    description: meta("meta[name=description]"),
    og: { title: meta("meta[property='og:title']"), description: meta("meta[property='og:description']"), image: meta("meta[property='og:image']") },
    canonical: document.querySelector("link[rel=canonical]")?.href || null,
    favicon: document.querySelector("link[rel*=icon]")?.href || null,
    headings: headingOrder,
    h1Count: document.querySelectorAll("h1").length,
    links,
    sections,
    images,
    imagesMissingAlt: images.filter((i) => i.alt === null || i.alt.trim() === "").length,
    forms,
    ctas,
    typography,
    topColors: top(colorCount, 14),
    topFonts: top(fontCount, 6),
    topFontSizes: top(fontSizeCount, 10),
    cssVars,
    tech,
    pageHeight: window.__auditScroller ? window.__auditScroller().scrollHeight : document.body.scrollHeight,
    scrollsInside: window.__auditScroller && window.__auditScroller() !== (document.scrollingElement || document.documentElement)
      ? (window.__auditScroller().tagName.toLowerCase() + (window.__auditScroller().id ? "#" + window.__auditScroller().id : ""))
      : null,
    mainText: text(document.querySelector("main") || document.body).slice(0, 20000),
  };
}

async function fetchText(request, url) {
  try {
    const r = await request.get(url, { timeout: 10000 });
    return r.ok() ? await r.text() : null;
  } catch {
    return null;
  }
}

const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const mobile = await browser.newContext({ ...devices["iPhone 13"] });
await desktop.addInitScript(FIND_SCROLLER);
await mobile.addInitScript(FIND_SCROLLER);

await mkdir(path.join(outDir, "screenshots"), { recursive: true });
await mkdir(path.join(outDir, "content"), { recursive: true });

// Seed from robots.txt and sitemap.xml when they exist
const robots = await fetchText(desktop.request, `${origin}/robots.txt`);
const sitemap = await fetchText(desktop.request, `${origin}/sitemap.xml`);
const sitemapUrls = sitemap ? [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()) : [];

const queue = [normalize(start.toString())];
for (const u of sitemapUrls) {
  const n = normalize(u);
  if (n && !queue.includes(n)) queue.push(n);
}
const seen = new Set();
const pages = [];
const broken = [];

while (queue.length && pages.length < maxPages) {
  const url = queue.shift();
  if (!url || seen.has(url)) continue;
  seen.add(url);
  const slug = slugFor(url);
  console.log(`[${pages.length + 1}/${maxPages}] ${url}`);

  const page = await desktop.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
  page.on("requestfailed", (r) => failedRequests.push(r.url()));

  const t0 = Date.now();
  const response = await load(page, url);
  const loadMs = Date.now() - t0;
  const status = response?.status() ?? null;
  if (!status || status >= 400) {
    broken.push({ url, status });
    await page.close();
    continue;
  }

  const data = await page.evaluate(extract);
  const transferKb = await page.evaluate(() =>
    Math.round(performance.getEntriesByType("resource").reduce((s, e) => s + (e.transferSize || 0), 0) / 1024)
  );
  const headers = response.headers();

  await page.screenshot({ path: path.join(outDir, "screenshots", `${slug}-desktop-fold.png`) });
  const shotsDir = path.join(outDir, "screenshots");
  const desktopShots = await fullShots(page, shotsDir, `${slug}-desktop`);
  await page.close();

  const mpage = await mobile.newPage();
  await load(mpage, url);
  const mobileOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await mpage.screenshot({ path: path.join(shotsDir, `${slug}-mobile-fold.png`) });
  const mobileShots = await fullShots(mpage, shotsDir, `${slug}-mobile`);
  await mpage.close();

  await writeFile(
    path.join(outDir, "content", `${slug}.md`),
    `# ${data.title}\n\nURL: ${url}\n\n## Headings\n${data.headings.map((h) => `- ${h.level}: ${h.text}`).join("\n")}\n\n## Text\n${data.mainText}\n`
  );

  const { mainText, ...rest } = data;
  pages.push({
    url, slug, status, loadMs, transferKb, mobileOverflow, consoleErrors, failedRequests,
    screenshots: { desktop: desktopShots, mobile: mobileShots },
    server: headers["server"] || null, poweredBy: headers["x-powered-by"] || null,
    vercel: !!headers["x-vercel-id"],
    ...rest,
  });

  for (const l of data.links) {
    const n = l.href && !/^(mailto|tel|javascript):/i.test(l.href) ? normalize(l.href) : null;
    if (n && !seen.has(n) && !queue.includes(n)) queue.push(n);
  }
  await sleep(500); // be polite to the server
}

const external = [...new Set(pages.flatMap((p) => p.links.map((l) => l.href)).filter((h) => /^https?:/i.test(h) && !h.startsWith(origin)))];
const contact = [...new Set(pages.flatMap((p) => p.links.map((l) => l.href)).filter((h) => /^(mailto|tel):/i.test(h)))];

const result = {
  startUrl: start.toString(),
  origin,
  crawledAt: new Date().toISOString(),
  pagesCrawled: pages.length,
  pagesQueuedButSkipped: queue.length,
  hasRobotsTxt: !!robots,
  hasSitemap: !!sitemap,
  sitemapUrls,
  broken,
  external,
  contact,
  pages,
};

await writeFile(path.join(outDir, "audit-data.json"), JSON.stringify(result, null, 2));
await browser.close();

console.log(`\nDone: ${pages.length} pages, ${broken.length} broken, ${queue.length} not crawled (raise --max-pages to include them).`);
console.log(`Saved to ${outDir}/ (audit-data.json, screenshots/, content/)`);
