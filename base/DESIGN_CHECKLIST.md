# Design checklist

Work through this at the spec and again before launch. Items marked **[web]** are for hand-built sites (web-vanilla); **[DA]** for Danish sites. Everything else applies to every site, Shopify themes included. Tick, skip with a reason, or add a project rule.

## Process
- [ ] Screenshot checkpoint after the first full page (usually home), desktop and phone, approved before the rest is built
- [ ] Candidate background colors compared side by side in the browser, not as hex values (#FFFFF0 looked fine on paper and too yellow on screen). Each color is one token, so a switch is one change
- [ ] After a background change, every asset checked for hardcoded white (fills, outlines and boxes in logo SVGs)
- [ ] A changed client logo or lockup is a new file next to the original, and the client approves it before launch

## Layout and mobile
- [ ] The header takes little of the phone screen (one fixed header took 46%): slim on desktop, hide-on-scroll on phones
- [ ] Service businesses: a bottom contact strip with tap-to-call on phones, plus bottom padding so it never covers the footer
- [ ] A clear contact path: Kontakt / Contact in the nav and a call to action at the end of every service or product page
- [ ] Longest words and headings checked at 320px; hero headings sized to fit there
- [ ] **[DA]** No automatic hyphenation (it splits Danish words wrongly): manual hyphens plus soft hyphens (`&shy;`) in long headings

## Accessibility
- [ ] Contrast computed from the color tokens in a test, for every text and background pair actually used (don't trust Lighthouse alone)
- [ ] Auto-rotating carousels: pause/play button, pause on hover and focus, no autoplay with reduced motion, a plain list without JS
- [ ] Swipe and touch tested with real touch events (or a real phone), not only a desktop pointer
- [ ] Content hidden for animation is still reachable by Tab

## Motion
- [ ] Motion comes from the brand's own idea (e.g. a floor plan drawing itself in on scroll for a fire safety consultant), not generic effects; calm next to a carousel
- [ ] Off with `prefers-reduced-motion`; smooth scrolling only on desktop
- [ ] **[web]** Libraries self-hosted: zero external requests

## Typography and assets
- [ ] Font choice and its trade-off written in the spec (e.g. a system font: zero external requests and full privacy, less character)
- [ ] Every font's licence checked and recorded (family, foundry, licence, web use allowed): no demo or personal-use fonts in anything published; client sites never use demo or unlicensed fonts
- [ ] Form fields and cards stay visible on an off-white background: white "paper on paper", with a border
- [ ] Logo SVGs optimized (unused clip paths, editor metadata): one logo shrank 62%
- [ ] Open Graph image 1200×630
- [ ] **[DA]** Phone numbers in Danish format: "+45 21 87 55 57"

## Voice
- [ ] Agreed in the brief: who speaks (company "vi" / "we", or a person), and which pages differ
- [ ] A new one-person company: company voice everywhere, the person's page in third person, credentials instead of years-of-experience claims. Never invent certifications, experience, clients or numbers
