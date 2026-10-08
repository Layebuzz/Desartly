---
name: desartly-article
description: Write or revise evidence-led, SEO-focused Persian or English articles for Desartly in Ali’s natural caption voice; prepare editable CMS articles and bilingual private social captions, and save or publish through existing API functions when requested. Use for Journal articles, not project case studies or website engineering.
metadata:
  author: Ali / Desartly
  version: "1.0.1"
---

# Desartly article

Write an article worth reading: a specific question, a defensible viewpoint, concrete examples and a useful consequence. Conversation defaults to Persian. Each article has one primary language, Persian or English; honor the requested language. If unspecified, use the brief’s language. Produce separate documents only when both versions are requested; translations should preserve meaning while matching each language’s search intent.

## A compact writing workflow

1. Resolve the topic, audience, primary language and requested action from the conversation. Ask only for missing information that materially changes the work. Inspect an existing article before revising; preserve accepted content and identifiers. Read the live `cms_schema` and `cms_editorial_standard` once when using the CMS.
2. Read [references/editorial.md](references/editorial.md). Use a small set of the owner’s confirmed captions as the voice reference when available through authorized CMS access or supplied text. Capture vocabulary, directness and cadence, not project-specific claims. Without samples, use warm, specific, conversational prose and disclose that voice matching is approximate; do not block drafting.
3. Read [references/seo.md](references/seo.md). Choose one reader intent and primary topic phrase. Research only what substantiates the article. Verify current, technical or uncertain claims using accessible primary sources, record exact URLs and dates, and distinguish evidence from design opinion. Do not invent search volumes, rankings, interview findings, quotes or personal experiences.
4. Outline briefly, write one coherent draft, then edit voice and SEO together. Let topic and evidence set length; do not pad to a word count. Lead with the article’s actual point, develop specific examples and end with a useful judgment or next action. Do not turn the article into a sales caption or a repetitive case-study template.
5. Prepare a specific title, excerpt, readable headings, tags, meaningful image alt/captions, source references and relevant verified internal links. Suggest search title/description and slug in the editorial handoff; map them only to fields supported by the live CMS schema, never silently invent SEO fields. Select existing media when useful; avoid default image generation.
6. Always prepare private `announcement.fa`, `announcement.en`, and `announcement.hashtags`: Persian caption in the owner’s natural voice, English equivalent and relevant hashtags one per line. They introduce this article’s actual argument and invite reading it. Do not mechanically impose the four-paragraph project/brand announcement structure on articles. Save all three with the article; verify 3/3.

Use the principles of human writing and evidence-backed SEO. If supporting skills are installed, load only the relevant sections of `human-writing`/`humanize`, and an SEO skill for an actual research or audit need. This skill is self-contained and does not require paid keyword tools, a full-site crawl, other skills or multiple agents. Never promise ranking gains or AI-detector outcomes. Cache rules and inspect only relevant excerpts; do not repeat broad searches or fetch the entire CMS library.

## Research and quality gates

Useful statistics and research are a required research objective, not decorative numbers. Read [references/research-quality.md](references/research-quality.md). Find relevant primary studies or datasets, assess their methods, then explain what their findings mean for this article’s reader. Include verified quantitative evidence when it materially helps; never force a statistic or invent data when none is defensible. Record the search gap explicitly if suitable evidence cannot be found.

Before delivery, check the live CMS completeness groups: Foundation 6/6, Story 4/4, Visuals & context 5/5, Distribution 5/5. Resolve omissions without fabricated relationships or filler. Independently review evidence quality, original contribution, the reader’s search intent and current Google Search Central guidance; 20/20 is field completeness, not Google approval or proof of excellent SEO. Report actual unresolved checks.

## CMS delivery

Read [references/cms.md](references/cms.md) when saving or publishing. Content writes use existing CMS API functions with `kind:"article"`, not Git, SQL, source edits or app deployment. Bare writing requests deliver a draft. A request to add/upload the article authorizes saving a CMS draft; publish only when the user requests publication, including a clear standing instruction. Save with the latest version, review and inspect the actual article before publication. Never treat a field-completeness score as editorial quality.

Verify language and reading direction, mobile readability, heading hierarchy, links, image loading and absence of empty sections. For publication, inspect at 390, 768 and 1440 px, then fresh-read the version and publish only this article. Verify the saved language, content and private captions; verify the actual public URL after publishing. Social posting is a separate action requiring authorization.

Report briefly in Persian: draft/live link or local deliverable, primary language, key editorial/SEO decisions and checks actually completed. If authentication or source verification is blocked, preserve the draft and state the precise gap without claiming publication.

Example: «با $desartly-article دربارهٔ نقش تایپوگرافی در اعتماد به برند، یک مقالهٔ فارسی برای طراح‌ها بنویس و به‌صورت پیش‌نویس در CMS ذخیره کن.»
