# AFC Qatar case study

Database content, not an application import. `node content/afc-qatar/build.mjs` merges two standalone HTML experiences into a ~50 KB project JSON. Guarded publication appends the project to draft and published arrays after backing up the database state. Other content is preserved.

AFC Qatar is the client; Flightio is credited as intermediary. The overview uses the shared portfolio card with a subtle burgundy tint. The cover contains only campaign artwork and the transparent AFC logo.

## Content and provenance

- Owner-supplied AFC and Flightio logos, transparent cutouts generated with the image tool.
- AI-generated sculpture campaign cover, Qatar-inspired architectural hero and graphite/burgundy wireframe image. Illustrative design assets, not documentary photography or original research evidence.
- Browser-composed cover with optimized AVIF/WebP variants.
- Instrument Serif and Manrope fonts, OFL notices in the asset folder.
- Illustrative fixtures, categories and prices. No live purchases, reservations or measured conversion claims.
- Reference direction: https://dribbble.com/shots/26778623-Football-team-page. No reference artwork is reproduced.

## Interaction and delivery

The two sandboxed HTML blocks follow the parent page scroll and report their content height. Scroll reveals, gentle parallax, magnetic controls, seat selection, animated totals and saved encounter state respect reduced motion. No nested scrollbars or new UI dependencies. Images and fonts are external project assets; HTML stays out of the JavaScript bundle.

Existing tests and production build pass. Browser verification covers desktop/mobile, client attribution, team filters, seat categories, guest count, totals, saved state and continuous iframe sizing.
