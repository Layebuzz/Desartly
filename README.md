# Desartly — Ali Komeili

An English portfolio with a white, editorial design, an introduction carousel, a three-column project selection, editable practice stats, selected collaboration logos, a lightweight Journal and a private modular editor.

## Run

```sh
npm install
npm run dev -- --port 5174
npm test
npm run build
```

The current local preview runs at `http://127.0.0.1:5174/`. Use `npm run preview` for the production bundle with the same local owner-auth middleware.

## Owner access and contextual URLs

The public site has no Edit Mode navigation link. Add a suffix to a page URL:

- `/edit` — edit the home page copy.
- `/work/visual-identity/edit` — edit that particular case study.
- `/about/edit` — edit that page’s heading.
- `/certificates/edit` — manage certificates and verification links.
- `/journal/edit` — edit Journal settings and notes.
- `/journal/new` — create a new Journal note after owner authentication.
- `/work/new?category=branding` — create a new draft in Branding.
- `/about/new` — create a draft post associated with the About page.
- `/work/visual-identity/new` — create a related draft beneath that case study.

`/new` creates a draft only after owner authentication. It opens the new post’s editor without publishing it. Update preview to show it. Page-associated posts appear in the “From the studio” section of their originating page and in the Work index.

The local owner password is the `OWNER_PASSWORD` value in `.env.local`. This private file is excluded from Git and has owner-only filesystem permissions. No password is embedded in the browser bundle. Enter it at `/login`; successful sign-in returns you to the requested editing URL.

Owner sessions are verified by the server, HMAC-signed, expire after eight hours, and use an HttpOnly SameSite=Strict cookie (Secure on HTTPS). Login rejects cross-origin requests, bounds request bodies and is rate-limited. Missing server secrets disable owner login. Sign out is available inside the workspace.

## Design

The homepage presents an introduction carousel and three discipline-based selections with square images. Slides rotate every five seconds with a play/pause control. Rotation pauses on hover, focus and hidden tabs; reduced-motion users start paused. Controls support buttons, keyboard arrows and horizontal touch gestures. Featured projects selected in the Page editor supply the carousel visuals and the project row. A connected practice section leads directly to category filters, followed by editable collaboration logos, a four-metric proof band with count-up animation and two Journal notes. Hire me and Start a project open the matching inquiry forms. There is no separate Lab page.

The public experience uses HTML, CSS and small transform-based hover effects. Editor drag-and-drop motion is loaded only when needed. Responsive layouts stack on mobile and respect reduced-motion preferences. Sample entries remain labelled as concepts until replaced with actual work.

## Workspace

- Select homepage featured projects in the Page tab.
- Edit homepage counters and collaboration logos in the Page tab. Each metric supports a value, label and supporting detail; starter totals are clearly marked for replacement, and logos can be shown, hidden, linked and replaced with an SVG or raster upload.
- Edit navigation labels, destinations and order in the Site tab. Add or remove links without exposing Edit mode on the public site.
- Write Journal notes in the Journal tab with a cover image, text blocks and image blocks. The public Journal is intentionally small and editorial rather than a full CMS.
- Filter the public Journal with its topic sidebar; topic counts update from the notes collection and collapse into scrollable pills on mobile.
- Add categories and posts; category counts and contact-service choices update dynamically.
- Add, duplicate, delete and reorder case-study sections. Drag reordering uses spring-driven motion; up/down buttons support keyboard interaction.
- Add sandboxed HTML sample sections for UX prototypes. The source and module title can be edited in the page canvas, and the rendered sample is isolated in an iframe.
- In homepage and page editing, the canvas is the editing surface: click highlighted headings, copy, card titles and navigation labels directly, then use Update preview to persist the change. The editor keeps a sticky tab map, an explicit editing context and a live-canvas hint so the settings panel stays easy to scan.
- Twenty image compositions share one geometry definition with their SVG picker icons.
- Uploaded images become WebP with a maximum dimension of 1,800px; project covers are square.
- Certificates have a dedicated navigation page and workspace tab for titles, issuers, dates, images and verification URLs.
- Hiring and client inquiries have distinct fields. The hiring path asks about role, employment type, work arrangement, location and compensation. The project path asks about discipline, scope, budget and timeline.

## Architecture and persistence

`src/main.jsx` contains routes, shared content rendering and workspace components. `src/EditorMotion.jsx` contains the lazily loaded drag-and-drop components. `src/layouts.js` defines both image layouts and their miniature previews. `src/data.js` contains defaults, local persistence and image conversion. `src/OwnerAccess.jsx` handles the owner sign-in UI and authenticated route gate. Homepage section order, navigation, stats, clients and Journal notes are persisted as separate content collections so the owner can update one part without rebuilding the rest of the site.

`server/owner-auth.js` implements the shared authentication logic. `server/vite-owner.js` adapts it to local Vite development/preview. `server/worker.js` protects editing routes before serving Cloudflare assets.

Content and inquiries remain a local prototype: post drafts, visible preview content, page copy, taxonomy and certificates use browser storage. No inquiry is sent. Backblaze B2 and D1 are not yet connected. Authentication is server-backed; content editing is still browser-local. No verified employment or certificate claims have been invented.

## Cloudflare and GitHub

`wrangler.jsonc` targets the `portfolio` Worker with its static assets, a Worker-first authentication layer, and a login rate-limit binding. Set `OWNER_PASSWORD` and `OWNER_SESSION_SECRET` as Cloudflare secrets before enabling owner access online. Use a unique rate-limit namespace for the account.

Connect the desired GitHub repository to Workers Builds, choose `main`, set the build command to `npm run build` and deploy command to `npx wrangler deploy`. Use this folder as the build root. The intended address remains `https://portfolio.layebuzz.workers.dev`, subject to the account’s workers.dev configuration.

No GitHub remote or live Cloudflare deployment has been created. Production still needs D1/B2 content persistence, server-side upload validation and WebP processing, inquiry delivery, draft visibility controls and full revision history.

## Validation

Automated tests cover composition slot counts/bounds/overlaps, link validation, category slugs, owner authentication, tampered sessions, cross-origin rejection, protected-route redirects, rate limiting and body-size bounds. A local integration check verifies the owner-login endpoint and protected contextual routes without logging credentials.

Run `npm test` and `npm run build` after changes. Public editing links are absent; editing URLs redirect unauthenticated visitors to owner sign-in.

The color system uses charcoal #202632, blue #3475ef, violet #8255db and rose #ff678c on white and cool neutral surfaces. The type tokens follow Material Design’s named hierarchy (display, headline, title, body and label) while retaining Pol’s tighter editorial tracking. Reference: [Material Design typography](https://m2.material.io/design/typography/the-type-system.html). The introduction carousel uses square corners.

## September 19 editor revision

The editor opens with the full-width page canvas. The optional editor map floats above the canvas; page-level controls remain directly beside their content. Homepage sections and selected cards use animated drag handles, with arrow controls for section ordering. Menu labels are edited inline, and each menu item has destination, removal and ordering controls. About, Resume, Services and Contact now render their actual page components inside the editor. Plain-text copy overrides are shared with the public renderer through `VisualCopy.jsx`. Standard page modules support text, image and HTML additions.

Both project and Journal HTML modules accept `.html` files (up to 2 MB) and editable source. Previews use a sandbox with scripts allowed but without same-origin access. Journal blocks can be dragged, moved with buttons and removed. Six additional sample notes are merged once into existing browser content, preserving existing notes; a fresh portfolio has eleven notes total. The Journal has a topic sidebar and a search field.

`refinement.css` implements the revised typography and layout. Typography uses Material's Display, Headline, Title, Body and Label roles, adapted to the existing Manrope face: https://github.com/material-components/material-web/blob/main/docs/theming/typography.md . The blog's simple two-column cards and topic sidebar were reviewed against https://www.raminpahlavan.com/blog/ . No reference content was copied.

Browser verification covered square homepage/project heroes at 1440, 768 and 390 px, absence of horizontal overflow on those public pages, saved copy/navigation/section order after reload, HTML upload and sandbox interaction after publication to the local preview, actual About editor rendering, topic plus search filtering, and scroll-triggered counters with reduced-motion support. Unit tests remain green. Content persistence and publication are still local to the browser, not cloud storage.

## Desartly release

The footer supports inline text, links, addition, removal and ordering. Client logos support sanitized vector SVG uploads, square grayscale tiles and viewport-triggered row reveals. Empty client slots are only shown in the owner editor.

Important: editor content currently persists in browser localStorage. Publishing a preview does not synchronize content between devices or update the deployed site for other visitors. The server content API requires database/storage configuration and frontend integration before cloud CMS publishing is available.

## Hosting

- Production: https://desartly.layebuzz.workers.dev
- Private repository: https://github.com/Layebuzz/Desartly (main)
- Deploy: `npm run build && npx wrangler deploy`
- Owner secrets are stored as Cloudflare Worker secrets; they are never committed.
- Deployment is currently manual; pushing main does not yet trigger a Cloudflare build.

## Studio navigation and writing

Open Editor map for Pages, Collections, Home sections and Site controls. The fixed **Save changes** button (Cmd/Ctrl+S) stores edits on this device; **Update preview** applies content to its local preview. A dirty indicator and unload warning identify unsaved edits.

Journal supports Markdown blocks, .md imports and three starter templates with split writing/preview. Raw HTML is not executed by the Markdown renderer. The separate sandboxed HTML prototype module remains available.

Settings contains browser title, description and favicon (currently local-browser settings). Owner password changes are server-side: current password and an authenticated session are required; a salted PBKDF2 hash is kept in the DESARTLY_AUTH KV namespace. Existing sessions are revoked when the updated credential version propagates through KV. KV replication can delay this across locations. Local development uses an ignored owner-only file in .pol-data. The original OWNER_PASSWORD secret is only the bootstrap credential once a stored password exists. Password recovery requires resetting the stored record through an authenticated administrator tool.
