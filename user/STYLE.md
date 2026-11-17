# Style: Joah's craft principles

A living file. It describes the feel I aim for and the craft I bring to every site. Read it at the brainstorm, in Explore and at the screenshot checkpoint. It shapes design choices; it is not a checklist to be graded against. `/retro` proposes updates after each project, through the same promotion ladder as the rest of the template.

**My own work** follows all of it. **Client work** gets the craft (scale contrast, motion, polish), with the client's own palette and type.

## The feeling
Warm, clean and minimal, but never empty. Satisfying to use.

## The material
An analogue, tactile layer over a clean structure. The structure carries the information, the texture carries the feeling. For my own work: subtle film grain, and a CRT curve on images in motion. Film stays a texture, never a theme: no film strips, reels or countdowns.

## Proven: shipped in both my portfolios
- One huge word in an expanded display face, with quiet text around it
- A mono voice for labels and metadata
- Hairline rules and small uppercase navigation
- These are deliberate choices. `frontend-design` lists cream grounds, hairlines and mono labels among common AI defaults, so make them carry information (a hairline that separates real sections, a label that says something true), never decoration.

## Direction I'm moving in
- My own work: warm grounds and one hot accent, never pure white. A warm near-black as the default, with a warm paper light mode, each with its own hot accent. The palette itself is chosen in each project's Explore
- Confident grotesques next to an expanded display face

## Scale contrast
One huge thing, then quiet. Lots of air, but something always holds the page.

## Motion
- Responds to me: scroll, drag and pointer
- Pinned, scrubbed GSAP scrollytelling is home turf
- Smooth scroll that feels physical, not floaty
- Every effect has a reduced-motion version

## Polish in the small interactions
Hover, focus, the menu opening, how an image arrives. The small moments are where "satisfying" lives.

## Fonts
Licensed for how they're used. Demo fonts are for sketches only; my own published site needs a proper licence.

## References
Sites with this feeling are in the template's `references.md`, marked "Joah's style".

## Craft defaults (from the portfolio redesign, 2026-11)
Principles proven in that project, to start from on the next. The numbers are chosen or measured in each project's Explore and live in its own docs (the portfolio's: `docs/design/values.md` in joahbrandrup-portfolio).

### Motion: one physical language
- A damped spring for anything that answers a hand (a huge word, drag give, an end stretch, hover and focus): it settles, never stops dead, never wobbles for long. Measure it on a reference you like rather than guessing
- Smooth scroll on desktop only; off on touch and with reduced motion
- A sine in-out ease for scrubbed and travelling things; a soft ease-out for things that open in answer to you
- Drag and fling carry inertia that settles in about a second and a half
- Distortion (fringing, bend, grain) grows with speed and is clean at rest
- A short fade is the reduced-motion version of every transition

### Type
- A fluid scale from 320 px to desktop (`clamp()`), with a display step that fills the width between the gutters
- Body lines at most about 68 characters; mono labels small, uppercase and tracked
- Size a huge word from its measured advance width: font size = the width between the gutters / the word's width in em. Measure it in the build, and again if the letters are split into spans (kerning changes)

### Grid
- A fluid gutter; 12 columns on desktop, 6 on tablets, 4 on phones
- Text in at most 7 desktop columns
- The huge word may break the grid and the edge of the screen
- Sections separated by space, not boxes

### What "satisfying" means, concretely
- Things answer you, and only you: nothing moves on its own except the grain
- Every answer settles on the spring: never stops dead, never wobbles for long
- Your speed shows (fringing, a reel's spin, the grain rising) and fades when you stop
- Opening something grows out of where you touched it
- The site never traps you: the wheel and the swipe always get you down the page
