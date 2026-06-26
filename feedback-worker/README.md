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
gh auth token | npx wrangler secret put GITHUB_TOKEN   # set the secret (deploy first!)
npx wrangler tail                                # live logs
```

`wrangler secret put` deploys a new version, so the Worker must already exist — always
`deploy` before setting the secret the first time.

## Rotating the shared key

Change `SHARED_KEY` in `wrangler.toml` **and** the matching `SHARED_KEY` constant in
`public/scripts/review-comments.js`, then `wrangler deploy` and redeploy the site.
