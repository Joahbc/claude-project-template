---
name: handover
description: Hand a finished client website over to a client who uploads it and edits texts themselves. Use when the user runs /handover, says the site is done and the client takes over, or asks for upload and source zips, a client README, DEPLOY.md, an AI prompt for the client, or the checks after the client has uploaded.
---

# Handover

Package a finished site so a client who isn't a developer can upload it, check it and change texts later, alone or with an AI tool. Written from the Brandrup Rådgivning handover (static Node build, one.com). For other stacks keep the steps and adapt the commands (a Shopify theme ships as a theme zip, not a web root).

## Rules
- Nothing private in either zip: no client data, no private folders, no internal notes (`PROCESS.md`, `docs/superpowers/`, `docs/audit*/`), no `original/`, `_incoming/`, `.git`, `node_modules/` or build output in the source zip
- Zips go in `handover/` (gitignored) and are built from a tagged commit
- Client-facing docs (`README.md`, `DEPLOY.md`) are in the client's language; `AI-PROMPT.md` is in English and tells the AI to answer in the client's language
- Only facts from the project: never invent a feature, a menu path in the host's control panel, or a command you haven't run. When unsure (e.g. the exact name of a hosting setting), describe where to look instead
- Verify everything you claim: run the commands, read the zip listings

## 0. Before you start
- `npm test`, the pre-launch check and the build pass; the working tree is clean
- Ask, in one message, whatever isn't known: who receives it, their language, the host, whether they will edit texts, the live URL, and (redesigns) what happens to old folders on the server that aren't part of the new site
- Redesign: list the old site's files to delete from `original/`, **top level only, never inside a private folder**
- The pre-launch review has run: `web-design-guidelines` on the built site and `DESIGN_CHECKLIST.md`, findings shown by severity and the approved fixes made (PROCESS.md "Reviews"). If not, run it now and stop for approval: no zips before it

## 1. Make the source work on its own
- `grep` the tools and tests for reads from files that won't be in the source zip (`docs/`, `PROCESS.md`, `CLAUDE.md`, `original/`). Move what they need into the source (e.g. an audit baseline as a constant in the script)
- Notes for editors (`.md` in assets) stay out of the build
- Redesign: 301 redirects from the old page URLs to the new ones, tested (see the pack rules)

## 2. README.md for the client
Step by step, for someone who has never used a terminal:
1. Install Node (where, which version, how to check `node -v`)
2. Open Terminal and go into the folder (the drag-the-folder trick)
3. `npm install` (plus any one-time browser download the tools need)
4. Where each text lives: a table of page texts, service or product names, contact facts (phone, email, company number) in the data file, menu and footer strings
5. Build, check, preview, test: each command, what success looks like, how to stop the preview
6. Which folder to upload, and that the build folder is never edited by hand
7. One section per change the client will make (photo, certification or other data fields, updated PDFs), each ending in build, check, upload
8. A short "use an AI tool" section that points to `AI-PROMPT.md`

## 3. DEPLOY.md
In order:
1. Build and check (or: the upload zip is already built)
2. Redesign, first upload only: delete the old site's files by name; say which files are overwritten instead; old private folders are the client's decision to keep or delete; anything else unexpected, leave it and ask
3. Upload the **contents** of the build folder, including hidden files (`.htaccess`), with how to show hidden files
4. One-time host settings (e.g. force HTTPS), described where to find them
5. Checks after every upload, each as a command and its expected result: http to https (301 and `Location`), directory listing refused (403), a modern image format served with the right `Content-Type`, the contact form delivers a real message, old URLs redirect (301 to the new page), the 404 page
6. A short smoke test: home and one inner page on phone and desktop, language toggle

## 4. AI-PROMPT.md
A complete prompt the client pastes into their AI tool (Claude or similar) with the source folder attached. English, second person to the AI, filled with this project's real facts:

```markdown
# Working on the <site> website

You are helping <client>, who owns <company> and is not a developer, to change and publish
their website. Answer them in <language> (or whatever language they write in), in plain words,
one step at a time, and say exactly which file you change and why.

## What they have
- `<site>-upload.zip`: the finished site. Its contents go to the web root at <host>.
- `<site>-kilde.zip` (source): the folder you work in. You change files in `src/`, then build.

## First-time setup (once per computer)
<Node version and download, opening Terminal, cd into the folder, npm install, extra one-time steps>

## Where things live
<table copied from the README: page texts per language, names, contact facts, menu and footer>

## Making a change
1. Edit only files in `src/` (never `www/`, it is rebuilt every time)
2. Keep both languages in step: <first language> first, then the <second language> version
3. Run `npm run build`, `npm run check` (must say "<success line>") and `npm test` (must end with `fail 0`)
4. Show the result with `npm run serve` at http://127.0.0.1:8000/ before anything is uploaded

## Common changes
<one short recipe each: change a text, change a phone number or email, change the photo, add the certification, update the terms PDF ...>

## Uploading
<from DEPLOY.md: delete old files on the first upload, upload the contents of www/ including .htaccess, host settings>

## Checks after upload (and the expected results)
<each DEPLOY.md check with its command and expected status line>

## Never
- Never edit `www/` by hand, never upload anything but its contents
- Never put original photos or documents in `src/` or `www/` (metadata); use the photo command
- Never invent claims about certifications, experience, clients or prices
- Never send the contact form, delete files on the server or upload without the owner saying so
- <project-specific: private folders, files that must not be removed>

## Voice
<the site's voice rules from the brief: e.g. company voice with "vi", the person page in third person,
credentials instead of years-of-experience claims, phone format "+45 21 87 55 57", no em dashes>
```

Then link it from the README's AI section and include it in the source zip. The README stays the human guide; the prompt is for the AI.

## 5. Zips
Rebuild first, then (adapt names and folders):

```bash
mkdir -p handover && rm -f handover/<site>-upload.zip handover/<site>-kilde.zip
npm run build
(cd www && zip -q -r -X ../handover/<site>-upload.zip . -x '*.DS_Store' '__MACOSX/*')
git archive --format=zip --prefix=<site>/ -o handover/<site>-kilde.zip <tag> src tools tests package.json package-lock.json README.md DEPLOY.md AI-PROMPT.md
unzip -l handover/<site>-upload.zip
```

- `unzip -l` must show `.htaccess` (and any other hidden file the site needs), and no `.DS_Store` or `__MACOSX`
- Test the source zip in an empty folder: unzip, `npm ci`, build, check, tests. All must pass there, not only in the repo
- Report both sizes and the upload zip's file list

## 6. Commit and tag
- Commit the handover changes, then tag the release (`v1.0` for the first). A local tag that was never pushed may be moved to the final handover commit; say so. A pushed tag is never moved: make `v1.0.1`
- The zips are built from that tag

## 7. After the client has uploaded
1. Run the DEPLOY.md checks against the live URL (`curl -I`, read-only) and report each result next to its expected one. The contact form check needs a real message: ask before sending one, or ask the client to send it
2. Put the live URL in CLAUDE.md wherever it is still `TODO`
3. For the case study, run `/audit <live url> --compare docs/audit` and add the before and after numbers to "Case study notes" in PROCESS.md

## Self-check
- [ ] web-design-guidelines review ran on the built site before the zips, approved fixes made
- [ ] Source zip passed build, check and tests in an empty folder
- [ ] `.htaccess` listed in the upload zip; no junk files
- [ ] No internal notes or private files in either zip
- [ ] README, DEPLOY.md and AI-PROMPT.md cover the steps above with this project's facts, no em dashes
- [ ] Tagged; sizes and file list reported
- [ ] After upload: live checks run and reported, then the compare audit
