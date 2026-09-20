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
- Backblaze B2 stores media under `desartly/` in the existing private bucket. Browser image uploads are resized to 1800px maximum and converted to WebP before upload. SVG logos remain vector and pass server validation.
- `src/cloud.js` loads public content or authenticated drafts and handles cloud saves/uploads.
- `server/content-api.js` enforces owner access, request origin and draft versions.
- Owner credentials use Worker secrets; password changes use salted PBKDF2 hashes in KV. Never commit `.env.local` or secret values.

## Deployment

- Website: https://desartly.layebuzz.workers.dev
- Private repository: https://github.com/Layebuzz/Desartly
- Branch: `main`
- Deploy: `npm run build` then `npx wrangler deploy`
- Deployment is manual; a push to main does not currently trigger a build.

Bindings are declared in `wrangler.jsonc`. Required secrets: `OWNER_PASSWORD`, `OWNER_SESSION_SECRET`, `B2_KEY_ID`, `B2_APP_KEY`. The bucket ID is nonsecret configuration. B2 secrets are installed in the production Worker. A live test verified WebP upload, byte-exact retrieval for the owner and denied guest access to unpublished media. Credentials are restricted to the `desartly/` prefix; no secret values are stored in this repository.

Contact delivery still requires its production rate-limit/Turnstile configuration and frontend integration. Do not present a local form preview as delivered mail. Starter projects are concepts; real client logos, verified outcomes and experience totals must be supplied by the owner.

## Validation

`npm test` covers authentication, protected routes, origin checks, layout geometry, link validation, private drafts, publication and stale-write conflicts. `npm run build` validates the production bundle. Responsive browser checks cover square heroes and horizontal overflow at desktop, tablet and mobile sizes.
