# Changelog

Each entry says what changed and which project taught it.

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
