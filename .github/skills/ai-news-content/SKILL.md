---
name: ai-news-content
description: "Use when updating AI News live feeds, editorial topics, page headlines, hero media, or shared content adapters. Keeps current stories source-linked, page-specific, resilient when APIs fail, and consistent across all AI News sections."
---

# AI News Content

Use this skill for changes to live news, homepage editorial content, section-page signals, or shared content behavior.

## Source Contract

- Use `src/live-news.js` as the shared live-news boundary.
- Prefer multiple focused Hacker News Algolia queries over one broad query.
- Keep the `created_at_i` 48-hour freshness filter unless the product requirement changes.
- Normalize stories into the shared shape: `title`, `summary`, `source`, `sourceBadge`, `sourceTone`, `timeLabel`, `category`, and `url`.
- Keep every live story source-linked. Never invent a source, author, timestamp, or current event.
- Deduplicate by `objectID` or canonical URL before rendering.

## Page Reuse

- Add or adjust page topics in `LIVE_NEWS_TOPICS`; do not duplicate fetch logic in page renderers.
- Keep homepage and section pages on the same `fetchLiveNews()` path.
- Preserve existing editorial fallbacks so the page remains useful if a public API is unavailable, rate-limited, or blocked by CORS.
- Preserve `mountSharedNav()` and the content adapter contract on every page.

## Media

- Hero media may change with the live lead story, but image captions and alt text must describe the selected image.
- Do not imply that a stock image depicts the reported event unless the source confirms it.
- Use stable dimensions and keep image loading failure from hiding the headline or source link.

## Validation

Run these checks after content changes:

```sh
npm run build
npm run check:shared-nav
git diff --check
```

For small, low-risk tasks, use a lightweight subagent to inspect or validate one narrow concern. Reserve the primary model for decisions spanning multiple files, source quality, API behavior, accessibility, or release readiness.
