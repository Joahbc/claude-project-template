# Sanity requirements for a client site

Status: **research** (untested). Written 2026-11-12. Applies if [the CMS comparison](2026-11-12-cms-client-editing.md)'s first choice is used. Items marked *unverified* need checking in Sanity's own docs first.

## Ownership
- The client owns the Sanity organisation and project (created with her account or transferred to her before launch); Joah is a member with an admin role. She can remove him later without losing anything.
- Same for the other accounts the site depends on: Cloudflare (hers already), the domain, and the Git repository (decide whose account at the brief: hers, or Joah's with a transfer at handover)
- Billing stays with the client from day one, even on the free plan, so an upgrade is never Joah's card
- Write the account map (service, owner, login, who has access) in the client's handover README, never with passwords

## Backups
- Content lives in Sanity's cloud, not in git, so the repo is not a backup
- Scheduled export: `sanity dataset export` (documents plus assets) on a schedule, for example a weekly GitHub Action, to storage the client controls; keep the last few exports
- Restore tested once before launch: import an export into a second dataset and build the site from it
- *Unverified:* how long document history is kept on the free plan, and whether a deleted document can be restored there

## Privacy
- Free-plan datasets are **public**: anyone can read published documents through the API without a token. Only put in Sanity what is public on the site anyway.
- Never store enquiries, contact details from visitors, prices meant to stay private, or personal notes in Sanity. The contact form sends to an email service, not to the CMS.
- *Unverified:* whether drafts in a public dataset are readable without a token (believed not; check before relying on it)
- Image metadata: artwork photos can carry EXIF, GPS and camera data. Strip it before upload (user rules, Client data), and don't request `exif` or `location` metadata in the image fields.
- *Unverified:* where Sanity stores data (region) and its data processing terms; check for GDPR, since the client is in Spain

## Limits to watch (free plan, checked 2026-11-12)
- 20 seats, 10,000 documents, 100 GB assets, 100 GB bandwidth per month (sources differ on the dataset count)
- No pay-as-you-go: past a monthly API limit Sanity answers HTTP 402 until the month resets. A static build reads the API at build time only, so traffic on the live site doesn't count, but images served from Sanity's CDN do.

## Sources
- [Sanity pricing 2026 (Nayan Kyada)](https://nayankyada.com/blog/sanity-cms-pricing-in-2026-free-plan-growth-and-when-you-need-enterprise), [Is Sanity free?](https://nayankyada.com/blog/is-sanity-cms-free-what-you-actually-get-on-the-free-tier), [Sanity pricing (khod.io)](https://www.khod.io/resource-center/articles/sanity-pricing)
- [Sanity: manage your account](https://www.sanity.io/docs/platform-management/manage-your-account)
