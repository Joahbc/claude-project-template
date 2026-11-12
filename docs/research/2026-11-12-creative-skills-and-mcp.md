# Creative pack: skills and MCP servers

Status: **research** for what was left out; what was kept is in `packs.json` (v1.6.0). Checked 2026-11-12 by reading each repo, not by installing. `/retro` after the portfolio checks whether each kept one was invoked and helped.

## Kept

| Name | Source and maintainer | Adds | When |
|---|---|---|---|
| gsap-core, -timeline, -scrolltrigger, -plugins, -react, -performance | `greensock/gsap-skills` (GreenSock, official) | Current GSAP APIs, including plugins for drag, text and layout | See `packs.json` |
| threejs-fundamentals, -shaders, -textures, -interaction, -performance | `CloudAI-X/threejs-skills` (MIT, 4.1k stars, updated 2026-10-19, targets r186) | Plain three.js, which is the pack's default (no React) | See `packs.json` |
| frontend-design | `anthropics/skills` (Anthropic) | Picks an aesthetic direction, then critiques it in two passes. Says the brief's direction always wins | Brainstorm, Explore, screenshot checkpoint |
| web-design-guidelines | `vercel-labs/agent-skills` (Vercel) | Review against web interface guidelines | Before launch |
| Optional: threejs-react-three-fiber | `CloudAI-X/threejs-skills` | R3F and drei | Vite + React option only |
| Optional: vercel-react-best-practices | `vercel-labs/agent-skills` | React and bundle performance | Vite + React option only |
| MCP: astro-docs | `https://mcp.docs.astro.build/mcp` (Astro, official; answered an MCP initialize call) | Current Astro docs | Before Astro config, integrations, islands, images, routing |
| MCP: context7 | `https://mcp.context7.com/mcp` (Upstash; answered an MCP initialize call) | Current docs for any library | Libraries without a skill: Lenis, drei, Astro integrations |
| MCP: chrome-devtools | `chrome-devtools-mcp` (Google Chrome DevTools team, Apache-2.0, 55k stars) | Performance traces with throttling, console, network, screenshots | Performance budget at the screenshot checkpoint and before launch |

## Left out, and when they'd come back

| Name | Source | Why not now | Would earn a place when |
|---|---|---|---|
| design-taste-frontend | `Leonxlnx/taste-skill` (MIT) | v2.5 is built for company websites ("at the level of figma.com and x.ai", one section per screen, conversion pages). Stays in web-vanilla and shopify | A creative project is really a company site |
| r3f-skills (11 skills) | `EnzeD/r3f-skills` (136 stars, reviewed 2026-08-31 against Fiber 9.7, drei 10.7, three r185; evals and CI) | Deepest R3F guidance found, but R3F isn't the default, and the repo has **no licence** | The Vite + React option is used and the repo gets a licence |
| astro | `astrolicious/agent-skills` (community, 19.5k installs, updated 2026-03-20, no repo licence) | A quick reference that says to consult the docs; the Astro Docs MCP does that directly | Never, unless the MCP disappears |
| gsap-frameworks | `greensock/gsap-skills` | Covers Vue, Nuxt and Svelte lifecycles; GSAP in Astro runs in plain scripts (gsap-core) | A project uses Vue or Svelte |
| webapp-testing | `anthropics/skills` | Python Playwright; the template tests with Node `playwright-core` and `node --test` | Never for this template |
| algorithmic-art | `anthropics/skills` | p5.js generative pieces for artifacts; p5.js isn't in the stack | Explore needs generative visuals sketched fast |
| Figma MCP | Figma (official Dev Mode server) | Joah doesn't design in Figma for these projects | A project is designed in Figma |
| Cloudflare MCP servers | `cloudflare/mcp-server-cloudflare` | The portfolio launches on one.com; a Cloudflare preview is only needed with a CMS | The CMS test on a `*.pages.dev` or `*.workers.dev` preview starts |
| Sanity MCP | Sanity (official) | No CMS chosen yet | Sanity is chosen (see the CMS note) |

## Found, worth knowing
- `frontend-design` lists cream grounds near `#F4F1EA`, hairline rules, mono data labels, "01 / HOOK"-style labels and middle-dot meta strings as common AI defaults. Joah's shipped portfolio uses several on purpose. `user/STYLE.md` states them as deliberate choices that must carry information.
