# CMS for client editing on Cloudflare

Status: **research** (untested). Checked 2026-11-12. For: Dariia Taradai (Valencia-based artist, dariia.art, hosted on Cloudflare), and any client who adds and updates content themselves.

## Requirements
- **Hard:** the client only ever sees an email-and-password login or "Sign in with Google". No GitHub account for her.
- She adds and updates artworks herself: catalogue code (e.g. `PEN-016`, `ACR-026`), section (drawings: pencil, ballpoint; paintings: acrylic, oil), title, medium, size, year, English and Spanish text, photos
- Image upload with resizing (large artwork photos), and an automatic rebuild after she saves
- Works with static output, so the same pack serves Apache hosts (one.com) and Cloudflare
- Must be tested end to end by a non-developer adding an artwork before launch

## Ranking

| Rank | Option | Her login | Cost | Images | Rebuild | Main catch |
|---|---|---|---|---|---|---|
| 1 | **Sanity** | Google or email and password (default providers) | Free up to 20 seats | Image CDN with resizing, formats, and a crop and hotspot she sets per image | Sanity webhook to a Cloudflare deploy hook | Content lives in Sanity's cloud, not git; free datasets are publicly readable. See [Sanity requirements](2026-11-12-sanity-requirements.md) |
| 2 | **Keystatic + Keystatic Cloud** | Email invite, password sign-up (Google not confirmed) | Free up to 3 users; Pro $10/month per team (+$5 per extra user) | Free: originals in the repo, resized at build. Pro: Cloud Images (CDN, transforms) | Every save is a commit, so builds are automatic | Its admin routes need a server (adapter), so they can't run on one.com; big photos make the repo heavy without Pro |
| 3 | **TinaCMS + TinaCloud** | Email and password (Google not found) | Free for 2 users; Team $29/month (from 2026-10-27) | In the repo | Commit-based | Astro support weaker than for Next.js; 2 users is exactly client plus developer |
| 4 | **Pages CMS** | Invited by email; the sign-in step isn't documented | Open source | In the repo | Commit-based | Small project, mostly one maintainer |
| 5 | **Decap + DecapBridge** | Google, Microsoft or password, through the third-party DecapBridge | DecapBridge pricing not verified | In the repo | Commit-based | Two dependencies, dated interface. Its admin is a static page, so it would run on one.com |

Out (GitHub login for the client): Keystatic without Cloud, Decap with GitHub OAuth (also with a Cloudflare Worker proxy), Sveltia CMS.

**No GitHub-based option is clearly better on everything else:** Keystatic Cloud already removes GitHub from the client's side, so there is nothing to ask her.

## Why Sanity first
- Only option where full-resolution artwork photos never go into the repo or the build
- Structured fields (catalogue code, medium, size, year, two languages) and per-image crop and hotspot fit an art catalogue
- Works with fully static output, so one pack serves one.com and Cloudflare
- Official MCP server, useful for modelling the schema with Claude

## Cloudflare notes
- Cloudflare steers new projects to **Workers with static assets**; Pages still works, without a deprecation date found
- **Workers Builds deploy hooks** (from 2026-04-01): a secret URL that starts a build on POST; safe with retries and bursts; rate limited to 10 builds per minute per Worker. Pages has its own, older deploy hooks.
- Dariia's site is on Cloudflare already; check whether it's Pages or Workers before planning the move

## To test before promoting
- [ ] Dariia (or another non-developer) adds an artwork end to end: log in, upload photo, set crop, fill both languages, publish, see it live after the rebuild
- [ ] Rebuild time on Cloudflare with the full catalogue
- [ ] Login works on her phone
- [ ] Export and restore of the content (backup)

## Sources
- [Keystatic Cloud docs](https://keystatic.com/docs/cloud), [Keystatic sign-up issue #1480](https://github.com/Thinkmill/keystatic/issues/1480), [Keystatic pricing 2026](https://nayankyada.com/blog/keystatic-pricing-2026-free-tier-limits-cloud-costs-when-to-upgrade)
- [TinaCloud pricing changes](https://tina.io/blog/tinacloud-pricing-changes), [TinaCMS FAQ](https://tina.io/docs/faq), [TinaCloud login](https://app.tina.io/)
- [Sanity pricing 2026](https://nayankyada.com/blog/sanity-cms-pricing-in-2026-free-plan-growth-and-when-you-need-enterprise), [Sanity custom auth](https://www.sanity.io/docs/studio/custom-auth)
- [Pages CMS collaborators](https://pagescms.org/docs/configuration/collaborators/)
- [DecapBridge](https://decapbridge.com/), [DecapBridge getting started](https://decapbridge.com/docs/getting-started)
- [Workers Builds deploy hooks](https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks), [changelog 2026-04-01](https://developers.cloudflare.com/changelog/2026-04-01-deploy-hooks), [Pages vs Workers 2026](https://cogley.jp/articles/cloudflare-pages-to-workers-migration)
