---
name: kickoff
description: Start a new project from Joah's Claude project template. Use when the user runs /kickoff or asks to set up, scaffold or start a new project in the current folder.
---

# Kickoff

Scaffold a new project in the current working directory from the project template.

## 0. Find the template
- Read `~/.claude/project-template-path` to get the template folder. If it's missing, ask where the template repo is cloned.
- Read `VERSION`, `packs.json`, and the `base/` and `packs/` folders there.
- Check that the current folder is empty (or only has a README/.git). If it has project files, stop and ask before overwriting anything.

## 1. Ask (one message, short)
Ask these together, with sensible defaults shown:
1. Project name, and one sentence on what it is
2. Pack: list the packs from `packs.json` with their descriptions
3. Kind: client, school or personal
4. Working mode: suggest the pack's `defaultMode` and say why in one line
5. Deploy target, if known
6. Anything fixed: deadline, people involved, constraints, school rules

For the coursework pack, also ask for course name, deadline, hand-in format and allowed exceptions.

Don't ask anything the user already answered in their message.

## 2. Scaffold
1. Copy everything in `base/` into the project (including dotfiles)
2. Copy `packs/<pack>/files/` into the project, if it exists
3. Append `packs/<pack>/CLAUDE.snippet.md` to the end of `CLAUDE.md`
4. Fill all `{{PLACEHOLDERS}}` in CLAUDE.md, PROCESS.md, docs/brief.md and package.json from the answers. Use today's date and the template version. Leave a clear `TODO:` for anything unknown instead of inventing it.
5. In CLAUDE.md, delete the working-mode block that wasn't chosen
6. Write a first draft of `docs/brief.md` from the answers. Mark guesses with `TODO:`.

## 3. Install
1. For each skill in the pack, run one `npx -y skills add <source> --skill <skill> --agent claude-code` command as its own Bash call. Never wrap them in a shell loop: loops break under zsh. If one fails, list the repo's skills, pick the closest match, and tell the user so they can update `packs.json`.
2. For each plugin in the pack and in `globalPlugins`: check whether it's installed. If not, tell the user the exact `/plugin install ...` command to run (Claude can't run slash commands).
3. Mention anything under `requires` that the user needs to set up.

## 4. Commit
- `git init` if needed, then commit everything: `chore: kickoff from template v<version> (<pack>, <mode>)` with a Co-Authored-By line
- Installed skills (`.claude/skills/`, `.agents/skills/`) are gitignored and not committed, but `skills-lock.json` is, so they can be restored
- Add a first entry under Decisions in PROCESS.md: pack, mode and why

## 5. Report
One short summary: what was created, what's still `TODO:`, and the next step:
- Guided: "Next: fill in the brief together, then start the Superpowers brainstorm"
- Directed: "Next: give me step 1"

Don't start the brief or any build work until the user says so.
