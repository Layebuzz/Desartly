# AFC Qatar case study

Database content, not an application import. `node content/afc-qatar/build.mjs` merges the three standalone HTML studies into `project.json`. This JSON is appended to both published and draft project arrays, with revision guards and a pre-publication backup. Existing portfolio content is preserved.

Only `afc-qatar` is added to the public project allowlist. `ClientProfile` accepts an optional label so Flightio is correctly identified as the project intermediary. No HTML, project JSON or new UI library is included in the browser JavaScript bundle. Fonts and WebP/AVIF media are loaded as assets by the relevant project view.

## Content and provenance

- AFC and Flightio logos: supplied by the portfolio owner.
- Stadium image: AI-generated illustrative campaign artwork using the built-in image tool; not a documentary tournament photo.
- Cover: browser-rendered HTML composition over that artwork.
- Wireframe: reconstructed SVG design study, not claimed as original research evidence.
- Fixtures, categories and prices: illustrative prototype data. No purchases, reservations, live availability or conversion results.
- User-provided visual reference: https://dribbble.com/shots/26778623-Football-team-page. Its page title and palette were accessible; the original artwork did not load during this session. No reference artwork is reproduced.
- Fonts: Barlow Condensed, Caveat and Manrope from Google Fonts, with their OFL notices alongside the hosted font assets.

Image prompt: Premium photorealistic football campaign background for AFC Asian Cup Qatar. Night-time Gulf stadium, deep burgundy and near-black, silver floodlights, a maroon-kit football player seen from behind on the right entering a green pitch, packed crowd and curved roof. Dark negative space on the left for typography. Editorial sports photography, no text, logos or UI.

## Verification

Existing automated tests and production build pass. Browser checks cover the desktop and 390px mobile layout, team filters, dialog preview, stand selection, guest count and total, saved-team state, and embedded iframe sizing. The HTML respects reduced-motion preferences and uses native buttons/dialog keyboard behavior.
