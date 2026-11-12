## Pack rules: web-vanilla
- Plain HTML, CSS and JS. No frameworks or build step unless the brief says so.
- Libraries vendored in `js/vendor/` (zero external requests, no CDN); note each one and its version in CLAUDE.md
- Design tokens (colors, type, spacing) live in one place, e.g. `DESIGN_TOKENS.md` plus CSS custom properties. Use them, don't hardcode values.
- Preview with `npm run serve` (bound to 127.0.0.1). For a real phone, serve a copy without client data on the LAN for that check only, or use a deployed preview; then go back to 127.0.0.1
- Tests: `npm test` runs `node --test tests/*.test.mjs`
- Images: compressed, with width/height set and meaningful alt text
- Content photos are `<img>` with `srcset`, `sizes` and alt text, never CSS `background-image`. The first visible image gets `fetchpriority="high"` and no `loading="lazy"`.
- Pre-launch sweep: no placeholder text, empty sections or placeholder tiles. Run `/audit` on the preview and clear `placeholders` first.
- Design: work through `DESIGN_CHECKLIST.md` at the spec and before launch

### Layout, motion and accessibility
- Never put a fixed panel (mobile menu, dialog) inside an element with `backdrop-filter`, `transform` or `filter`: that element becomes the panel's containing block and clips it. Put the blur on a `::before` instead
- Set the `js` class from a tiny blocking script in `<head>` (e.g. `boot.js`), never from a deferred one: a late class switch shifts the layout (CLS)
- GSAP: respect `prefers-reduced-motion`. Pinned and scrubbed sections are desktop only unless tested on mobile.
- Reveal animations use opacity only (no `autoAlpha` / `visibility: hidden`), and focus finishes a reveal, so hidden content stays reachable by Tab
- ScrollSmoother: only with a fine pointer and no reduced motion; native scrolling on touch. Fixed elements (header, contact strip, toggles) go outside the smooth wrapper. Don't add your own focus or anchor scroll handler: ScrollSmoother scrolls to focus itself, and a second handler breaks anchor links
- Contrast is computed from the color tokens in a test (Lighthouse passed a 3.4:1 grey). Swipe is tested with real touch events (`hasTouch`), not only pointer events

### Hosting (Apache, e.g. one.com)
- CSP header only on `.html` and `.php` (`<FilesMatch>`): on every response it blocks `<style>` inside SVG images
- Test `.htaccess` against the real Apache in macOS (`/usr/sbin/httpd`): spawn it with `detached: true` and kill the process group (`process.kill(-pid)`), or its shutdown signal kills node and the shell; load `mod_autoindex` too, or `Options -Indexes` answers 404 instead of the host's 403. Skip the test where httpd is missing
- Redesigns: 301 redirects from every old page URL to its new page, before the HTTPS rule and straight to `https://`, so old links take one hop. A root `index.html` redirect must match `%{THE_REQUEST}`, or Apache's internal `/` to `index.html` lookup loops
- Redesigns: DEPLOY.md lists the old site's files to delete before the first upload, by name, from the top level of `original/` (never inside private folders). Uploading never removes old files
- Handing the site to a client who uploads it: run `/handover`
