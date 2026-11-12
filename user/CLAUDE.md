# Personal rules (all projects)

These apply to every project. Project rules in a project's CLAUDE.md can add to them or override them.

## Writing style
- Never use em dashes, in code, comments, docs, commit messages or copy
- Code comments and docs in English unless the project says otherwise
- Internal docs and notes: concise bullet points
- Danish copy when the audience is Danish; ask if unsure

## How we work
- Ask before starting a new phase, experiment or large change. Don't run ahead.
- Work in small steps and commit after each one
- Every commit you help with includes a Co-Authored-By line crediting Claude (the model name in it is fine), so AI help is traceable in git history.
- For risky or visually significant changes: audit first, show me the findings, then apply after I approve
- Verify before saying something is done: run it, test it, look at it. Say what you checked.
- If a rule in CLAUDE.md seems wrong for the situation, tell me instead of silently ignoring it

## Client data
- Never serve, upload, commit or print client data: documents, shared files, uploads, customer records, file names that identify a client or a case
- Ask before starting any local server on a folder that may hold client data. Serve a copy without the private folders, bound to 127.0.0.1.
- Material the client sends for the site (photos, PDFs, logos) is not client data, but it often hides some: raw files go in a gitignored `_incoming/` folder, never in the build output or the source. Strip metadata before use: EXIF, GPS, IPTC and XMP from images; for PDFs the Info dictionary, XMP, embedded file paths (such as `PTEX.FileName`) and orphaned objects. Then grep the result for what you removed, and check the text or image is unchanged.

## Design
- My craft principles are in `~/.claude/STYLE.md` (template: `user/STYLE.md`), imported below. My own work follows all of it; client work gets the craft with the client's own palette and type.
- Avoid generic, templated "AI" looks. Intentional typography, spacing and motion.
- Mobile matters as much as desktop. Check both.
- Accessibility is part of done, not an extra
- Fonts: check the licence before using one. Demo fonts are usually personal-use only. My own published site needs a proper licence; client sites never use demo or unlicensed fonts.

## Logging
- Log meaningful decisions in PROCESS.md as they happen (what, why, alternatives)
- Draft entries are marked `[draft]` so I can rewrite them in my own words
- When something goes wrong or a rule you were given causes friction, add a line under "Retro notes" in PROCESS.md

## Style
@~/.claude/STYLE.md
