---
name: audit
description: Audit and analyse an existing website before a redesign, covering its pages, structure, flows, content, visual style, tech, accessibility and SEO. Use when the user runs /audit <url>, starts a redesign, or asks to analyse or review a current site.
---

# Audit

Build a clear picture of an existing website before redesigning it. The audit is the "before" for the case study and the evidence for the brief.

## Rules
- **Read-only.** Never submit forms, log in, add to cart past the first step, check out or change anything on the site.
- Only audit a site the user is redesigning or has permission to analyse. If unsure, ask.
- Keep the crawl polite: the script waits between pages and stops at `--max-pages`.
- Separate **observations** (what the data or screenshots show) from **interpretations** (your judgement). Every issue needs evidence: page, screenshot or data point.
- No em dashes. English unless the user asks otherwise.

## 1. Setup (first run on a machine only)
```bash
cd ~/.claude/skills/audit/scripts && npm install && npx playwright install chromium
```

## 2. Crawl
Run from the project root, with the URL the user gave:
```bash
node ~/.claude/skills/audit/scripts/crawl.mjs <url> docs/audit --max-pages 20
```
It writes to `docs/audit/`:
- `audit-data.json`: per page title, meta, headings, links, one-page sections (`#anchors`), images and alt text, forms and fields, CTAs, typography samples, top colors, fonts and font sizes, CSS variables, tech hints (Shopify and theme name, Next.js, WordPress, Webflow and others), analytics, load time, page weight, console errors, mobile overflow. Site-wide: broken links, external links, contact links, robots.txt and sitemap.
- `screenshots/`: `<page>-desktop-fold`, `-desktop-full`, `-mobile-fold` and `-mobile-full` PNGs
- `content/`: the text of each page as markdown, reusable for content migration

If it reports pages "not crawled", ask whether to raise `--max-pages`.

## 3. Lighthouse (homepage plus the most important page)
```bash
npx -y lighthouse <url> --only-categories=performance,accessibility,seo,best-practices --output=json --output-path=docs/audit/lighthouse-<slug>.json --chrome-flags="--headless=new" --quiet
```
Record the four scores and the top three opportunities from each report. If Lighthouse fails, note it and continue.

## 4. Look and walk through
- View the fold and full screenshots for every page, desktop and mobile. Judge layout, hierarchy, imagery, consistency and what breaks on mobile.
- If a browser tool is available, walk the key flows by hand (find opening hours, send an inquiry, find and buy a product), stopping before anything is submitted. Note every step and every point of friction.
- Read `content/` for tone, languages, typos, missing information and duplication.

## 5. Write `docs/audit/audit.md`
Use these sections, short and scannable, with screenshot links like `![](screenshots/home-desktop-fold.png)`:

1. **Summary**: 3 to 5 bullets a client could understand
2. **Snapshot**: URL, audit date, platform and hosting, page count, languages, domain and email setup
3. **Sitemap and structure**: page tree, nav and footer items, one-page sections, broken links, orphan or dead-end pages
4. **Page inventory**: table of page, purpose, key content, CTAs, issues
5. **Key flows**: each flow as steps, with friction marked
6. **Content**: tone of voice, languages, missing info (hours, address, prices, delivery, terms), typos, outdated content
7. **Visual style**: colors as hex with where they're used, typography (families, scale, weights), layout and spacing, imagery and photography, components (buttons, cards, forms), motion. Note what feels on brand and what feels generic or inconsistent.
8. **Tech and performance**: stack, Lighthouse scores, page weight, oversized images, console errors, analytics
9. **Accessibility**: contrast, alt text, heading order, form labels, `lang`, keyboard and focus, motion
10. **SEO and findability**: titles, meta descriptions, Open Graph, sitemap and robots, domain, Google Business profile (ask if unknown)
11. **Mobile**: what works, what breaks, overflow
12. **Keep / Change / Add**: the bridge to the redesign. What's good and must survive, what to fix, what's missing.
13. **Issues**: table of severity (high, medium, low), issue, evidence, suggested fix. High is anything that loses customers or breaks a key flow.
14. **Questions for the client**: things the audit can't answer

Also save `docs/audit/current-tokens.md`: the current palette, type and spacing as a reference, clearly labelled as the *old* system.

## 6. Connect it to the project
- `docs/brief.md`: fill in "Current site" with a five-line summary and a link to the audit. Add the client questions under "Open questions".
- `PROCESS.md`: a Decisions entry ("Audited <url> before redesign") and, under Case study notes, a link to the before screenshots.
- Commit: `docs: audit of <domain>` with the usual Co-Authored-By line.

## 7. Report
In chat: the top five findings, the three things worth keeping, and the client questions. Then stop. Don't start the redesign or the brainstorm until the user says so.

Offer, in one line, to write a short client-friendly version of the summary (in Danish, English or Spanish) that the user can share.
