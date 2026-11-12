## Pack rules: creative
Experimental, interactive sites where type, colour and motion carry the experience. The feel comes from craft, not the framework: Joah's craft principles are in `~/.claude/STYLE.md` (loaded globally). Clients get the craft with their own palette and type.

### Stack (default unless the spec says otherwise)
- **Astro, static output** (`output: 'static'`), so `dist/` runs on any host. Pages are real HTML; JavaScript only enhances them.
- **GSAP** for motion (ScrollTrigger for pinned and scrubbed sections, plugins such as SplitText, Flip, Draggable and Observer for pointer and drag), in plain `<script>` tags in `.astro` components
- **Lenis** for smooth scroll, driven by GSAP's ticker (`gsap.ticker.add`, `lenis.on('scroll', ScrollTrigger.update)`). ScrollSmoother only if the spec needs its effects; then follow the ScrollSmoother rules below.
- **three.js** for WebGL, plain (no React), loaded as a separate chunk only when its canvas comes near the viewport
- **React islands only where state needs it** (filters, a configurator, a form with live validation): `client:visible` or `client:idle`, never `client:load` without a reason in the spec. GSAP inside an island uses `useGSAP`.
- **Images** through Astro's `<Image>` / `<Picture>`: AVIF and WebP, `widths` and `sizes`, lazy except the first visible image, which gets `fetchpriority="high"`
- **Option for app-like projects:** Vite + React (with React Three Fiber and drei for WebGL), chosen in the spec with one line on why. Then install the pack's `optionalSkills` from `packs.json`, one `npx -y skills add` per skill, and prerender every route to static HTML (no blank page before JS).
- Versions are pinned in `package.json` and noted in CLAUDE.md under Stack. Check current APIs with the Astro Docs MCP and Context7 before writing config, not from memory.

### Explore (Guided mode, before the spec)
After the brainstorm has a direction and before the spec is written:
1. Propose 2 or 3 interaction ideas in one message, each in one line, and agree which to try. Read `~/.claude/STYLE.md` and use `frontend-design` for the direction.
2. Build each as a throwaway prototype in `explore/<nn>-<idea>/`: one page, the smallest thing that shows the feel, no tests and no polish. Never under `src/`.
3. Show each: desktop and phone screenshots plus a short recording (Playwright `recordVideo`, saved as `explore/<nn>-<idea>/recording.webm`, gitignored). Serve only on 127.0.0.1.
4. For each, note in two or three lines: what it feels like, what it would cost to build properly (performance, reduced motion, no-JS and keyboard fallback), and the risk.
5. Stop. Joah chooses one, combines, or asks for another round. Log the choice and why in PROCESS.md Decisions, then write the spec.
- Prototype code is never moved into `src/` as is: the chosen idea is rebuilt to the spec with the rules below. Keeping a prototype is a new decision.

### Core rules for creative sites
- **Performance budget on a mid-range phone,** measured with the Chrome DevTools MCP (performance trace, 4x CPU throttling, Fast 4G, 390x844 viewport) at the screenshot checkpoint and before launch. LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less, animation at 60 fps and never under 30 fps while scrolling or in WebGL. Record the numbers in PROCESS.md; a miss is fixed or accepted there with a reason.
- **Reduced motion for every effect.** With `prefers-reduced-motion: reduce`: native scroll (no Lenis or ScrollSmoother), no pin or scrub (sections become a static layout), WebGL shows a still frame, page and state changes are a short fade at most. Use `gsap.matchMedia()`. Test it with Playwright `reducedMotion: 'reduce'`.
- **WebGL fallback.** Check for WebGL before loading three.js; without it, or on `webglcontextlost`, or with `saveData`, show the same content as a static image or HTML. Pause rendering when the canvas is off-screen (IntersectionObserver) and when the tab is hidden (`visibilitychange`). Dispose geometries, materials, textures and the renderer on page change.
- **Canvas content is accessible.** A canvas never holds the only copy of text, links or controls. Decorative canvases get `aria-hidden="true"`. Interactive scenes have a DOM equivalent: every action works by keyboard with visible focus, and state changes are announced in an `aria-live` region.
- **Readable without JS.** All content, navigation and links work with JavaScript off; motion and WebGL are layered on top. Set the `js` class from a tiny blocking script in `<head>`. Test with Playwright `javaScriptEnabled: false`.
- **Fonts self-hosted and licensed.** WOFF2 in `public/fonts/`, subset to the scripts the content needs (Latin, Latin Extended for Danish and Spanish, Cyrillic only if used), `font-display: swap`, preload only the display face. Every font is listed in `FONTS.md`: family, foundry, licence, web use allowed (yes or no), file. No demo or personal-use fonts in anything published; client sites never use demo or unlicensed fonts.

### Motion and layout (from the web-vanilla pack, still true here)
- Reveal animations use opacity only (no `autoAlpha` / `visibility: hidden`), and focus finishes a reveal, so hidden content stays reachable by Tab
- Pinned and scrubbed sections are desktop only unless tested on a phone
- Never put a fixed panel (menu, dialog) inside an element with `backdrop-filter`, `transform` or `filter`
- ScrollSmoother, if used: fine pointer and no reduced motion only; fixed elements outside the smooth wrapper; no extra focus or anchor scroll handler

### Hosting
- Static `dist/` works on both kinds of host:
  - **Apache (e.g. one.com), uploaded by hand:** `public/.htaccess` is copied into `dist/`. Follow the Hosting rules in the template's web-vanilla pack (`packs/web-vanilla/CLAUDE.snippet.md`; the template path is in `~/.claude/project-template-path`), including testing `.htaccess` against the macOS Apache
  - **Cloudflare, built from Git:** Workers with static assets (Cloudflare's default for new projects) or Pages, build command `npm run build`, output `dist/`. Use a `*.pages.dev` or `*.workers.dev` preview for tests on a real phone
- Design: work through `DESIGN_CHECKLIST.md` at the spec and before launch; `web-design-guidelines` before launch
