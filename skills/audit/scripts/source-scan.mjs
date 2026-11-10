#!/usr/bin/env node
// Scans a website's source folder and saves what /audit needs for its Code section:
// file inventory, structure, duplication, design tokens, dependencies, forms,
// risks (secrets, placeholders, large images) and hosting config.
// Read-only: it never changes, moves or deletes anything in the source folder.
// No dependencies beyond Node itself.
//
// Usage: node source-scan.mjs <sourceDir> [outDir] [--exclude <path>]...
//
// --exclude <path> (repeatable, relative to sourceDir) skips a folder or file
// completely: never read or stat'ed, never listed in the tree, and links that
// point into it are not checked or reported. Use it for private client files.

import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const USAGE = "Usage: node source-scan.mjs <sourceDir> [outDir] [--exclude <path>]...";
const positional = [];
const excludeArgs = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--exclude") {
    const value = argv[++i];
    if (!value || value.startsWith("--")) {
      console.error(`--exclude needs a path.\n${USAGE}`);
      process.exit(1);
    }
    excludeArgs.push(value);
  } else if (argv[i].startsWith("--exclude=")) {
    excludeArgs.push(argv[i].slice("--exclude=".length));
  } else {
    positional.push(argv[i]);
  }
}
const [srcArg, outDir = "docs/audit"] = positional;
if (!srcArg) {
  console.error(USAGE);
  process.exit(1);
}
const root = path.resolve(srcArg);
if (!existsSync(root)) {
  console.error(`Source folder not found: ${root}`);
  process.exit(1);
}

// Excluded paths as absolute paths inside root. Anything outside root is refused.
const excluded = excludeArgs.map((e) => {
  const abs = path.resolve(root, e.replace(/^\.\/+/, "").replace(/[\\/]+$/, ""));
  if (abs === root || !abs.startsWith(root + path.sep)) {
    console.error(`--exclude must be a path inside the source folder: ${e}`);
    process.exit(1);
  }
  // A path that doesn't exist excludes nothing, so the private files would be scanned
  // and listed. Fail instead of guessing. (Prints only the path the user gave.)
  if (!existsSync(abs)) {
    console.error(`--exclude path not found: ${e}\nIt is relative to the source folder (${root}). Nothing was scanned.`);
    process.exit(1);
  }
  return abs;
});
const isExcluded = (abs) => excluded.some((e) => abs === e || abs.startsWith(e + path.sep));

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".vercel", ".cache", "dist", "build", ".superpowers", ".worktrees"]);
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico"]);
const FONT_EXT = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".json", ".xml", ".txt", ".md", ".php", ".svg", ".webmanifest"]);
const BIG_IMAGE_KB = 300;

const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const countMatches = (s, re) => (s.match(re) || []).length;
const stripTags = (s) => norm(s.replace(/<head[\s\S]*?<\/head>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"));
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
};

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && ![".htaccess", ".well-known"].includes(entry.name)) {
      if (entry.isDirectory()) continue;
    }
    const full = path.join(dir, entry.name);
    if (isExcluded(full)) continue;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

// ---------- inventory ----------
const paths = await walk(root);
const files = [];
for (const p of paths) {
  const s = await stat(p);
  const ext = path.extname(p).toLowerCase() || path.basename(p);
  const f = { path: rel(p), ext, kb: Math.round((s.size / 1024) * 10) / 10 };
  if (TEXT_EXT.has(ext) || ext === ".htaccess") {
    f.text = await readFile(p, "utf8").catch(() => "");
    f.lines = f.text.split("\n").length;
  }
  files.push(f);
}
const byType = {};
for (const f of files) {
  const t = f.ext === ".htm" ? ".html" : f.ext;
  byType[t] = byType[t] || { count: 0, kb: 0 };
  byType[t].count++;
  byType[t].kb = Math.round((byType[t].kb + f.kb) * 10) / 10;
}

const html = files.filter((f) => [".html", ".htm", ".php"].includes(f.ext));
const css = files.filter((f) => f.ext === ".css");
const js = files.filter((f) => [".js", ".mjs"].includes(f.ext));
const images = files.filter((f) => IMG_EXT.has(f.ext));
const fonts = files.filter((f) => FONT_EXT.has(f.ext));
const allText = files.filter((f) => f.text != null);

// ---------- HTML pages ----------
const blockHashes = { header: {}, nav: {}, footer: {}, style: {}, head: {} };
const pages = [];
const externalScripts = new Set();
const externalStyles = new Set();
const brokenLocalLinks = [];

for (const f of html) {
  const t = f.text;
  const dir = path.dirname(path.join(root, f.path));

  for (const tagName of ["header", "nav", "footer"]) {
    const m = t.match(new RegExp(`<${tagName}[\\s\\S]*?<\\/${tagName}>`, "i"));
    if (m) (blockHashes[tagName][hash(norm(m[0]))] ||= []).push(f.path);
  }
  for (const m of t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (norm(m[1]).length > 60) (blockHashes.style[hash(norm(m[1]))] ||= []).push(f.path);
  }

  const imgs = [...t.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const scripts = [...t.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  const links = [...t.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  for (const s of scripts) { const src = attr(s, "src"); if (src && /^(https?:)?\/\//.test(src)) externalScripts.add(src); }
  for (const l of links) {
    const href = attr(l, "href");
    if (href && /^(https?:)?\/\//.test(href) && /stylesheet|preconnect|preload/i.test(attr(l, "rel") || "")) externalStyles.add(href);
  }

  // Local links and assets that point at files that don't exist
  for (const m of t.matchAll(/\s(?:href|src)\s*=\s*["']([^"'#?]+)[^"']*["']/gi)) {
    const target = m[1];
    if (/^(https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(target) || !target.trim()) continue;
    const resolved = target.startsWith("/") ? path.join(root, target) : path.join(dir, target);
    // Never check or report links into an excluded path: that would reveal its file names
    if (isExcluded(path.resolve(resolved))) continue;
    const candidates = [resolved, path.join(resolved, "index.html"), resolved + ".html"];
    if (!candidates.some((c) => existsSync(c))) brokenLocalLinks.push({ page: f.path, target });
  }

  const forms = [...t.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)].map((m) => {
    const open = m[0].match(/<form\b[^>]*>/i)[0];
    const inner = m[1];
    const fields = [...inner.matchAll(/<(input|select|textarea)\b[^>]*>/gi)]
      .map((x) => x[0])
      .filter((x) => !/type\s*=\s*["']?(hidden|submit|button)/i.test(x))
      .map((x) => {
        const id = attr(x, "id");
        return {
          tag: x.match(/<(\w+)/)[1].toLowerCase(),
          type: attr(x, "type"),
          name: attr(x, "name"),
          required: /\srequired(\s|>|=)/i.test(x),
          hasLabel: !!(id && new RegExp(`for\\s*=\\s*["']${id}["']`, "i").test(inner)) || !!attr(x, "aria-label"),
        };
      });
    const action = attr(open, "action");
    let sendsTo = "nowhere visible (no action; check the JS)";
    if (action && /formspree|getform|basin|formsubmit|netlify|web3forms|emailjs/i.test(action)) sendsTo = `form service: ${action}`;
    else if (action && /\.php$/i.test(action)) sendsTo = `PHP script: ${action}`;
    else if (action && action.startsWith("mailto:")) sendsTo = `mailto link (opens the visitor's mail app): ${action}`;
    else if (action) sendsTo = action;
    if (/data-netlify/i.test(open)) sendsTo = "Netlify Forms";
    return { method: attr(open, "method"), action, sendsTo, fields };
  });

  const text = stripTags(t);
  pages.push({
    path: f.path,
    kb: f.kb,
    lines: f.lines,
    title: (t.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || null,
    lang: (t.match(/<html[^>]*\slang\s*=\s*["']([^"']+)/i) || [])[1] || null,
    description: (t.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*>/i) || [null])[0] ? attr(t.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*>/i)[0], "content") : null,
    viewport: /name\s*=\s*["']viewport/i.test(t),
    ogTags: countMatches(t, /property\s*=\s*["']og:/gi),
    jsonLd: countMatches(t, /application\/ld\+json/gi),
    favicon: /rel\s*=\s*["'][^"']*icon/i.test(t),
    h1Count: countMatches(t, /<h1\b/gi),
    headings: [...t.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => `h${m[1]}: ${stripTags(m[2]).slice(0, 100)}`),
    images: imgs.length,
    imagesMissingAlt: imgs.filter((i) => attr(i, "alt") === null).length,
    imagesMissingSize: imgs.filter((i) => !attr(i, "width") || !attr(i, "height")).length,
    inlineStyleAttrs: countMatches(t, /\sstyle\s*=\s*["']/gi),
    styleBlocks: countMatches(t, /<style\b/gi),
    inlineScripts: scripts.filter((s) => !attr(s, "src")).length,
    forms,
    words: text ? text.split(" ").length : 0,
    text,
  });
}

const duplicates = {};
for (const [kind, map] of Object.entries(blockHashes)) {
  duplicates[kind] = Object.values(map).filter((list) => list.length > 1).map((list) => ({ copies: list.length, pages: list }));
  duplicates[kind + "Variants"] = Object.keys(map).length;
}

// ---------- CSS: tokens and quality ----------
const cssSources = [
  ...css.map((f) => ({ from: f.path, text: f.text })),
  ...html.flatMap((f) => [...f.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => ({ from: `${f.path} <style>`, text: m[1] }))),
];
const allCss = cssSources.map((s) => s.text).join("\n");
const cssVars = {};
for (const m of allCss.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)[;}]/g)) cssVars[m[1]] = m[2].trim();
const usedVars = new Set([...allCss.matchAll(/var\(\s*(--[\w-]+)/g), ...html.flatMap((f) => [...f.text.matchAll(/var\(\s*(--[\w-]+)/g)])].map((m) => m[1]));
const colorCount = {};
for (const m of allCss.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) {
  const c = m[0].toLowerCase().replace(/\s+/g, "");
  colorCount[c] = (colorCount[c] || 0) + 1;
}
const fontFamilies = {};
for (const m of allCss.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
  const v = norm(m[1]);
  fontFamilies[v] = (fontFamilies[v] || 0) + 1;
}
const fontSizes = {};
for (const m of allCss.matchAll(/font-size\s*:\s*([^;}]+)/gi)) {
  const v = norm(m[1]);
  fontSizes[v] = (fontSizes[v] || 0) + 1;
}
const breakpoints = [...new Set([...allCss.matchAll(/@media[^{]*\(\s*(min|max)-width\s*:\s*([\d.]+\w+)\s*\)/gi)].map((m) => `${m[1]}-width ${m[2]}`))];
const fontFaces = [...allCss.matchAll(/@font-face\s*{([^}]*)}/gi)].map((m) => ({
  family: (m[1].match(/font-family\s*:\s*([^;]+)/i) || [])[1]?.trim().replace(/["']/g, "") || null,
  src: (m[1].match(/url\(([^)]+)\)/i) || [])[1]?.replace(/["']/g, "") || null,
}));
const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

const cssStats = {
  files: css.map((f) => ({ path: f.path, kb: f.kb, lines: f.lines })),
  styleBlocksInHtml: cssSources.length - css.length,
  totalKb: Math.round((Buffer.byteLength(allCss) / 1024) * 10) / 10,
  customProperties: cssVars,
  unusedCustomProperties: Object.keys(cssVars).filter((v) => !usedVars.has(v)),
  undefinedCustomProperties: [...usedVars].filter((v) => !(v in cssVars)),
  topColors: top(colorCount, 20),
  distinctColors: Object.keys(colorCount).length,
  fontFamilies: top(fontFamilies, 10),
  fontSizes: top(fontSizes, 15),
  distinctFontSizes: Object.keys(fontSizes).length,
  fontFaces,
  imports: [...allCss.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/gi)].map((m) => m[1]),
  breakpoints,
  importantCount: countMatches(allCss, /!important/g),
  reducedMotion: /prefers-reduced-motion/i.test(allCss),
  darkMode: /prefers-color-scheme\s*:\s*dark/i.test(allCss),
};

// ---------- JS and dependencies ----------
const allCode = [...js.map((f) => f.text), ...html.map((f) => f.text)].join("\n");
const LIBS = {
  "Tailwind (CDN)": /cdn\.tailwindcss\.com|tailwindcss/i,
  Bootstrap: /bootstrap(\.min)?\.(css|js)|bootstrap@/i,
  jQuery: /jquery(\.min)?\.js|jquery@|code\.jquery\.com/i,
  GSAP: /gsap(\.min)?\.js|gsap@|greensock/i,
  "Font Awesome": /font-?awesome|kit\.fontawesome/i,
  "Google Fonts": /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
  "Adobe Fonts": /use\.typekit\.net/i,
  "Alpine.js": /alpinejs|x-data=/i,
  AOS: /aos(\.min)?\.(css|js)|data-aos=/i,
  Swiper: /swiper(-bundle)?(\.min)?\.(css|js)/i,
  "Google Analytics / Tag Manager": /googletagmanager|google-analytics|gtag\(/i,
  "Meta Pixel": /connect\.facebook\.net|fbq\(/i,
  Hotjar: /hotjar/i,
  "Google Maps embed": /google\.com\/maps\/embed|maps\.googleapis/i,
  EmailJS: /emailjs/i,
  "Cookie banner tool": /cookiebot|cookieinformation|onetrust|cookieyes|cookie-script/i,
};
const libraries = Object.entries(LIBS).filter(([, re]) => re.test(allCode)).map(([name]) => name);
const jsStats = {
  files: js.map((f) => ({ path: f.path, kb: f.kb, lines: f.lines })),
  totalKb: Math.round(js.reduce((s, f) => s + f.kb, 0) * 10) / 10,
  consoleLogs: countMatches(js.map((f) => f.text).join("\n"), /console\.log\(/g),
  fetchUrls: [...new Set([...allCode.matchAll(/fetch\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]))],
};

// ---------- images and fonts ----------
const referenced = allText.map((f) => f.text).join("\n");
const imageStats = images.map((f) => ({
  path: f.path,
  kb: f.kb,
  big: f.kb > BIG_IMAGE_KB,
  referenced: referenced.includes(path.basename(f.path)),
}));

// ---------- risks ----------
const SECRET_PATTERNS = [
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "OpenAI or Anthropic key", re: /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/g },
  { name: "Stripe secret key", re: /\b(sk|rk)_live_[0-9a-zA-Z]{20,}/g },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  // Matches names like password, SMTP_PASSWORD, apiKey, client_secret, authToken
  { name: "Password or secret assignment", re: /["']?[\w-]*(pass(word)?|pwd|secret|api[_-]?key|token)[\w-]*["']?\s*[:=]\s*["'][^"'\s]{6,}["']/gi },
  { name: "EmailJS keys (public, but check service and template IDs)", re: /emailjs\.(init|send)\([^)]*\)/gi },
];
const mask = (s) => (s.length <= 8 ? "****" : `${s.slice(0, 4)}...${s.slice(-2)} (${s.length} chars)`);
const secrets = [];
for (const f of allText) {
  for (const { name, re } of SECRET_PATTERNS) {
    for (const m of f.text.matchAll(re)) {
      const line = f.text.slice(0, m.index).split("\n").length;
      secrets.push({ file: f.path, line, kind: name, match: mask(m[0]) });
    }
  }
}

// Danish phrases too: "kommer snart", "pladsholder", "Billede indsættes", "Tekst følger".
const PLACEHOLDERS = /lorem ipsum|\bTODO\b|\bFIXME\b|\[to be added\]|\[insert[^\]]*\]|\bTBD\b|coming soon|kommer snart|your company|your name|example\.com|placeholder text|(this|denne) (page|side) (is|er) (a|en) (placeholder|pladsholder)|\bpladsholder\b|\b(billede|tekst|foto|logo) (indsættes|følger)\b|xxx+|\+45 ?(00|12) ?(00|34) ?(00|56) ?(00|78)|\b123[- ]?456[- ]?789\b|\bdummy\b/gi;
// [Bracketed Labels] like "[Sagstitel]" or "[Kort beskrivelse af sagen]". Its own check, case-SENSITIVE
// (a real capital first), no quotes, "=", "\" or tags inside, not a Markdown link. It only runs on
// prose: HTML and PHP with tags, <script>, <style> and <?php ?> blanked out, and Markdown outside code.
// JS, CSS and JSON are code and are never checked for brackets.
const BRACKET_LABEL = /\[[A-ZÆØÅ][^\]\n"'=<>{}\\]{2,60}\](?!\()/g;
// A regex character class such as [A-Za-z0-9] or [A-Z_-]: only ranges, word characters and escapes
const looksLikeCharClass = (inner) => /[A-Za-z0-9]-[A-Za-z0-9]/.test(inner) && !/\s/.test(inner);
// Replace a region with spaces, keeping newlines, so offsets and line numbers stay correct
const blank = (str) => str.replace(/[^\n]/g, " ");
function prose(f) {
  if ([".html", ".htm", ".php"].includes(f.ext)) {
    return f.text
      .replace(/<\?(php|=)?[\s\S]*?(\?>|$(?![\s\S]))/gi, blank)
      .replace(/<!--[\s\S]*?-->/g, blank)
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, blank)
      .replace(/<[^>]*>/g, blank);
  }
  if (f.ext === ".md") return f.text.replace(/```[\s\S]*?```/g, blank).replace(/`[^`\n]*`/g, blank);
  return null;
}
// The bare word "placeholder" is only a finding in visible page text, never in code
// (form attributes, ::placeholder in CSS, JS variables)
const VISIBLE_PLACEHOLDER = /\bplaceholder\b/gi;
const placeholders = [];
// Never echo a line that may hold a secret: its context is replaced, not printed
const secretLines = new Set(secrets.map((s) => `${s.file}:${s.line}`));
// Also mask key-like tokens the secret patterns don't know: 20+ chars of
// letters, digits, _ or -, mixing letters and digits
const maskTokens = (line) =>
  line.replace(/[A-Za-z0-9_-]{20,}/g, (t) => (/[A-Za-z]/.test(t) && /\d/.test(t) ? `${t.slice(0, 4)}...` : t));
for (const f of allText.filter((x) => [".html", ".htm", ".php", ".js", ".css", ".json", ".md"].includes(x.ext))) {
  for (const m of f.text.matchAll(PLACEHOLDERS)) {
    const line = f.text.slice(0, m.index).split("\n").length;
    const lineText = secretLines.has(`${f.path}:${line}`)
      ? "(hidden: possible secret on this line)"
      : maskTokens(norm(f.text.split("\n")[line - 1] || "")).slice(0, 120);
    placeholders.push({ file: f.path, line, match: m[0], context: lineText });
  }
  const text = prose(f);
  if (text == null) continue;
  for (const m of text.matchAll(BRACKET_LABEL)) {
    if (looksLikeCharClass(m[0].slice(1, -1))) continue;
    const line = f.text.slice(0, m.index).split("\n").length;
    const lineText = secretLines.has(`${f.path}:${line}`)
      ? "(hidden: possible secret on this line)"
      : maskTokens(norm(f.text.split("\n")[line - 1] || "")).slice(0, 120);
    placeholders.push({ file: f.path, line, match: m[0], context: lineText });
  }
}
placeholders.sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
for (const p of pages) {
  for (const m of p.text.matchAll(VISIBLE_PLACEHOLDER)) {
    if (placeholders.some((x) => x.file === p.path && /placeholder/i.test(x.match))) continue;
    const context = maskTokens(p.text.slice(Math.max(0, m.index - 50), m.index + 70));
    placeholders.push({ file: p.path, line: null, match: m[0], context: `(visible text) ${context}` });
  }
}

// ---------- hosting and project files ----------
// The web root is the shallowest folder with an index page: the source root itself, or a
// subfolder such as www/, public_html/ or site/ when the source holds more than the site.
const indexDirs = files
  .filter((f) => /(^|\/)index\.(html?|php)$/i.test(f.path))
  .map((f) => path.posix.dirname(f.path))
  .map((d) => (d === "." ? "" : d));
const webRoots = [...new Set(indexDirs)]
  .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
  .filter((d, i, all) => d === "" || !all.slice(0, i).some((p) => p === "" || d.startsWith(p + "/")));
if (webRoots.includes("")) webRoots.splice(0, webRoots.length, "");
const webRoot = webRoots[0] ?? "";
const inRoot = (name) => (webRoot ? `${webRoot}/${name}` : name);
// Found at the web root or the source root (netlify.toml, package.json etc. often sit one level up)
const has = (name) => files.some((f) => [inRoot(name), name].map((x) => x.toLowerCase()).includes(f.path.toLowerCase()));
const hosting = {
  webRoot: webRoot || ".",
  otherWebRoots: webRoots.slice(1),
  htaccessFiles: files.filter((f) => path.posix.basename(f.path) === ".htaccess").map((f) => f.path),
  htaccess: has(".htaccess"),
  robotsTxt: has("robots.txt"),
  sitemapXml: has("sitemap.xml"),
  page404: has("404.html") || has("404.php"),
  faviconFile: files.some((f) => /favicon|apple-touch-icon/i.test(f.path)),
  webManifest: files.some((f) => /manifest\.(json|webmanifest)$/i.test(f.path)),
  netlify: has("netlify.toml") || has("_redirects"),
  vercel: has("vercel.json"),
  githubPages: has("cname"),
  packageJson: has("package.json"),
  readme: files.some((f) => /^readme/i.test(f.path)),
  gitRepo: existsSync(path.join(root, ".git")),
};
const htaccessFile = files.find((f) => f.path === inRoot(".htaccess"));
if (htaccessFile) {
  hosting.htaccessRules = {
    httpsRedirect: /RewriteCond\s+%\{HTTPS\}|https:\/\//i.test(htaccessFile.text),
    errorDocument: /ErrorDocument/i.test(htaccessFile.text),
    caching: /ExpiresActive|Cache-Control/i.test(htaccessFile.text),
    compression: /mod_deflate|AddOutputFilterByType|mod_brotli/i.test(htaccessFile.text),
  };
}

// ---------- write ----------
await mkdir(path.join(outDir, "content-source"), { recursive: true });
for (const p of pages) {
  const slug = p.path.replace(/\.(html?|php)$/i, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "index";
  await writeFile(
    path.join(outDir, "content-source", `${slug}.md`),
    `# ${p.title || p.path}\n\nSource: ${p.path}\n\n## Headings\n${p.headings.map((h) => `- ${h}`).join("\n")}\n\n## Text (exact, from the HTML)\n${p.text}\n`
  );
}

const result = {
  sourceDir: root,
  scannedAt: new Date().toISOString(),
  excluded: excluded.map(rel),
  totals: { files: files.length, kb: Math.round(files.reduce((s, f) => s + f.kb, 0) * 10) / 10, htmlPages: html.length, cssFiles: css.length, jsFiles: js.length, images: images.length, fonts: fonts.length },
  byType,
  tree: files.map((f) => `${f.path} (${f.kb} KB${f.lines ? `, ${f.lines} lines` : ""})`),
  pages: pages.map(({ text, ...p }) => p),
  duplicates,
  css: cssStats,
  js: jsStats,
  libraries,
  externalScripts: [...externalScripts],
  externalStyles: [...externalStyles],
  images: imageStats,
  bigImages: imageStats.filter((i) => i.big),
  unusedImages: imageStats.filter((i) => !i.referenced).map((i) => i.path),
  fonts: fonts.map((f) => ({ path: f.path, kb: f.kb })),
  brokenLocalLinks,
  secrets,
  placeholders,
  hosting,
};
await writeFile(path.join(outDir, "source-data.json"), JSON.stringify(result, null, 2));

const formsAll = pages.flatMap((p) => p.forms.map((f) => ({ page: p.path, ...f })));
console.log(`Scanned ${files.length} files (${result.totals.kb} KB): ${html.length} pages, ${css.length} CSS, ${js.length} JS, ${images.length} images`);
console.log(`Web root: ${hosting.webRoot}${hosting.otherWebRoots.length ? ` (also: ${hosting.otherWebRoots.join(", ")})` : ""}; .htaccess files: ${hosting.htaccessFiles.length}`);
if (excluded.length) console.log(`Excluded (not read or listed): ${result.excluded.join(", ")}`);
console.log(`Libraries: ${libraries.join(", ") || "none detected"}`);
console.log(`Duplicated across pages: header ${duplicates.header.length ? "yes" : "no"}, nav ${duplicates.nav.length ? "yes" : "no"}, footer ${duplicates.footer.length ? "yes" : "no"}, <style> blocks ${duplicates.style.length ? "yes" : "no"}`);
console.log(`CSS: ${Object.keys(cssVars).length} custom properties (${cssStats.unusedCustomProperties.length} unused), ${cssStats.distinctColors} colors, ${cssStats.distinctFontSizes} font sizes, ${cssStats.importantCount} !important`);
console.log(`Forms: ${formsAll.length ? formsAll.map((f) => `${f.page} -> ${f.sendsTo}`).join("; ") : "none"}`);
console.log(`Risks: ${secrets.length} possible secrets, ${placeholders.length} placeholders, ${result.bigImages.length} images over ${BIG_IMAGE_KB} KB, ${brokenLocalLinks.length} broken local links`);
if (secrets.length) console.log("  !! Possible secrets found. See source-data.json > secrets (values are masked).");
console.log(`Saved to ${outDir}/source-data.json and ${outDir}/content-source/`);
