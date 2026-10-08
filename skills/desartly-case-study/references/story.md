# Evidence and a human voice

The live `cms_editorial_standard` is authoritative for budgets and project facts. Current defaults: summary 12–26 words; challenge/outcome 15–40 each; heading 3–9; narrative paragraph 25–65. These budgets keep the work readable, not formulaic. Use unnumbered, descriptive sentence-case headings; native `chapter`, `statement` or `note` layouts inherit shared typography. Do not embed narrative font overrides.

## Evidence ledger

Keep this privately in the working folder, never as unverified public filler:

| Class | Example | Permitted language |
|---|---|---|
| Owner-confirmed | A commissioned pitch, not a release | State the scope accurately |
| Visible artifact | Fuel status sits beside the machine name | Describe the implemented hierarchy |
| Design inference | Consistent reading order may support scanning | Frame as intent, not tested performance |
| External fact | A sourced technical constraint | Verify with an authoritative source; attribute |
| Unknown | Launch, research sample, sales uplift | Omit or ask if essential |

Do not turn a rendering into proof of production, a prototype into a shipped product, a benchmark into the owner's research, or a hypothetical persona into an interview. Preserve accurate commissioning: a real client pitch is not automatically an independent concept. Use `sample:true` only for actual concepts. Synthetic demo data must be labeled and never reported as measured project results. Real metrics need baseline, method, sample/timeframe and provenance; include limitations.

## Narrative decisions

Let the strongest asset and central tension determine the opening. Explain why a choice fits the task, then point to its visible expression. Keep each paragraph adjacent to the relevant UI, identity detail or execution. A reliable small unit is **constraint → choice → visible consequence**; use it where useful, not as repeated sentence syntax.

Prefer “The equipment cards keep field, state and fuel in the same order” to “An innovative platform transforms agricultural workflows.” Prefer “The wordmark's narrow proportions leave space for variant names” to “A timeless identity captures the essence of the brand.” Neither example proves users were faster or customers bought more.

Remove unsupported superlatives, vague strategy jargon, “not just … but …”, repeated three-part slogans, identical paragraph cadence and canned conclusions. Do not manufacture personal anecdotes, quotes, typos or emotions to sound human. First person is appropriate for a confirmed role or design choice; otherwise describe the work directly. Keep specialized terms only when they clarify a decision. Public copy should read as a designer explaining actual work to an intelligent client.

## Visual rhythm

Plan a short sequence using actual assets: reveal → concise context → detailed evidence → application or interaction → reflection. Vary full-width media, complementary pairs, asymmetric grids and close details as supported by aspect ratios. Three compositions are useful when sufficient assets exist; a small project should stay small. Never leave a blank template or duplicate content to satisfy a pattern. Keep labels, image roles and alt text meaningful. Preserve readable UI and typography rather than aggressively filling frames.

Store verified benchmarks in `references: [{url, checkedAt, takeaway}]`; reference what was observed and how it informed this presentation. An accessed old project can be a valid reference; access date is not its publication date. Do not call the work recent without evidence. Favor source project pages over search snippets and agency homepages.

## Required bilingual social caption

Read `cms_editorial_standard.announcement` alongside the editorial rules already fetched; no separate research pass is needed. Deliver all three as strings in `announcement: {fa, en, hashtags}` on every case study unless explicitly excluded by the owner:

- `fa`: conversational Persian in Ali’s first-person voice, four short paragraphs: the actual design experience/scope; brand and audience; concrete design choices; invitation to message for a tailored collaboration proposal. Adapt the service named in the invitation to this project’s discipline. Preserve paragraph spacing. A personal experience must be grounded in confirmed work; do not invent emotions, anecdotes or client feedback.
- `en`: natural English conveying the same four paragraphs, scope and claims; edit for English fluency rather than translating mechanically.
- `hashtags`: relevant project, discipline and industry tags, one hashtag per line. Use meaningful terms supported by this work; no unrelated trend tags or invented claims. Keep these as social tags, never new CMS industry labels.

Save the fields with the project via `cms_save`, preserving unrelated fields and existing private notes. Verify the freshly read saved values are nonempty and the Social caption checklist is 3/3. Missing captions are incomplete delivery; local preflight checks presence, while manual review checks voice, bilingual meaning and evidence. Keep captions out of public narrative blocks. Their copy stays private in the CMS; project publication does not authorize messaging or social distribution.
