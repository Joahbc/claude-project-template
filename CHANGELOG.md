# Changelog

Each entry says what changed and which project taught it.

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
