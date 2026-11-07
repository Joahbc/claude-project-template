---
name: retro
description: Close a project with a retro and promote its lessons into Joah's Claude project template. Use when the user runs /retro, finishes a project or milestone, or asks to improve the template from what was learned.
---

# Retro

Look back on the current project, then improve the template with what was learned. Nothing in the template changes without the user's approval.

## 1. Gather
Read, in the current project:
- `CLAUDE.md` (note the template version it started from)
- `PROCESS.md`, especially "Retro notes", "Decisions" and "Reviews"
- `git log` since kickoff, looking for reverts, repeated fixes and long gaps
- `skills-lock.json`, and which skills were actually used during the project if that can be seen
- `docs/brief.md` done criteria: which were met?

Then read the template (path in `~/.claude/project-template-path`): `VERSION`, `CHANGELOG.md`, `user/CLAUDE.md`, `base/`, the project's pack, and `packs.json`.

If the project started from an older template version, note what changed since then.

## 2. Ask
Ask the user three quick questions, in one message:
1. What went well that you'd do again?
2. What slowed you down or annoyed you?
3. Anything Claude kept doing wrong?

## 3. Write the retro
Fill in the "Retro" section of PROCESS.md: what worked, what didn't, done criteria status, skills that helped, skills that were noise. Mark it `[draft]`.

## 4. Propose changes
Sort every lesson into one of these, and present them as a short list:

| Level | Where it goes | Rule of thumb |
|---|---|---|
| Keep in project | this project's CLAUDE.md | helped once, too specific |
| Promote to template | `base/` or `packs/<pack>/` or `packs.json` | helped in 2+ projects, or clearly reusable for this type |
| Promote to global | `user/CLAUDE.md` | applies to everything Joah does |
| Prune | remove from template | a rule or skill that didn't help, or caused friction |
| New pack | `packs/<new>/` | the project didn't fit any pack well |

For each proposal: the exact change, the file, and one line on why. Check the CHANGELOG for whether a lesson has come up before; a second occurrence is a strong reason to promote.

Keep it small. Three to six good changes beat fifteen.

## 5. Apply (only after approval)
1. Make the approved edits in the template repo
2. Bump `VERSION`: patch for wording, minor for new rules, skills or packs, major for workflow changes
3. Add a `CHANGELOG.md` entry: version, date, each change, and the project it came from
4. If `user/CLAUDE.md` changed, remind the user it's symlinked so it's live immediately
5. Commit in the template repo: `retro: <project name> -> v<new version>` with a Co-Authored-By line, and suggest pushing it

## 6. Close
One short summary: the template's new version, what changed, and anything the user should rewrite in PROCESS.md before sharing it.
