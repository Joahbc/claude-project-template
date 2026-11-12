---
name: retro
description: Close a project with a retro and promote its lessons into Joah's Claude project template. Use when the user runs /retro, finishes a project or milestone, or asks to improve the template or its skills from what was learned.
---

# Retro

Look back on the current project, then improve the template with what was learned. Nothing in the template changes without the user's approval.

## 1. Gather
First check what kind of folder this is:
- **Full project** (has `CLAUDE.md`, `PROCESS.md` and git): read everything below.
- **Research or audit folder** (no kickoff yet, for example only `docs/audit*/`): skip what's missing, and work from the audit files, any `learnings.md` and the user's answers. Don't create `PROCESS.md`; the retro goes in the chat and the CHANGELOG instead.
- **The template repo itself**: the lessons come from the user's answers and recent CHANGELOG entries.

Read, when present:
- `CLAUDE.md` (note the template version it started from)
- `PROCESS.md`, especially "Retro notes", "Decisions" and "Reviews"
- `git log` since kickoff, looking for reverts, repeated fixes and long gaps
- `skills-lock.json` and the Skills list in CLAUDE.md. For **every** installed skill, find out whether it was invoked (the session transcripts in `~/.claude/projects/<project>/*.jsonl` show each Skill call, e.g. `grep -o '"name":"Skill","input":{"skill":"[^"]*"'`) and, if it was, whether it helped
- `docs/brief.md` done criteria: which were met?
- `docs/audit*/`: method notes, workarounds Claude had to use, and "Suggestions for the template" and "Proposed for references.md" in `learnings.md`

Then read the template (path in `~/.claude/project-template-path`): `VERSION`, `CHANGELOG.md`, `user/CLAUDE.md`, `references.md`, `base/`, the project's pack, `packs.json`, and the `SKILL.md` of every skill in `skills/` that was used.

If the project started from an older template version, note what changed since then.

## 2. Ask
Ask the user three quick questions, in one message:
1. What went well that you'd do again?
2. What slowed you down or annoyed you?
3. Anything Claude kept doing wrong?

If the user already answered these in their message, don't ask again.

## 3. Write the retro
In a full project, fill in the "Retro" section of PROCESS.md: what worked, what didn't, done criteria status, skills that helped, skills that ran but didn't help (say why), and skills that were never invoked, listed as "Unused: never invoked, so untested". An uninvoked skill is untested, never "noise"; if no step named it, propose naming one (its `when` in `packs.json`) rather than pruning it. Mark it `[draft]`. In a research folder, put the same in the chat.

## 4. Propose changes
Sort every lesson into one of these, and present them as a short list:

| Level | Where it goes | Rule of thumb |
|---|---|---|
| Keep in project | this project's CLAUDE.md | helped once, too specific |
| Promote to template | `base/` or `packs/<pack>/` or `packs.json` | helped in 2+ projects, or clearly reusable for this type |
| Promote to global | `user/CLAUDE.md` | applies to everything Joah does |
| Add a reference | `references.md` | a studied site has patterns worth reusing |
| Improve a skill | `skills/<name>/SKILL.md` or its `scripts/` | a skill's instructions were unclear, missed something, or Claude needed a workaround |
| Prune | remove from template | a rule or skill that didn't help, or caused friction |
| New pack or skill | `packs/<new>/` or `skills/<new>/` | the project didn't fit any pack, or a procedure repeated that deserves its own skill |

For each proposal: the exact change, the file, and one line on why. Check the CHANGELOG for whether a lesson has come up before; a second occurrence is a strong reason to promote. A workaround Claude had to use during the project is a strong signal too: it means a skill or script should handle that case itself.

Keep it small. Three to six good changes beat fifteen.

## 5. Apply (only after approval)
1. Make the approved edits in the template repo
2. **Script changes must be tested before committing.** Run the script against a small local test page that reproduces the case (serve it with `python3 -m http.server --bind 127.0.0.1`), check the output, then delete the test files. Text-only changes need `node --check` or a JSON parse at most.
3. Bump `VERSION`: patch for wording, minor for new rules, skills, script features or packs, major for workflow changes
4. Add a `CHANGELOG.md` entry: version, date, each change, and the project it came from
5. If `user/CLAUDE.md` or a skill changed, remind the user they're symlinked, so they're live immediately. A **new** skill needs `./install.sh` again.
6. Commit in the template repo: `retro: <project name> -> v<new version>` with a Co-Authored-By line, and suggest pushing it

## 6. Close
One short summary: the template's new version, what changed, and anything the user should rewrite in PROCESS.md before sharing it.
