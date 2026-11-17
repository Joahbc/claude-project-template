# Hosting: one.com (shared web hosting, Apache)

Host facts any pack can use. Learned on Brandrup Rådgivning and the portfolio (both 2026-11). The web-vanilla and creative packs point here.

## HTTPS and `.htaccess`
- No Control Panel switch for HTTPS or `www`: both redirects go in `.htaccess` (one.com's help article 115005587469). Aim them straight at the canonical host so `http://www` is one hop. `%{HTTPS} !=on` works behind one.com's proxy without looping (tested 2026-11)
- Try every new `.htaccess` line in a throwaway preflight folder on the server first (the `.htaccess` and a one-line `index.html`), open it, then delete the folder. A line one.com refuses gives a 500 only there. Allowed so far: `Options -Indexes`, mod_rewrite, mod_headers (CSP, nosniff), `AddType`, and mod_deflate only inside both a `mod_deflate` and a `mod_filter` guard (without the second, every request got a 500)
- one.com answers its own 403 to names starting with `.DS_Store`, `.env` and `.ht` in any folder that exists, before your `.htaccess` runs. Nothing is served, but a 403 there doesn't prove a file exists. Still delete Finder's files before an upload (`find dist -name .DS_Store -delete`) and keep your own 404 rule as a backstop
- HSTS: a separate decision; hard to undo once browsers have it

## Caching and requests
- A Varnish cache sits in front (`via: ... Varnish`). Right after an upload some answers are still the old site's: ask a failing check again with a cache-busting query (`?x=<time>`); `age` over 0 or two ids in `x-varnish` means the answer came from the cache. HTML sent with `max-age=0` isn't held; old CSS and JS cached for a week can linger
- one.com answers 429 to bursts: space requests (link checks, live checks, audits) a second apart

## Uploading by hand
- Back up the live site into a gitignored `_live-backup/` first: the way back
- Uploads never delete: `DEPLOY.md` lists the old files by name, in a step headed "After the upload is live: delete" (one upload deleted first and broke the old site for a while)
- Order: what the pages load, then the pages, then `.htaccess`, `404.html` and `index.html` last. Finder hides `.htaccess` (Cmd+Shift+.), and some upload tools skip dotfiles

## SFTP
- Control Panel, SSH & SFTP (under Hosting settings or Advanced settings): turn access on; the username is shown there; the password is set through a reset email ("Send"). Plans without SSH (all but Enthusiast and Guru) take a password only, no keys
- Host: the name on that page, `ssh.<id>.service.one`, port 22 (`ssh.<domain>` is a DNS alias to the same server). Pin its ED25519 key: `ssh-keyscan -t ed25519 <host> | ssh-keygen -lf -`, compared with the fingerprint an SFTP client shows on first connect
- The web root over SFTP is a long path (`/customers/.../webroots/www`), not the login folder: read it in an SFTP client once
- help.one.com refuses automated reading (403): dashboard steps then come from search snippets, so say so and ask for a screenshot when the screen differs

## Automatic publish over SFTP (tested once, not a recipe yet)
Tested end to end in the portfolio (2026-11): a Sanity publish builds and uploads in about 7 minutes. Promote it to a recipe when a second project needs SFTP deploys (likely Kåre's). The tested files are in the `joahbrandrup-portfolio` repo:
- `.github/workflows/publish-one-com.yml` (the workflow), `scripts/upload-one-com.sh` (the upload: order as above, stale files removed only in hashed-asset folders, with a cap; refuses a folder that isn't the site), `tests/unit/upload-one-com.test.ts` and `tests/unit/workflow.test.ts`; setup steps in its `DEPLOY.md` step 8, decisions in its PROCESS.md (2026-11-17)
- Shape: `workflow_dispatch`, started by a Sanity webhook with a fine-grained token limited to Actions on that repo (or the Run workflow button, with a dry run); the SFTP secrets in a GitHub Environment limited to `master`; type check, build and unit tests before any upload; rclone pinned with its SHA-256; the host key pinned; the live check after
- Three pitfalls, each cost a failed run:
  1. rclone reads every `RCLONE_*` environment variable as one of its own options (`RCLONE_VERSION` became `--version`). Give your own variables another prefix
  2. A test that writes into a gitignored folder fails on a fresh checkout: use the OS temp folder
  3. macOS-only tests (swift, AppKit, `/usr/sbin/httpd`) must skip off macOS, or the Linux runner never reaches the upload; and a test that skips because its tool seems missing must fail on CI instead (that's how pitfall 1 hid)
