# Changelog

Each entry says what changed and which project taught it.

## 1.5.0 (2026-11-12)

**From the Brandrup Rådgivning retro (redesign, static Node build, one.com, handed over to the client):**
- `/kickoff`: `original/` is gitignored and never committed (was: commit it untouched, which would have put client case files in git). Asks which folders hold client files before copying anything; they go in the project's CLAUDE.md as never-serve and become `--exclude` paths for the audit. Later client material goes in `_incoming/`.
- `base/.gitignore`: `original/`, `_incoming/`, `handover/`
- User rules (Client data): raw client material goes in a gitignored `_incoming/`, never the build output or source; strip image metadata (EXIF, GPS, IPTC, XMP) and PDF metadata (Info, XMP, embedded file paths, orphaned objects), then verify. Kåre's photo had an IPTC block; his PDF had a file path from his computer and the logo's Inkscape info.
- New `/handover` skill: upload zip with `.htaccess` verified and no junk, source zip from a tag without internal notes, tested in an empty folder; README for a non-developer; DEPLOY.md (delete old files by name, hidden files, host settings, checks with expected results); `AI-PROMPT.md` in English that tells the AI to answer in the client's language; after the client uploads: live checks, then `/audit <live url> --compare docs/audit` for the case study.
- web-vanilla pack rules: libraries vendored, no CDN; real-phone checks via a temporary LAN copy without client data or a deployed preview (the old "same network" rule contradicted the 127.0.0.1 rule); no fixed panel inside `backdrop-filter` / `transform` / `filter`; blocking `boot.js` for the js class; opacity-only reveals; ScrollSmoother rules; contrast from tokens in a test; real touch swipe; CSP only on html/php; testing `.htaccess` against the macOS Apache (detached process group, `mod_autoindex`); old-URL 301s with a `THE_REQUEST` guard for `index.html`; deleting old files before the first upload.
- New `base/DESIGN_CHECKLIST.md` for all packs (web-only and Danish-only items marked): background colors compared in the browser, hardcoded white in assets, logo changes as new files with approval, header height on phones, bottom contact strip, contact path, 320px words, Danish hyphenation, contrast, carousel controls, touch, brand-led motion, font trade-off, paper on paper, SVG cleanup, OG size, Danish phone format, voice.
- Guided mode (`base/CLAUDE.md`): screenshot checkpoint after the first full page, before the rest is built
- `references.md`: brandrupraadgivning.dk
- The "check on a real phone" vs localhost conflict came up once 1.4.3 bound `npm run serve` to 127.0.0.1; now one rule

Text-only changes, checked: skill frontmatter parses, `packs.json` parses, no em dashes, every referenced template file exists, `./install.sh` links `/handover`.

## 1.4.4 (2026-11-10)

**From Brandrup Rådgivning:**
- Fix: the "[Bracketed Label]" placeholder check from 1.4.3 is now its own case-sensitive pattern and only runs on prose: HTML and PHP with tags, comments, `<script>`, `<style>` and `<?php ?>` blanked out (line numbers kept), and Markdown outside code. JS, CSS and JSON are never checked for brackets, and character classes like `[A-Za-z0-9]` are skipped. In 1.4.3 the shared `gi` flags made the capital-letter check case-insensitive, which gave 6 false positives on this site (`[a-z]`, `[A-Za-z0-9]`, `[name]` in `footer.js` and `share/index.php`). My 1.4.3 mock only used uppercase look-alikes, so the test missed it.

Tested on the real source (private folders excluded, no names leaked): 13 placeholders, all real (12 in the references draft, 1 on the terms page), 0 false positives. Mock: bracket labels in HTML text and Markdown prose found; lowercase brackets, attributes, comments, script, PHP, JS, CSS, inline code, fenced code, Markdown links and `[A-Z]` in text skipped. Mock deleted.

## 1.4.3 (2026-11-10)

**From Brandrup Rådgivning (client files in a `share/` folder, served by a local preview):**
- Fix: `source-scan.mjs --exclude` stops with an error when the path doesn't exist, before anything is scanned. `--exclude share/_files` with the site in `original/www/` had matched nothing, which would have listed every client file name.
- Fix: hosting checks find the web root (the shallowest folder with an index page, such as `www/`) instead of only the source root. New `hosting.webRoot`, `otherWebRoots` and `htaccessFiles`. It had reported no `.htaccess`, robots or 404 for `original/www/`.
- Placeholder patterns catch "Denne side er en placeholder", "[Sagstitel]"-style bracketed labels, "Billede indsættes" / "Tekst følger", "kommer snart" and "pladsholder". The bare word "placeholder" only counts in visible page text, never in form attributes, CSS or JS.
- web-vanilla `npm run serve` binds to 127.0.0.1. `python3 -m http.server` listens on every interface by default and ignores `.htaccess`, so a preview had published private files to the network. Same fix in the retro skill's test instructions.
- `/audit`: local previews are always served from a copy without the private folders, bound to 127.0.0.1, never from the original folder; ask first, and check a running preview with `lsof`. `--exclude` paths are relative to the source folder, with an example.
- User rules: new "Client data" section. Never serve, upload, commit or print client data; ask before starting a local server on a folder that may hold it.

Tested on a mock: a wrong `--exclude` exits 1 with no output written; a correct one leaves no excluded names in the output; the web root is found as `www/` (and as `.` for a site at the root with a nested `blog/index.html`), with `.htaccess` rules parsed; all 5 Danish placeholder forms were found, and an input `placeholder` attribute, `::placeholder`, `[type="text"]`, a JS `placeholder` variable, a JS array and Markdown links were not; `npm run serve` listened on 127.0.0.1:8000 only and refused the LAN address. Mock deleted.

## 1.4.2 (2026-11-10)

**From Brandrup Rådgivning:**
- New `source-scan.mjs --exclude <path>` (repeatable, relative to the source folder) skips folders or files completely: never read or listed, and links into them are not checked or reported, so private client files leave no file names in the output. The audit skill asks about private folders and says to grep the output afterwards. Tested on a mock with two excluded folders (one nested, one under `share/`) and links into both: the control run listed all 7 names, the excluded run had none in `source-data.json` or `content-source/`, and a normal broken link was still reported. Mock deleted.

## 1.4.1 (2026-11-10)

**From Brandrup Rådgivning:**
- Fix: `source-scan.mjs` masks key-like tokens in placeholder context lines (20+ characters of letters, digits, `_` or `-`, mixing letters and digits; first 4 kept, then "..."), so a secret in a format the patterns don't know can't leak. Tested on a mock: an unknown-format key next to a TODO was masked; Danish text and normal URLs were not. A long URL slug that mixes letters and digits is masked too, which errs on the safe side.

## 1.4.0 (2026-11-10)

**From Brandrup Rådgivning:**
- New `/audit <url> --source <folder>` mode with `scripts/source-scan.mjs`, a read-only source scanner with no dependencies. It writes `source-data.json` (structure, duplication, CSS tokens, libraries and CDNs, form targets, masked possible secrets, placeholders, big and unused images, broken local links, hosting files) and `content-source/` with the exact page texts.
- `audit.md` has a new Code section (9) after Tech and performance, ending in a Keep / Refactor / Rebuild verdict per file or area. Later sections renumbered (Issues is now 14). Possible secrets go in Issues as High, "Fixed by: code", never unmasked.
- `/audit` self-check covers the Code section
- `/kickoff` asks for the source code; if given, it goes in `original/`, committed untouched before any changes, and the next step is `/audit <url> --source original/`
- README: source mode in the audit row
- Fix (found while testing): placeholder `context` printed whole source lines, so a secret on the same line leaked unmasked. Lines with a possible secret are now hidden, and the `123456789` placeholder pattern needs word boundaries so it no longer matches inside keys.

Tested on a local mock site (3 pages with shared header and footer, Formspree and JS-only forms, fake API key and passwords, placeholders, a 390 KB and an unused image, a broken link, `.htaccess` and robots.txt): all detected, source folder unchanged, no unmasked secret in the output. Mock deleted.

## 1.3.0 (2026-11-10)

**From the Studio Sobra retro (audits of studio-sobra.vercel.app and studiosobra.com):**
- `/audit` crawler records the font that actually renders next to the declared one, and warns when a declared web font falls back to a system font (`fonts.fallbackWarnings`). Found the broken Inter on the first site, which had needed a manual CDP check.
- `/audit` crawler checks the mobile menu on the first page: opens, `aria-expanded`, closes on Escape, hidden links still reachable by Tab. Saves `<page>-mobile-menu-open.png`. It only presses the toggle button and Escape, never links, and skips quietly with no toggle. Escape failed on both sites and was checked by hand twice.
- `/audit` crawler flags placeholder text (`placeholders`: "[to be added]", "coming soon", lorem ipsum, TBD, "soon to confirm"). The live "CVR: [to be added]" was the top v2 issue.
- Fix: page text no longer falls back to script and style content, and includes text inside open shadow DOM (`shadowRoots`, `shadowFields`). The Shopify Forms page came out as code.
- `/audit` crawler prints the setup command when Playwright is missing; setup step now says "whenever `scripts/node_modules` is missing", not only on a new machine (it broke after the skill moved into the template)
- `/audit` rules for `--compare` and `--learn` together: one folder, full issues table, five questions or fewer
- `/audit` self-check covers placeholders, font fallbacks and the menu check
- shopify and web-vanilla packs: content photos are `<img>` with `srcset`/`sizes` and alt, never CSS backgrounds; pre-launch sweep for placeholders, empty collections and dateless events
- New `references.md` at the template root, starting with studiosobra.com. `/audit --learn` proposes entries; `/retro` adds them.
- Already covered in 1.2.0, not repeated: personal style rules never listed as findings, JSON-LD per page type, predictions marked Estimate, missing content must reach the issues table. Each came up a second time in this retro.

Tested on a local test page (failed web font, broken and working menus, no menu, placeholders, script text in main, shadow DOM form) and on both real sites: cookie banner declined on studiosobra.com, 6 of 7 home background images unlabelled, body-scroll screenshots on the vercel site.

## 1.2.0 (2026-11-10)

**From the Studio Sobra audit review:**
- `/audit` crawler declines cookie banners (known consent tools, then decline-text buttons in English, Danish and Spanish), never accepts. `--keep-cookie-banner` keeps the banner.
- `/audit` crawler records CSS background images and whether they're labelled, plus JSON-LD types per page
- New `scripts/lighthouse.mjs`: three mobile Lighthouse runs per URL, with median and range in a summary file
- `/audit` asks first: site status, who built it and key pages. Status sets severity for unfinished content.
- Issues table has a "Fixed by" column: theme or code, admin settings, content, or platform
- Self-check step before reporting, and a manual screenshots folder (`screenshots/manual/`)
- Shops: adding a product to the cart to inspect its options is allowed, then the cart is emptied. Never checkout.
- Audit files are internal notes; the client summary is separate and diplomatic. Personal style rules are never listed as findings.
- `/retro` can improve skills and scripts, works in research or audit folders without a full project, and requires script changes to be tested on a local test page before committing
- `package-lock.json` for the audit scripts is committed

## 1.1.1 (2026-11-10)

**From the Studio Sobra audit:**
- Fix: the audit crawler finds the real scroll container on sites that scroll inside `body` or a wrapper, and takes scroll-by-scroll viewport screenshots there instead of a blank full-page shot. `scrollsInside` in the data says which element scrolls.
- Fix: `/audit` step 6 has a fallback for folders with no project yet: the audit stays in `docs/audit/`, with no `git init` and no new brief or PROCESS.md
- New: `--compare <folder>` mode, which audits a changed site into its own folder and writes `comparison.md` against the earlier audit
- New: `--learn` mode, which studies a well-made site for inspiration and writes `learnings.md`

## 1.1.0 (2026-11-10)

**New:**
- `/audit <url>` skill for redesigns: read-only crawl with Playwright (structure, content, styles, tech hints, desktop and mobile screenshots), Lighthouse scores, and a written `docs/audit/audit.md` with Keep / Change / Add and an issues table
- `/kickoff` asks whether the project is a redesign and, if so, points to `/audit <url>` before the brief
- `docs/brief.md` has a "Current site" section for redesigns
- Root `.gitignore` so the audit script's `node_modules/` is never committed
- README: audit in the folder tree and as workflow step 0.5; re-run `install.sh` after adding a skill

## 1.0.2 (2026-11-10)

**From kickoff-test:**
- Fix: the Co-Authored-By rule in `user/CLAUDE.md` now accepts any line crediting Claude, model name included. The old rule required the exact `Claude <noreply@anthropic.com>` form, which clashed with Claude Code's default attribution.

## 1.0.1 (2026-11-10)

Fixes from testing `/kickoff` on a fresh project.

**From kickoff-test:**
- Fix: removed `minimalist-ui` and `redesign-existing-projects` from web-vanilla and shopify; `Leonxlnx/taste-skill` now only ships `design-taste-frontend`
- Fix: web-vanilla smoke test skips when `index.html` doesn't exist yet, so `npm test` passes right after kickoff
- Fix: `/kickoff` runs one `npx -y skills add` per skill as separate Bash calls, never a shell loop (loops break under zsh)
- Fix: installed skills (`.claude/skills/`, `.agents/skills/`) are gitignored; `skills-lock.json` is committed
- README: how to reinstall skills on a new machine or fresh clone

## 1.0.0 (2026-11-07)

First version, built from the setups of two projects.

**From the portfolio (joahbrandrup.dk):**
- Superpowers Guided mode with specs and plans kept in `docs/superpowers/`
- Skills vendored per project with a `skills-lock.json`
- Browser tests with `node --test` and playwright-core
- Fix: generic permissions now live in a committed `.claude/settings.json`; `settings.local.json` is gitignored and never holds shared rules
- Fix: packs only install the skills that fit the stack (no React skills on vanilla sites)
- Fix: every project gets a CLAUDE.md

**From PEI (Programming Experimental Interactions):**
- One CLAUDE.md as the single source of project context
- Working agreements: ask before starting a new phase, commit after each step, test through npm scripts
- Co-Authored-By on every AI-assisted commit
- PROCESS.md as decision log and AI disclosure
- Directed mode for step-by-step specs

**New:**
- Packs: web-vanilla, shopify, coursework
- `/kickoff` and `/retro` skills
- Retro step and promotion ladder
