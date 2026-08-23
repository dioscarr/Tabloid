# Big News live feeds

Big News retrieves normalized live data through the private Brain API at `/api/v1/feed`.

## Current sources

- Hacker News official Firebase API: best stories, AI-filtered stories, and current job stories.
- GitHub REST repository search: recently created repositories ranked by stars.

The server caches normalized results for five minutes, applies request timeouts, reports provider health, and continues with partial results when one source is degraded. The browser never calls providers directly and always links readers to the original source.

Channels are `all`, `ai`, `github`, and `jobs`. Big News maps AI Radar to `ai`, GitHub Pulse to `github`, Career Moves to `jobs`, and the remaining editorial pages to `all`.

## Editorial policy

Feed titles, source names, timestamps, scores, and links are provider data. Brain Studio manages framing, labels, summaries, and site voice. Generated summaries must not be presented as source quotations.

## Future sources

Salary and labor-market data should come from a licensed or official dataset with stable identifiers and clear reuse terms. Add providers inside `services/brain/src/feed.js`; do not scrape presentation HTML from job boards or salary sites.
