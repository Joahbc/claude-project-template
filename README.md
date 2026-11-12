# Claude Project Template

My starting point for every new project built with Claude Code. It is a living template: every project ends with a retro, and the lessons get promoted back into this repo.

Current version: see `VERSION`. History: see `CHANGELOG.md`.

## What's in here

```
claude-project-template/
├── user/CLAUDE.md        # personal rules for ALL projects (goes to ~/.claude/CLAUDE.md)
├── user/STYLE.md         # my craft principles, a living file (goes to ~/.claude/STYLE.md)
├── base/                 # copied into every new project
│   ├── CLAUDE.md         # project context, with {{placeholders}}
│   ├── PROCESS.md        # decision log, AI disclosure, retro
│   ├── DESIGN_CHECKLIST.md     # design, mobile, accessibility and voice checks
│   ├── docs/brief.md     # goal, audience, constraints, done criteria
│   ├── .claude/settings.json   # shared, generic permissions
│   └── .gitignore
├── packs/                # one folder per project type
│   ├── web-vanilla/      # HTML/CSS/JS, GSAP, scrollytelling
│   ├── creative/         # Astro, GSAP, Lenis, three.js: experimental, interactive sites
│   ├── shopify/          # Shopify themes and e-commerce
│   └── coursework/       # school projects with strict rules
├── packs.json            # which skills, plugins and mode each pack uses
├── references.md         # reference sites and the patterns each is good for
├── docs/research/        # comparisons not yet tested in a project (promoted at /retro)
├── skills/
│   ├── kickoff/          # /kickoff: scaffolds a new project from this template
│   ├── audit/            # /audit: analyses an existing site before a redesign
│   ├── handover/         # /handover: zips, client README, DEPLOY.md and AI prompt
│   └── retro/            # /retro: closes a project and improves this template
└── install.sh            # links the skills and user rules into ~/.claude
```

## Setup (once per machine)

1. Clone this repo somewhere permanent, e.g. `~/Developer/claude-project-template`
2. Run `./install.sh`
3. Make sure Superpowers is installed: `/plugin install superpowers@claude-plugins-official` inside Claude Code

After adding a new skill to `skills/`, re-run `./install.sh` so it gets linked into `~/.claude/skills/`.

## Starting a project

Make an empty folder, open Claude Code in it and run `/kickoff`. It asks a few questions, copies the base, adds the right pack, installs the pack's skills, fills in CLAUDE.md and the brief, and makes the first commit.

On a new machine or fresh clone, reinstall the pack's skills with the `npx` commands from `packs.json`.

## The workflow

| Step | What happens | Output |
|---|---|---|
| 0. Kickoff | `/kickoff`, pick pack and mode | CLAUDE.md, brief.md, first commit |
| 0.5. Audit (redesigns only) | `/audit <url>`: crawl, screenshots, Lighthouse, findings. Add `--source <folder>` to scan the source code too | docs/audit/ |
| 1. Brief | Lock goal, audience, done criteria | docs/brief.md |
| 1.5. Explore (creative pack, Guided) | 2 or 3 throwaway prototypes of interaction ideas, screenshots and recordings; I choose before the spec | explore/, PROCESS.md |
| 2. Spec and plan | Superpowers brainstorm, spec, plan (Guided) or my own step list (Directed) | docs/superpowers/ |
| 3. Build | Small steps, commit after each, test locally and on phone | commits |
| 4. Review | Design and accessibility review, audit first then apply | review notes in PROCESS.md |
| 5. Ship | Deploy, verify live. Client uploads it: `/handover` (zips, README, DEPLOY.md, AI-PROMPT.md, live checks, compare audit) | live URL in CLAUDE.md, handover/ |
| 6. Document | Case study notes for the portfolio | PROCESS.md |
| 7. Retro | `/retro`, promote lessons to this template | new template version |

## Working modes

- **Guided:** the full Superpowers flow (brainstorm, spec, plan, subagent build, reviews). Default for client work and open-ended projects.
- **Directed:** I write the steps, Claude only executes them one at a time. Default for coursework and small, well-defined tasks.

The mode is set per project in CLAUDE.md and can be changed at any time.

## How this template improves

Every lesson climbs a ladder:

1. **Project:** a rule that helped once stays in that project's CLAUDE.md
2. **Template:** helped in two or more projects, so it moves into `base/` or a pack
3. **Global:** applies to everything I do, so it moves into `user/CLAUDE.md`

`user/STYLE.md` climbs the same ladder: a craft choice moves from "Direction" to "Proven" once it has held up across projects. Research in `docs/research/` becomes a pack rule only after a project has tested it.

Things that didn't help get pruned the same way. `/retro` proposes the moves, I approve them, and it bumps `VERSION` and writes the `CHANGELOG.md` entry.

### Adding a new pack

1. Create `packs/<name>/CLAUDE.snippet.md` with the stack-specific rules
2. Add starter files in `packs/<name>/files/` if needed
3. Add the pack to `packs.json`
4. Note it in `CHANGELOG.md` and bump the minor version

### Versioning

- **Patch (1.0.x):** wording fixes, small rule tweaks
- **Minor (1.x.0):** new pack, new skill, new workflow step
- **Major (x.0.0):** the workflow itself changes
