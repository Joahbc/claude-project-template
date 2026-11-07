## Pack rules: web-vanilla
- Plain HTML, CSS and JS. No frameworks or build step unless the brief says so.
- Libraries via CDN or vendored in `js/vendor/`; note each one in CLAUDE.md
- Design tokens (colors, type, spacing) live in one place, e.g. `DESIGN_TOKENS.md` plus CSS custom properties. Use them, don't hardcode values.
- GSAP: respect `prefers-reduced-motion`. Pinned and scrubbed sections are desktop only unless tested on mobile.
- Preview with `npm run serve`, then check on a real phone on the same network
- Tests: `npm test` runs `node --test tests/*.test.mjs`
- Images: compressed, with width/height set and meaningful alt text
