---
name: audit
description: Audit and analyse an existing website before a redesign, covering its pages, structure, flows, content, visual style, tech, accessibility and SEO. Use when the user runs /audit <url>, starts a redesign, or asks to analyse or review a current site.
---

# Audit

Build a clear picture of an existing website before redesigning it. The audit is the "before" for the case study and the evidence for the brief.

The audit files are **internal working notes**: direct and evidence-based. Anything shared with a client or the people who built the site is a separate, diplomatic summary (see step 8).

## Rules
- **Read-only.** Never submit forms, log in, enter checkout or change anything on the site. Allowed exceptions:
  - Declining a cookie banner (the crawler does this automatically; it never accepts)
  - Pressing the mobile menu toggle and the Escape key (the crawler does this on the first page). Only the toggle button, never links or anything else. If there's no toggle, skip it.
  - Adding a product to the cart to inspect cart options (delivery date, time slots, notes, upsells), then emptying the cart again. Stop at the cart page.
- Only audit a site the user is redesigning or has permission to analyse. If unsure, ask.
- Keep the crawl polite: the script waits between pages and stops at `--max-pages`.
- Separate **observations** (what the data or screenshots show) from **interpretations** (your judgement), and mark predictions as **Estimate:**. Every issue needs evidence: page, screenshot or data point.
- The user's personal style rules (for example no em dashes) apply to **your own writing**. Never list them as findings about someone else's site. If they matter for a later build by the user, put them under "Notes for our build" in section 12.
- English unless the user asks otherwise.

## 0. Ask first (one short message)
Skip anything the user already said.
1. **Site status:** live and finished, pre-launch or in progress, or a site you're only studying (`--learn`)
2. **Who built it:** the client, a third party (agency, friend) or the user
3. **Most important pages and flows** to focus on, if any

Status sets the tone: on a pre-launch or in-progress site, placeholders and empty sections are "unfinished" (Medium) rather than High, unless they'd break trust if launched as is. When someone else built it, keep findings factual and never personal.

## 1. Setup (whenever `scripts/node_modules` is missing)
Needed on a new machine, and again after the skill folder moves (for example into the template repo). If you're unsure, check first: `ls ~/.claude/skills/audit/scripts/node_modules`. The crawler also prints this command when Playwright is missing.
```bash
cd ~/.claude/skills/audit/scripts && npm install && npx playwright install chromium
```

## 2. Crawl
Run from the project root, with the URL the user gave:
```bash
node ~/.claude/skills/audit/scripts/crawl.mjs <url> docs/audit --max-pages 20
```
It declines cookie banners automatically (`cookieBanner` in the data says how). Add `--keep-cookie-banner` to keep the banner in the screenshots, for example to judge the banner itself.

It writes to `docs/audit/`:
- `audit-data.json`: per page title, meta, headings, links, one-page sections (`#anchors`), images and alt text, **CSS background images and whether they're labelled**, **JSON-LD types**, forms and fields, CTAs, typography samples, top colors, fonts and font sizes, CSS variables, tech hints (Shopify and theme name, Next.js, WordPress, Webflow and others), analytics, load time, page weight, console errors, mobile overflow, cookie banner. Also:
  - `fonts`: the font that **actually renders** for body, headings, nav and buttons next to what the CSS declares. `fallbackWarnings` lists declared web fonts that never load and fall back to a system font.
  - `placeholders`: unfinished text such as "[to be added]", "coming soon", "lorem ipsum", "TBD", "soon to confirm", with context
  - `mobileMenu` (first page only): whether the toggle opens the menu, reports `aria-expanded`, closes on Escape, and how many hidden menu links Tab still reaches when it's closed
  - `shadowRoots`, `shadowFields`: content and form fields inside shadow DOM (embedded apps), whose text is added to `content/`
  
  Site-wide: broken links, external links, contact links, robots.txt and sitemap.
- `screenshots/`: `<page>-desktop-fold` and `-mobile-fold`, plus either `-full` (one full-page image) or `-scroll-01`, `-02` and so on (viewport shots, when the site scrolls inside `body` or a wrapper; `scrollsInside` says which element). The first page also gets `<page>-mobile-menu-open.png` when a menu toggle was found.
- `content/`: the text of each page as markdown, reusable for content migration

If it reports pages "not crawled", ask whether to raise `--max-pages`.

**Screenshots you take yourself** (menus open, focus states, cart, hover states) go in `screenshots/manual/` with descriptive names like `home-mobile-menu-open.png`. Never mix them into the crawler's numbering.

## 3. Lighthouse (homepage plus the most important page)
```bash
node ~/.claude/skills/audit/scripts/lighthouse.mjs <url> docs/audit <slug>
```
It runs Lighthouse three times (mobile) and saves each run plus `lighthouse-<slug>-summary.json` with the **median** and the range. Always report the median, and mention the range when Performance varies by more than 10 points. These numbers are the "before" for the case study, so record the date too. If Lighthouse fails, note it and continue.

## 4. Look and walk through
- View the fold and full or scroll screenshots for every page, desktop and mobile. Judge layout, hierarchy, imagery, consistency and what breaks on mobile.
- If a browser tool is available, walk the key flows by hand (find opening hours, send an inquiry, find and buy a product), stopping before anything is submitted. Note every step and every point of friction.
- **Shops:** add one product to the cart and record what the cart offers: delivery date or time choice, pickup, notes, gift options, shipping estimate, minimum order. Then empty the cart. Never enter checkout.
- Read `content/` for tone, languages, typos, missing information and duplication.
- **Structured data:** check JSON-LD per page type, not just the homepage: Organization or LocalBusiness on home, Product on product pages, Article on posts.

## 5. Write `docs/audit/audit.md`
Use these sections, short and scannable, with screenshot links like `![](screenshots/home-desktop-fold.png)`:

1. **Summary**: 3 to 5 bullets a client could understand
2. **Snapshot**: URL, audit date, site status and who built it, platform and hosting, page count, languages, domain and email setup
3. **Sitemap and structure**: page tree, nav and footer items, one-page sections, broken links, orphan or dead-end pages
4. **Page inventory**: table of page, purpose, key content, CTAs, issues
5. **Key flows**: each flow as steps, with friction marked
6. **Content**: tone of voice, languages, missing info (hours, address, prices, delivery, terms of trade, returns, company and CVR details), typos, outdated content
7. **Visual style**: colors as hex with where they're used, typography (families, scale, weights), layout and spacing, imagery and photography, components (buttons, cards, forms), motion. Note what feels on brand and what feels generic or inconsistent.
8. **Tech and performance**: stack, Lighthouse medians, page weight, oversized images, console errors, analytics
9. **Accessibility**: contrast, alt text **including CSS background images**, heading order, form labels, `lang`, keyboard and focus, motion. Call out gaps Lighthouse doesn't catch.
10. **SEO and findability**: titles, meta descriptions, Open Graph, structured data per page type, sitemap and robots, domain, Google Business profile (ask if unknown)
11. **Mobile**: what works, what breaks, overflow
12. **Keep / Change / Add**: the bridge to the redesign. What's good and must survive, what to fix, what's missing. End with **Notes for our build** if any.
13. **Issues**: table with these columns:
    | Severity | Issue | Evidence | Fixed by | Suggested fix |
    - Severity: High (loses customers, breaks a key flow, or a legal requirement), Medium, Low
    - Fixed by: **theme or code**, **admin settings**, **content** (the client supplies text, photos or info), or **platform** (can't be fixed from the site, such as a hosting or Shopify script)
14. **Questions for the client**: things the audit can't answer

Also save `docs/audit/current-tokens.md`: the current palette, type and spacing as a reference, clearly labelled as the *old* system.

## 6. Self-check before reporting
Go through this list and fix what fails:
- Everything listed as missing in Content (6) appears in Issues (13) or under Add (12)
- Every High issue has evidence and a "Fixed by"
- Numbers match across the summary, sections, scoreboard and chat report
- Predictions are marked **Estimate:** and don't promise exact numbers that depend on things outside the site's control
- No personal style rules are listed as findings
- Structured data was checked on more than the homepage
- Every entry in `placeholders`, `fonts.fallbackWarnings` and a failed `mobileMenu` check is either in Issues (13) or explained as harmless
- Screenshot links point to files that exist

## 7. Connect it to the project
If the folder has no `docs/brief.md` or `PROCESS.md` (no `/kickoff` yet), don't create them or run `git init`. Leave the audit in `docs/audit/`, say so in the report, and note that `/kickoff` will link it later. Otherwise:
- `docs/brief.md`: fill in "Current site" with a five-line summary and a link to the audit. Add the client questions under "Open questions".
- `PROCESS.md`: a Decisions entry ("Audited <url> before redesign") and, under Case study notes, a link to the before screenshots and the Lighthouse summary.
- Commit: `docs: audit of <domain>` with the usual Co-Authored-By line.

## 8. Report
In chat: the top five findings, the three things worth keeping, and the client questions. Then stop. Don't start the redesign or the brainstorm until the user says so.

Offer, in one line, a short client-friendly summary (in Danish, English or Spanish) that the user can share. That summary leads with what works, frames issues as opportunities, leaves out severity labels and anything that reads as criticism of whoever built the site, and is never the audit file itself.

## Compare mode: `/audit <url> --compare <folder>`
Use when a site has changed (a new version launched, or your redesign went live) or to measure one site against another.
1. Crawl into its own folder: `docs/audit-<short-name>/` (for example `docs/audit-v2/`), so the earlier audit is kept
2. Run steps 3 to 6 as usual
3. Write `docs/audit-<short-name>/comparison.md` against the earlier `audit.md`:
   - **Scoreboard:** Lighthouse medians, page count, page weight and load time side by side, with a **Better / Worse / Same** column. No arrows, since "up" means better for scores but worse for load times.
   - **Fixed:** each earlier issue that's now solved, with evidence
   - **Still open:** earlier issues that remain
   - **New issues:** problems the new version introduced
   - **Kept or lost:** what happened to the "worth keeping" items
   - **Verdict:** in three lines, how much better it is and where the real remaining opportunities are. Be honest if little is left to improve.

When comparing your own redesign after launch, this file is the before/after section of the case study.

**`--compare` and `--learn` together:** everything goes in the new folder (`docs/audit-<short-name>/`), including `learnings.md`. Keep the full issues table, because the comparison needs it. Keep client questions to five or fewer.

## Learn mode: `/audit <url> --learn`
Use to study a well-made site for inspiration rather than to redesign it. Skip the issues table and client questions. Instead, write `learnings.md` in the audit folder:
- How it's built: platform, theme or framework, notable libraries, how sections and components are structured. Mark anything not verified.
- Design moves worth borrowing: layout, type pairing, color use, imagery, motion, microcopy
- UX patterns: navigation, product and pricing presentation, inquiry or checkout flow
- For each, one line on where it could apply in future projects
- **Suggestions for the template:** pack rules, reference sites or audit improvements to propose at the next `/retro`
- **Proposed for references.md:** one entry for the site in the format of `references.md` at the template root (path in `~/.claude/project-template-path`): URL, type of site, and the patterns it's good for. Propose it in the report; it's added at the next `/retro`, never directly.
