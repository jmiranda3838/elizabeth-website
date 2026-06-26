# feedback-assets

This branch holds **only** the screenshots captured by the site review/comment overlay
(the Cloudflare Worker in `feedback-worker/` on `main` commits review screenshots here as
`screenshots/<uuid>.jpg`).

It is intentionally **not deployed** — GitHub Pages builds only from `main`, so commits to this
branch never trigger a site rebuild. Safe to leave as-is.
