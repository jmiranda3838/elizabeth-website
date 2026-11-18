# feedback-worker

Cloudflare Worker that powers the site's **review/comment overlay** (`public/scripts/review-comments.js`).
It receives a comment + element metadata + screenshot from the browser and:

1. commits the screenshot (base64) to the `feedback-assets` branch as `screenshots/<uuid>.jpg`
   (that branch is never deployed, so this does not rebuild the site), and
2. creates a GitHub **issue** labelled `site-feedback` with the comment, the screenshot, and a
   machine-readable metadata block.

It also lists those issues back (`GET /comments`) so the overlay can show a reviewer their full
history and prior comments on a given element.

The GitHub token lives only here, as a Worker secret — never in the public client.

## Endpoints

- `OPTIONS /comments` — CORS preflight
- `POST /comments` — create a comment (see `src/index.js` for the request/response shape)
- `GET  /comments` — `{ ok, comments: [...] }` (open + closed issues)

## Config

Non-secret config is in `wrangler.toml` under `[vars]` (owner/repo/branch/label/allowed origins/
shared key/limits). The shared key is best-effort obfuscation only — it ships in the public client
JS; real protection is the Origin allow-list + rate limit.

## Deploy / operate

```bash
cd feedback-worker
npx wrangler deploy                              # creates/updates the Worker, prints the URL
npx wrangler secret put GITHUB_TOKEN             # paste the scoped token (deploy first!)
npx wrangler tail                                # live logs
```

`wrangler secret put` deploys a new version, so the Worker must already exist — always
`deploy` before setting the secret the first time.

## The GitHub token

Use a **fine-grained personal access token** scoped to the `elizabeth-website` repo only, with
Contents: read/write and Issues: read/write, and an expiry (renew it when it lapses). Never use
`gh auth token`: that token reaches every repo on the account.

## Rotating the shared key

Change `SHARED_KEY` in `wrangler.toml` **and** the matching `SHARED_KEY` constant in
`public/scripts/review-comments.js`, then `wrangler deploy` and redeploy the site.

## Triage

Reviewer comments arrive as open issues labelled `site-feedback`
(`gh issue list --label site-feedback`). Each body has the comment, the element, the page, a
deep link (`?review=on&fb=<selector>`), the screenshot, and a `<!-- feedback-meta -->` JSON block
(`cssSelector`, `elementText`, `page`, `viewport`). Closing an issue shows the reviewer "Addressed ✓".

## Removing the overlay entirely

Delete `public/scripts/review-comments.js`, `public/scripts/vendor/html2canvas.min.js`, the
`review-comments.js` `<script>` line in `src/layouts/BaseLayout.astro`, this `feedback-worker/`
directory (and the deployed Worker: `npx wrangler delete`), the `feedback-assets` branch, and the
`site-feedback` label. Then remove `review-comments.js` from CLAUDE.md (`npm run check:docs` will
remind you).
