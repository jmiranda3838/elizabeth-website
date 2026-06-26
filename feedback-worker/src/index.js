/**
 * elizabeth-feedback — Cloudflare Worker
 *
 * Turns review-overlay submissions from the (static, public) GitHub Pages site into GitHub
 * issues, and lists them back. Holds the GitHub token as a secret so it never touches client
 * code.
 *
 * Routes (single path `/comments`):
 *   OPTIONS              -> CORS preflight
 *   POST   /comments     -> commit screenshot to feedback-assets branch + create issue
 *   GET    /comments     -> list all `site-feedback` issues (open + closed) as comments[]
 *
 * Secret: GITHUB_TOKEN  (set via `gh auth token | wrangler secret put GITHUB_TOKEN`)
 */

const GH_API = "https://api.github.com";

export default {
  async fetch(request, env) {
    const origin = pickOrigin(request, env);
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/comments" && url.pathname !== "/") {
      return json({ ok: false, error: "not found" }, 404, cors);
    }

    try {
      if (request.method === "GET") return await listComments(request, env, cors);
      if (request.method === "POST") return await createComment(request, env, cors, origin);
      return json({ ok: false, error: "method not allowed" }, 405, cors);
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 500, cors);
    }
  },
};

/* ----------------------------- CORS ----------------------------- */

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// Returns the request's Origin if it's allowed, else the first configured origin (so the
// CORS header is always a concrete value). Security checks use isAllowed() separately.
function pickOrigin(request, env) {
  const list = allowedOrigins(env);
  const reqOrigin = request.headers.get("Origin") || "";
  if (reqOrigin && list.indexOf(reqOrigin) !== -1) return reqOrigin;
  return list[0] || "null";
}

// Shared gate for POST and GET: allowed origin/referer + shared key.
function gate(request, env, cors) {
  if (!isAllowed(request, env)) return json({ ok: false, error: "forbidden origin" }, 403, cors);
  if ((request.headers.get("X-Feedback-Key") || "") !== env.SHARED_KEY) {
    return json({ ok: false, error: "bad key" }, 403, cors);
  }
  return null;
}

function isAllowed(request, env) {
  const list = allowedOrigins(env);
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";
  if (origin && list.indexOf(origin) !== -1) return true;
  // Fall back to Referer prefix (some browsers omit Origin on same-site GETs).
  for (let i = 0; i < list.length; i++) {
    if (referer && referer.indexOf(list[i]) === 0) return true;
  }
  return false;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Feedback-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/* ----------------------------- GitHub helpers ----------------------------- */

function ghHeaders(env, extra) {
  return Object.assign(
    {
      Authorization: "Bearer " + env.GITHUB_TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "elizabeth-website-feedback-worker",
    },
    extra || {}
  );
}

function trim(s, n) {
  s = (s == null ? "" : String(s)).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ----------------------------- POST /comments ----------------------------- */

async function createComment(request, env, cors, origin) {
  // 1) security gate
  var blocked = gate(request, env, cors);
  if (blocked) return blocked;

  // 2) rate limit (best-effort; guarded in case the binding is absent)
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const rl = await env.RATE_LIMITER.limit({ key: ip });
    if (rl && rl.success === false) {
      return json({ ok: false, error: "rate limited — please wait a moment" }, 429, cors);
    }
  }

  // 3) parse + validate
  let b;
  try {
    b = await request.json();
  } catch (e) {
    return json({ ok: false, error: "invalid JSON" }, 400, cors);
  }
  if (!b || typeof b.comment !== "string" || !b.comment.trim()) {
    return json({ ok: false, error: "missing comment" }, 400, cors);
  }
  if (b.comment.length > Number(env.MAX_COMMENT_CHARS || 5000)) {
    return json({ ok: false, error: "comment too long" }, 413, cors);
  }

  // 4) optional screenshot -> commit to feedback-assets branch
  let rawUrl = null;
  if (b.screenshotDataUrl) {
    const m = /^data:image\/(jpe?g|png);base64,(.+)$/i.exec(b.screenshotDataUrl);
    if (!m) return json({ ok: false, error: "bad screenshot format" }, 400, cors);
    const ext = m[1].toLowerCase().indexOf("p") === 0 ? "png" : "jpg";
    const base64 = m[2];
    if (base64.length * 0.75 > Number(env.MAX_SCREENSHOT_BYTES || 3500000)) {
      // too big — drop the screenshot but still record the comment
      rawUrl = null;
    } else {
      const id = crypto.randomUUID();
      const path = "screenshots/" + id + "." + ext;
      const putRes = await fetch(
        GH_API + "/repos/" + env.GH_OWNER + "/" + env.GH_REPO + "/contents/" + path,
        {
          method: "PUT",
          headers: ghHeaders(env, { "Content-Type": "application/json" }),
          body: JSON.stringify({
            message: "feedback screenshot " + id,
            content: base64,
            branch: env.ASSETS_BRANCH,
          }),
        }
      );
      if (putRes.ok) {
        rawUrl =
          "https://raw.githubusercontent.com/" +
          env.GH_OWNER +
          "/" +
          env.GH_REPO +
          "/" +
          env.ASSETS_BRANCH +
          "/" +
          path;
      }
      // If the image upload fails we still proceed without it (comment is what matters).
    }
  }

  // 5) build + create issue
  const meta = {
    v: 1,
    comment: b.comment,
    elementKey: b.elementKey || null,
    page: b.page || null,
    pageTitle: b.pageTitle || null,
    cssSelector: b.cssSelector || null,
    elementLabel: b.elementLabel || null,
    elementText: b.elementText || null,
    reviewerName: b.reviewerName || null,
    viewport: b.viewport || null,
    timestamp: b.timestamp || null,
    deepLink: b.deepLink || null,
    screenshot: rawUrl,
  };
  const title =
    "[Feedback] " + trim(b.pageTitle || "Site", 60) + " — " + trim(b.elementLabel || "element", 40);

  const issRes = await fetch(GH_API + "/repos/" + env.GH_OWNER + "/" + env.GH_REPO + "/issues", {
    method: "POST",
    headers: ghHeaders(env, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      title,
      body: buildIssueBody(b, rawUrl, meta),
      labels: [env.FEEDBACK_LABEL],
    }),
  });
  if (!issRes.ok) {
    return json({ ok: false, error: "issue create failed", status: issRes.status }, 502, cors);
  }
  const issue = await issRes.json();

  return json(
    {
      ok: true,
      comment: {
        issueNumber: issue.number,
        url: issue.html_url,
        state: "open",
        page: meta.page,
        pageTitle: meta.pageTitle,
        cssSelector: meta.cssSelector,
        elementKey: meta.elementKey,
        elementLabel: meta.elementLabel,
        comment: meta.comment,
        reviewerName: meta.reviewerName,
        deepLink: meta.deepLink,
        createdAt: issue.created_at,
        screenshot: rawUrl,
      },
    },
    201,
    cors
  );
}

function buildIssueBody(b, rawUrl, meta) {
  const lines = [
    "**Comment:** " + b.comment,
    "",
    "**Element:** `" + (b.elementLabel || "element") + "`  ·  **Page:** " + (b.pageTitle || ""),
  ];
  if (b.reviewerName) lines.push("**Reviewer:** " + b.reviewerName);
  if (b.timestamp || (b.viewport && b.viewport.w)) {
    lines.push(
      "**When:** " +
        (b.timestamp || "") +
        (b.viewport && b.viewport.w ? "  ·  **Viewport:** " + b.viewport.w + "×" + b.viewport.h : "")
    );
  }
  if (b.deepLink) lines.push("**Open on the site:** " + b.deepLink);
  lines.push("");
  lines.push(rawUrl ? "![screenshot](" + rawUrl + ")" : "_(no screenshot captured)_");
  lines.push("");
  lines.push("<!-- feedback-meta -->");
  lines.push("```json");
  lines.push(JSON.stringify(meta, null, 2));
  lines.push("```");
  return lines.join("\n");
}

/* ----------------------------- GET /comments ----------------------------- */

async function listComments(request, env, cors) {
  var blocked = gate(request, env, cors);
  if (blocked) return blocked;
  const out = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      GH_API +
        "/repos/" +
        env.GH_OWNER +
        "/" +
        env.GH_REPO +
        "/issues?labels=" +
        encodeURIComponent(env.FEEDBACK_LABEL) +
        "&state=all&per_page=100&page=" +
        page,
      { headers: ghHeaders(env) }
    );
    if (!res.ok) {
      return json({ ok: false, error: "list failed", status: res.status }, 502, cors);
    }
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (it.pull_request) continue; // /issues also returns PRs
      const meta = parseMeta(it.body) || {};
      out.push({
        issueNumber: it.number,
        url: it.html_url,
        state: it.state,
        page: meta.page || null,
        pageTitle: meta.pageTitle || it.title || null,
        cssSelector: meta.cssSelector || null,
        elementKey: meta.elementKey || null,
        elementLabel: meta.elementLabel || null,
        elementText: meta.elementText || null,
        comment: meta.comment != null ? meta.comment : null,
        reviewerName: meta.reviewerName || null,
        deepLink: meta.deepLink || null,
        createdAt: it.created_at,
        screenshot: meta.screenshot || null,
      });
    }
    if (arr.length < 100) break;
    page++;
    if (page > 20) break; // hard safety stop
  }
  return json({ ok: true, comments: out }, 200, cors);
}

function parseMeta(body) {
  if (!body) return null;
  // Anchor to the sentinel we emit, so a comment containing its own ```json fence
  // can't forge the metadata block.
  var m = /<!-- feedback-meta -->\s*```json\s*([\s\S]*?)```/.exec(body);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch (e) {
    return null;
  }
}
