# Desartly

English design portfolio, private visual editor, case studies and Journal.

## Develop

```sh
npm install
npm run dev -- --port 5174
npm test
npm run build
```

## Editing and publication

Append `/edit` to a page URL to edit its canvas, or `/new` to start a post. Authentication is required. The public navigation has no editor link.

**Save changes** (Cmd/Ctrl+S) saves a private cloud draft. **Publish website** makes the current content available to visitors. Stale concurrent drafts are rejected rather than silently overwritten. Browser storage retains a local backup; it is not the production content database.

The editor includes inline copy, navigation and footer controls, section ordering, project templates, metrics, collaboration logos, certificates and Journal blocks. Markdown imports and templates support article writing. HTML prototypes run in an isolated sandbox without same-origin permission.

## Architecture

- React and Vite; Manrope typography, white surfaces and blue/violet/rose accents.
- Cloudflare Worker handles protected editor routes and content APIs.
- D1 stores draft/published content, media metadata and three publication snapshots. A size guard protects the current single-row content store.
- Parspack S3 stores media under `desartly/` in the configured bucket. Studio image uploads are resized for their role (cover 1600px, logo 1000px, full-width 2400px and grid slots 1200–2400px on the longest side) and converted to WebP before upload. SVG logos remain vector and pass server validation.
- `src/cloud.js` loads public content or authenticated drafts and handles cloud saves/uploads.
- `server/content-api.js` enforces owner access, request origin and draft versions.
- Owner credentials use Worker secrets; password changes use salted PBKDF2 hashes in KV. Never commit `.env.local` or secret values.

## Deployment

- Website: https://desartly.layebuzz.workers.dev
- Private repository: https://github.com/Layebuzz/Desartly
- Branch: `main`
- Deploy: `npm run build` then `npx wrangler deploy`
- Deployment is manual; a push to main does not currently trigger a build.

Bindings are declared in `wrangler.jsonc`. Required secrets: `OWNER_PASSWORD`, `OWNER_SESSION_SECRET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`. Configure `S3_ENDPOINT`, `S3_BUCKET` and `S3_REGION` for Parspack. Uploads and reads use S3 exclusively; missing configuration fails without a fallback provider. No secret values are stored in this repository.

Contact delivery still requires its production rate-limit/Turnstile configuration and frontend integration. Do not present a local form preview as delivered mail. Starter projects are concepts; real client logos, verified outcomes and experience totals must be supplied by the owner.

## Validation

`npm test` covers authentication, protected routes, origin checks, layout geometry, link validation, private drafts, publication and stale-write conflicts. `npm run build` validates the production bundle. Responsive browser checks cover square heroes and horizontal overflow at desktop, tablet and mobile sizes.

## Portfolio and credential update

Contact uses a square black primary action. About and Resume share the About page; legacy `/resume` redirects to `/about#resume`. Certificate cards use four columns on desktop, two on tablet and one on phones; their accessible native dialog includes a description, verification link and optional Top 10% of class badge. The badge defaults off and must reflect a real distinction.

Projects have independent `coverImage` (cards/home feature) and `heroImage` (case-study opening). The cover is used as a fallback only when the main image is absent. Recommended cover/main assets are 2400×2400 px; full-width content is 2400 px wide and grid images at least 1200 px wide. Studio uploads never upscale or crop originals and use WebP quality 84, including incoming WebP files. Each image and grid slot has its own Replace control and reports actual dimensions. The project editor now shares the public case-study container width.

### Native booking and Google Calendar

Apply `server/migrations/0002_calendar.sql` to D1. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Worker secrets; the OAuth web client must allow `https://studio.desartly.info/api/studio/calendar/callback`. `GOOGLE_REDIRECT_URI` can override that callback. Calendar API must be enabled. Connect the owner's account from Studio → Calendar and grant both requested calendar scopes. Use a production OAuth configuration for a durable owner connection; testing-mode consent has Google's expiration limits.

Studio → Calendar controls Tehran working days/hours, notice, days off and meeting buffers, and lists private website briefs. Owner cancellation and rescheduling update the existing Google event and notify attendees. Public availability reveals slots only. A stable request/event ID and atomic D1 holds prevent duplicate website reservations; uncertain responses can be retried with the same ID. This does not make an external Google Calendar edit atomic with a website booking.

Unfinished briefs and uncertain booking attempts stay in session storage for up to 24 hours and are cleared after confirmation. Google tokens are encrypted in KV using the owner session secret; rotating that secret requires reconnecting Google Calendar. Never put OAuth secrets in frontend environment variables or committed files.

### Owner booking emails

Apply `server/migrations/0003_booking_email.sql`. Enable Gmail API in the same Google Cloud project. Studio → Calendar → Connect booking emails requests only `gmail.send` and basic OpenID email identity, separately from Calendar access. The verified account must be `komeilipv@gmail.com`; both sender and recipient are fixed to that address. Refresh tokens are encrypted using the existing owner session secret.

After each successful booking (including recovered retries), the Worker immediately processes owner emails using waitUntil. Connecting Gmail also processes existing upcoming reservations. A cron scan every minute provides a backup. It sends the brief, Tehran time and Meet link; attendee invitations still use Calendar. Mail acceptance is recorded in D1 independently of reservation success. Repeated scans atomically claim each message. Auth/rate-limit rejections retry with backoff (5 attempts); uncertain responses are recorded for manual review rather than risking an automatic duplicate. Gmail acceptance is not an inbox delivery receipt. Failed/uncertain states are shown in Studio.

Booking emails include an inline-styled, table-based Desartly HTML design and a plain-text alternative. Untrusted brief fields are escaped and Meet links restricted to HTTPS meet.google.com. Studio’s Send queued emails processes unsent reservations immediately without resending accepted mail.

Website bookings are confirmed immediately without manual owner approval. The organizer is not invited again for ordinary guest bookings. For owner self-bookings, a separate RSVP update after insertion prevents Google from resetting the owner to needsAction; guest RSVP remains independent. Each confirmed booking writes its pending email to D1 before responding, then processes delivery in waitUntil.


### Live interface components and deployment storage
Interface overviews, controls and responsive details must be rendered as native `html` blocks, not cropped screenshots. Upload a complete self-contained HTML document; set `componentSelector` to a CSS selector to show only the chosen component while retaining its scripts and hidden dependencies. Omit it to show the complete interface. Set `previewWidth: 390` for a responsive phone demonstration; `autoHeight: true` avoids nested scrolling. Preview each selector and interact with its controls before publishing. Keep raster images for artwork, branding, communication assets and covers. `staticImage` is a PDF fallback only, never the web interface. All three disciplines share cms_create → cms_upload → cms_get → cms_save → cms_review → cms_publish. Updating case content through the CMS does not require a frontend deployment.

Production builds use `node scripts/build-surfaces.mjs`; Vite `build.copyPublicDir` is disabled for Studio. The build rejects duplicated legacy media directories under studio-app. Existing public URLs remain compatible through the verified ParsPack manifest; source files remain in Git, and build copies are excluded after verification. Deployment Storage includes retained deployments; output reduction affects new builds, not previously retained versions. Review retention separately; do not delete protected/current deployments or upgrade automatically.

### ParsPack static media migration
All legacy public files under projects/, journal/, images/, presentation/ and brand/ are content-addressed in the existing ParsPack S3 bucket. Existing URLs are preserved by exact Vercel rewrites and the Worker manifest; CMS media continues to use /api/media. Only manifest-listed public objects can be read. Migration writes require the existing owner session, same-origin POST, the exact byte count and SHA-256; no bucket credentials reach the browser. Fonts have public CORS headers. PDF/download byte ranges are supported. Large migration uploads use bounded 256 KiB chunks under a private staging prefix, then assemble and verify the complete SHA-256 before exposing the final object; temporary chunks are discarded after successful assembly.

`server/static-assets.json` describes immutable objects and `server/static-migration.json` records completed download-and-checksum verification. `scripts/prune-migrated-static.mjs` checks source hashes and this receipt before removing **build copies**; source files stay in Git for recovery. A changed legacy file fails the build until re-migrated. New project material belongs in CMS storage, never public/. To migrate a legacy update: regenerate the manifest with scripts/prepare-static-manifest.mjs, deploy the Worker handler, POST original bytes through /api/studio/static-assets?asset=<manifest path>, download /api/static?asset=<path> and verify every SHA-256, run `node scripts/migrate-static-assets.mjs <temporary-owner-session-file>` to authorize file-scoped direct S3 transfers through the Worker API (bypassing app-host payload limits), resume progress and record complete round-trip checksums, then run the surface build and publish. The manifest preparation also updates exact Vercel routes. Do not remove build copies before verification. Application JS/CSS and HTML shells stay on the app host.

Live HTML components use the shared image corner token and a visible “Responsive component” marker outside the sandbox.

Direct migration authorization is owner-only, same-origin and no-store. It returns a scoped GET signature for verifying one manifest-listed static object. Writes use bounded owner uploads and complete payload SHA-256 validation. Long-lived storage secrets never leave the Worker. The bounded staging API is available as a fallback; discard staged chunks in a separate owner request after checksum verification to stay within subrequest budgets.
