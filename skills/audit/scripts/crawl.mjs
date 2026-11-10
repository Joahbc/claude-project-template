#!/usr/bin/env node
// Crawls an existing website and saves what /audit needs to analyse it:
// screenshots (desktop + mobile), page structure, content, styles and tech hints.
// Read-only: it never submits forms, logs in, follows a click or changes anything.
// The only interactions are:
// - a cookie banner's Decline/Reject button, so screenshots aren't covered by it
//   (pass --keep-cookie-banner to skip that)
// - on the first page, the mobile menu toggle (a button, never a link) and the
//   Escape key, to check the menu opens, reports aria-expanded and closes again.
//   Skipped quietly if no toggle is found.
//
// Usage: node crawl.mjs <url> [outDir] [--max-pages 20] [--keep-cookie-banner]

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

let chromium, devices;
try {
  ({ chromium, devices } = await import("playwright"));
} catch {
  const dir = path.dirname(new URL(import.meta.url).pathname);
  console.error(`Playwright isn't installed next to this script. Run setup once:\n  cd "${dir}" && npm install && npx playwright install chromium`);
  process.exit(1);
}

const args = process.argv.slice(2);
const startArg = args[0];
if (!startArg) {
  console.error("Usage: node crawl.mjs <url> [outDir] [--max-pages 20]");
  process.exit(1);
}
const outDir = args[1] && !args[1].startsWith("--") ? args[1] : "docs/audit";
const maxIdx = args.indexOf("--max-pages");
const maxPages = maxIdx >= 0 ? Number(args[maxIdx + 1]) || 20 : 20;
const keepCookieBanner = args.includes("--keep-cookie-banner");

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
  const cookieBanner = keepCookieBanner ? { found: false, dismissed: false, skipped: true } : await dismissCookieBanner(page);
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
  return { response, cookieBanner };
}

// Known consent tools first, then any visible button whose text means "decline".
// Only ever clicks a decline/reject option, never accept or anything else.
const BANNER_SELECTORS = [
  "#shopify-pc__banner__btn-decline",          // Shopify Customer Privacy
  "#CybotCookiebotDialogBodyButtonDecline",    // Cookiebot
  "#onetrust-reject-all-handler",              // OneTrust
  ".cky-btn-reject",                           // CookieYes
  "#cookiescript_reject",                      // CookieScript
  "[data-cookiefirst-action='reject']",        // CookieFirst
  ".cmplz-deny",                               // Complianz (WordPress)
];
const DECLINE_TEXT = /^\s*(decline|decline all|reject|reject all|deny|refuse|only necessary|necessary only|use necessary cookies only|afvis|afvis alle|kun nødvendige|kun nødvendige cookies|rechazar|rechazar todo)\s*$/i;

const bannerChecked = new WeakSet();

async function dismissCookieBanner(page) {
  // Banners often appear a moment after load, so wait up to 3 s on the first page
  // of each browser context; after that one quick check is enough.
  const ctx = page.context();
  const deadline = Date.now() + (bannerChecked.has(ctx) ? 0 : 3000);
  bannerChecked.add(ctx);
  do {
    for (const sel of BANNER_SELECTORS) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 2000 }).catch(() => {});
        await sleep(400);
        return { found: true, dismissed: true, via: sel };
      }
    }
    const buttons = page.locator("button, [role=button], a[role=button]");
    const count = Math.min(await buttons.count().catch(() => 0), 60);
    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i);
      const label = (await b.innerText().catch(() => "")) || "";
      if (DECLINE_TEXT.test(label) && (await b.isVisible().catch(() => false))) {
        await b.click({ timeout: 2000 }).catch(() => {});
        await sleep(400);
        return { found: true, dismissed: true, via: `text: ${label.trim()}` };
      }
    }
    if (Date.now() < deadline) await sleep(300);
  } while (Date.now() < deadline);
  return { found: false, dismissed: false };
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
  // innerText is empty for hidden elements and for content rendered by apps after
  // load; the textContent fallback must then skip scripts and styles, or page text
  // ends up as code (seen with Shopify Forms).
  const cleanTextContent = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll?.("script, style, noscript, template").forEach((n) => n.remove());
    return c.textContent || "";
  };
  const text = (el) => (el ? (el.innerText?.trim() ? el.innerText : cleanTextContent(el)) : "").replace(/\s+/g, " ").trim();

  // Text inside open shadow roots (embedded apps, web components) is not in innerText
  const shadowHosts = [...document.querySelectorAll("*")].filter((el) => el.shadowRoot);
  const shadowText = shadowHosts
    .map((h) => [...h.shadowRoot.children].map((c) => (c.innerText?.trim() ? c.innerText : cleanTextContent(c))).join(" "))
    .join(" ").replace(/\s+/g, " ").trim();
  const shadowFields = shadowHosts.reduce((n, h) => n + h.shadowRoot.querySelectorAll("input:not([type=hidden]), select, textarea").length, 0);

  // Placeholder and unfinished content, anywhere in the visible text
  const PLACEHOLDERS = [
    /\[[^\]]{0,40}\b(to be added|tbd|tba|todo|insert|placeholder|add here|missing)\b[^\]]{0,40}\]/gi,
    /\blorem ipsum\b/gi,
    /\bcoming soon\b/gi,
    /\b(soon to (be )?confirm(ed)?|to be (added|confirmed|announced))\b/gi,
    /\b(TBD|TBA|TODO|FIXME)\b/g,
    /\byour (text|title|heading|content) here\b/gi,
  ];
  const visibleText = `${text(document.body)} ${shadowText}`;
  const placeholders = [];
  const taken = [];
  for (const re of PLACEHOLDERS) {
    for (const m of visibleText.matchAll(re)) {
      if (placeholders.length >= 15) break;
      const end = m.index + m[0].length;
      if (taken.some(([a, b]) => m.index < b && end > a)) continue; // already caught by an earlier pattern
      taken.push([m.index, end]);
      placeholders.push({ match: m[0], context: visibleText.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).trim() });
    }
  }
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

  // Photos set as CSS backgrounds are invisible to screen readers unless labelled,
  // and the browser can't pick a smaller size for them. Count the big ones.
  const backgroundImages = [];
  for (const el of document.querySelectorAll("body *")) {
    if (backgroundImages.length >= 60) break;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none" || !bg.includes("url(")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 120) continue; // skip icons and textures
    const url = (bg.match(/url\(["']?([^"')]+)["']?\)/) || [])[1] || null;
    const label = el.getAttribute("aria-label") || el.getAttribute("title") || null;
    backgroundImages.push({
      url,
      width: Math.round(r.width),
      height: Math.round(r.height),
      roleImg: el.getAttribute("role") === "img",
      label,
      hidden: el.getAttribute("aria-hidden") === "true",
    });
  }

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
    backgroundImages,
    backgroundImagesUnlabelled: backgroundImages.filter((b) => !b.hidden && !(b.roleImg && b.label)).length,
    jsonLdTypes: [...document.querySelectorAll("script[type='application/ld+json']")].flatMap((s) => {
      try {
        const j = JSON.parse(s.textContent);
        const items = Array.isArray(j) ? j : j["@graph"] || [j];
        return items.map((i) => i["@type"]).flat().filter(Boolean);
      } catch { return ["(invalid JSON-LD)"]; }
    }),
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
    placeholders,
    shadowRoots: shadowHosts.length,
    shadowFields,
    mainText: `${text(document.querySelector("main") || document.body)}${shadowText ? `\n\n(Inside shadow DOM) ${shadowText}` : ""}`.slice(0, 20000),
  };
}

// Marks one element per role that has its own text, so the rendered font can be
// read for it over CDP. Returns what the CSS declares for each.
function markFontSamples() {
  const roles = { body: "body p, body li, body span", h1: "h1", h2: "h2", h3: "h3", nav: "nav a, header a", button: "button, .btn, [class*=button]" };
  const out = {};
  for (const [role, sel] of Object.entries(roles)) {
    const el = [...document.querySelectorAll(sel)].find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    });
    if (!el) continue;
    el.setAttribute("data-audit-font", role);
    out[role] = getComputedStyle(el).fontFamily;
  }
  return out;
}

const GENERIC_FONTS = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|-apple-system|blinkmacsystemfont|inherit|initial)$/i;

// Which font actually renders versus what the CSS asks for. A declared web font
// that silently falls back to a system font is invisible in computed styles.
async function renderedFonts(page) {
  try {
    const declared = await page.evaluate(markFontSamples);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const samples = [];
    for (const [role, css] of Object.entries(declared)) {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-audit-font="${role}"]` });
      if (!nodeId) continue;
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      const first = css.split(",")[0].replace(/["']/g, "").trim();
      const rendered = fonts.map((f) => ({ family: f.familyName, webFont: !!f.isCustomFont, glyphs: f.glyphCount }));
      const fellBack = !GENERIC_FONTS.test(first) && rendered.length > 0 &&
        rendered.every((f) => !f.webFont && f.family.toLowerCase() !== first.toLowerCase());
      samples.push({ role, declared: css, rendered, fellBack });
    }
    await cdp.detach().catch(() => {});
    await page.evaluate(() => document.querySelectorAll("[data-audit-font]").forEach((e) => e.removeAttribute("data-audit-font")));
    const fontFaces = await page.evaluate(() => [...new Set([...document.fonts].map((f) => `${f.family.replace(/["']/g, "")}: ${f.status}`))]);
    return { samples, fontFaces, fallbackWarnings: samples.filter((s) => s.fellBack).map((s) => `${s.role}: CSS asks for ${s.declared.split(",")[0]}, renders ${s.rendered.map((f) => f.family).join(" + ")}`) };
  } catch (e) {
    return { error: e.message.split("\n")[0] };
  }
}

// Mobile menu check, first page only. Presses the toggle (a button, never a link)
// and Escape, nothing else. Skips quietly if there's no toggle.
async function checkMobileMenu(page, shotPath) {
  const hiddenFocusable = () => page.evaluate(() => {
    const isHidden = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false; // display:none, not focusable anyway
      if (r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 && getComputedStyle(el).position === "fixed") return true;
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.opacity === "0" || s.visibility === "hidden") return true;
      }
      return false;
    };
    return [...document.querySelectorAll("a[href], button")]
      .filter((el) => el.tabIndex >= 0 && !el.closest("[inert]") && !/skip/i.test(el.textContent) && isHidden(el))
      .map((el) => (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30));
  });
  const visibleLinks = () => page.evaluate(() => [...document.querySelectorAll("a[href]")].filter((a) => {
    const r = a.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth && r.top < innerHeight && r.bottom > 0 && getComputedStyle(a).visibility !== "hidden";
  }).length);

  const handle = await page.evaluateHandle(() => {
    const cands = [...document.querySelectorAll("header button, nav button, header [role=button], button[aria-controls], button[aria-expanded], header summary")];
    return cands.find((b) => {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || r.top > 200 || b.closest("form")) return false;
      const label = `${b.getAttribute("aria-label") || ""} ${b.textContent || ""} ${b.className}`.toLowerCase();
      return /menu|nav|burger|hamburger|toggle|drawer|☰/.test(label) || (!b.textContent.trim() && b.querySelector("svg"));
    }) || null;
  });
  const toggle = handle.asElement();
  if (!toggle) return { found: false };

  const urlBefore = page.url();
  const describe = () => toggle.evaluate((b) => ({ ariaExpanded: b.getAttribute("aria-expanded"), label: b.getAttribute("aria-label") || b.textContent.trim().slice(0, 30) || null }));
  const before = await describe();
  const hiddenWhenClosed = await hiddenFocusable();
  const linksClosed = await visibleLinks();

  await toggle.click({ timeout: 2000 }).catch(() => {});
  await sleep(700);
  if (page.url() !== urlBefore) return { found: true, error: "toggle navigated away, check skipped" };
  const open = await describe();
  const linksOpen = await visibleLinks();
  await page.screenshot({ path: shotPath }).catch(() => {});

  await page.keyboard.press("Escape");
  await sleep(500);
  const afterEsc = await describe();
  const linksAfterEsc = await visibleLinks();
  const closedByEscape = (open.ariaExpanded === "true" && afterEsc.ariaExpanded === "false") ||
    (open.ariaExpanded === null && linksOpen > linksClosed && linksAfterEsc <= linksClosed);
  if (!closedByEscape) { await toggle.click({ timeout: 2000 }).catch(() => {}); await sleep(400); }

  return {
    found: true,
    label: before.label,
    opens: linksOpen > linksClosed || open.ariaExpanded === "true",
    ariaExpanded: { closed: before.ariaExpanded, open: open.ariaExpanded, afterEscape: afterEsc.ariaExpanded },
    reportsState: before.ariaExpanded === "false" && open.ariaExpanded === "true",
    closedByEscape,
    hiddenFocusableWhenClosed: hiddenWhenClosed.length,
    hiddenFocusableSamples: hiddenWhenClosed.slice(0, 8),
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
  const { response, cookieBanner } = await load(page, url);
  const loadMs = Date.now() - t0;
  const status = response?.status() ?? null;
  if (!status || status >= 400) {
    broken.push({ url, status });
    await page.close();
    continue;
  }

  const data = await page.evaluate(extract);
  const fonts = await renderedFonts(page);
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
  const mobileMenu = pages.length === 0
    ? await checkMobileMenu(mpage, path.join(shotsDir, `${slug}-mobile-menu-open.png`)).catch((e) => ({ found: false, error: e.message.split("\n")[0] }))
    : undefined;
  await mpage.close();

  await writeFile(
    path.join(outDir, "content", `${slug}.md`),
    `# ${data.title}\n\nURL: ${url}\n\n## Headings\n${data.headings.map((h) => `- ${h.level}: ${h.text}`).join("\n")}\n\n## Text\n${data.mainText}\n`
  );

  const { mainText, ...rest } = data;
  pages.push({
    url, slug, status, loadMs, transferKb, mobileOverflow, consoleErrors, failedRequests,
    screenshots: { desktop: desktopShots, mobile: mobileShots },
    cookieBanner,
    fonts,
    ...(mobileMenu ? { mobileMenu } : {}),
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
