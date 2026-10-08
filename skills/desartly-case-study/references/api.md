# CMS connection and economical operations

Default Studio: `https://studio.desartly.info`; public site: `https://www.desartly.info`; Streamable HTTP MCP: `https://studio.desartly.info/mcp`. Prefer already connected `cms_*` tools. Otherwise use a privately supplied bearer token from Studio → AI connections, scoped `read`, `write`, and `publish` when needed. Never obtain credentials from unrelated accounts, print them, commit them or include them in this archive. If no authorized connection exists, prepare the case study locally and request the missing connection; do not claim publication.

## Optional helper (Node.js 20+, no packages)

The helper reads `DESARTLY_CMS_TOKEN` from the environment; `DESARTLY_CMS_ENDPOINT` can override the HTTPS MCP URL. Configure the token securely outside prompts and command output. Never place a literal secret in a command. Paths below are relative to this skill folder; working files belong in the active task's private `work/` folder. The helper deliberately prints small summaries and writes full responses to files. Read only selected fields from those files. It has no retries and does not auto-publish.

```sh
node scripts/cms.mjs inventory 'Projects/project-name' work/inventory.json
node scripts/cms.mjs call cms_schema '{}' work/schema.json
node scripts/cms.mjs call cms_get '{"kind":"project","id":"project-name"}' work/before.json
node scripts/cms.mjs call cms_project_template '{"discipline":"Branding"}' work/template.json
node scripts/cms.mjs preflight work/document.json work/schema.json
node scripts/cms.mjs call cms_save @work/save-arguments.json work/saved.json --write
node scripts/cms.mjs call cms_review '{"kind":"project","id":"project-name"}' work/review.json
node scripts/cms.mjs call cms_publish @work/publish-arguments.json work/published.json --publish
```

`--write` and `--publish` are execution safeguards, not user authorization. Follow the actual request. `preflight` checks structural emptiness and live enum values; it does not replace CMS review or human visual/fact checks.

## Folder and asset resolution

`cms_media_architecture` returns `allowedFolders`; `cms_media_list` returns asset records including `id`, `name`, `url`, `folder`, `type`, `alt`. The helper filters locally before showing anything. Full path match wins; a short name must identify one folder. Descendant folders belong to the selected inventory. If no media or several project candidates exist, inspect a small targeted set before creating anything.

Search `cms_list` by confirmed title and compare `cms_get` media references to the inventory. Folder paths may be moved or custom; `Projects/foo` does not prove `foo` is the intended document. Preserve existing URLs/ownership and stable slug. Reuse media by returned URL, not guessed storage paths. Build contact sheets locally from authorized media; then view full detail only where necessary. Do not read every PDF page or generate images by default.

For genuinely new assets, `cms_create` establishes `Projects/<slug>` before upload. Refresh allowed folders, then call `cms_upload` with `{name,mimeType,folder,alt,base64}`. Read file bytes in a script so base64 never enters model context or logs. On the Vercel path keep decoded uploads under 3 MB; raster images are optimized by the server. Use meaningful kebab-case filenames and returned URLs. Do not upload copies merely to reorganize library folders.

## Tool map and state invariants

| Operation | Tool and arguments |
|---|---|
| Rules / taxonomy | `cms_schema {}`, `cms_editorial_standard {}`, `cms_presentation_guide {discipline,industry}`, `cms_project_template {discipline}` |
| Research leads | `cms_benchmarks {query,group?,limit:3}`; these are unverified leads |
| Layouts | `cms_grid_presets {}` only when using grids |
| Find draft | `cms_list {kind:"project",query:title}` |
| Read current state | `cms_get {kind:"project",id}` → `{document,version,…}` |
| New private draft | `cms_create {kind:"project",document}` |
| Save private draft | `cms_save {kind:"project",id,version,document}` |
| Review | `cms_review {kind:"project",id}` |
| Publish one | `cms_publish {kind:"project",id,version}` |

MCP calls use JSON-RPC `tools/call` with `{name,arguments}`. HTTP success may contain `result.isError`; inspect it. Extract JSON from `result.structuredContent` or the text content block. The helper handles both. Authentication/permission failures require the correct connection/scope, not repeated retries. Network/write failures require rereading state before any retry. Never bypass via database or full-site endpoints.

Back up only the relevant document before editing. Save the entire merged document with its latest version, preserving fields outside the requested change. Do not reuse a stale version after a save or publication. If a timeout leaves creation uncertain, check whether the ID already exists; do not create a duplicate with a new slug. On a version conflict, compare the newer document and merge deliberately.

Local preflight → `cms_review` → actual responsive preview → fresh `cms_get` → `cms_publish` when authorized → public verification. Resolve actionable automated issues; an HTML manual-inspection reminder remains a reminder even after good content passes. Record manual evidence truthfully rather than assigning an invented score. Preview is available through the document's Studio editor; do not guess a private URL format. Public projects currently use `/work/<id>`; verify the actual link returned/rendered by the site.

For content work, do not edit frontend source, deploy the app, replace the whole site or change navigation. This skill's distribution link is maintained separately from ordinary case-study uploads.
