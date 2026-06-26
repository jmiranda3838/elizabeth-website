/**
 * review-comments.js — "comment on anything" review overlay
 * ---------------------------------------------------------------------------
 * Lets a non-technical reviewer hover any element, click it, and leave a comment
 * that becomes a GitHub issue (via the elizabeth-feedback Cloudflare Worker).
 * She can also see every comment she's made and her prior comments on an element.
 *
 * INERT by default. Activates only in "review mode":
 *   ?review=on  -> turn on (remembered on the device)   ?review=off -> turn off
 * Deep link: ?fb=<cssSelector> scrolls to + highlights that element on load.
 *
 * Fully self-contained (injects its own <style> + DOM). Removable by deleting this
 * file, public/scripts/vendor/html2canvas.min.js, and the one <script> line in
 * BaseLayout.astro. Files in public/scripts are NOT processed by Vite, so the base
 * path is derived from this script's own URL (see BASE below).
 */
(function () {
  "use strict";

  /* ----------------------------- config ----------------------------- */
  var WORKER_URL = "https://elizabeth-feedback.divine-tooth-8e3e.workers.dev/comments";
  var SHARED_KEY = "46def8a8cd78db6fc1ef5682d7fb84464396719d445975f6";
  var H2C_PATH = "/scripts/vendor/html2canvas.min.js";
  var LS_FLAG = "ea_review";
  var LS_NAME = "ea_review_name";
  var MAX_SHOT_BYTES = 3500000;

  // Derive the base URL prefix (origin + base path) from this script's own src, so the
  // vendored html2canvas loads correctly under /elizabeth-website now and at / after launch.
  var SELF_SRC = (document.currentScript && document.currentScript.src) || "";
  if (!SELF_SRC) {
    var selfTag = document.querySelector('script[src*="scripts/review-comments.js"]');
    if (selfTag) SELF_SRC = selfTag.src;
  }
  var BASE = SELF_SRC.replace(/\/scripts\/review-comments\.js(?:[?#].*)?$/, "");
  function withBase(p) {
    return BASE + (p.charAt(0) === "/" ? p : "/" + p);
  }

  var REDUCED =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------- activation gate ----------------------------- */
  function resolveActive() {
    var r = null;
    try {
      r = new URLSearchParams(location.search).get("review");
    } catch (e) {}
    try {
      if (r === "off") {
        localStorage.removeItem(LS_FLAG);
        return false;
      }
      if (r === "on" || r === "1" || r === "true") {
        localStorage.setItem(LS_FLAG, "1");
        return true;
      }
      return localStorage.getItem(LS_FLAG) === "1";
    } catch (e) {
      // localStorage blocked -> fall back to the query param only
      return r === "on" || r === "1" || r === "true";
    }
  }

  if (!resolveActive()) return; // INERT: no DOM, no styles, no html2canvas fetch.

  /* ----------------------------- state ----------------------------- */
  var state = {
    commentMode: false,
    allComments: null, // array once fetched
    fetchError: false,
    currentEl: null,
    currentInfo: null,
    h2cPromise: null,
    lastFocus: null,
    rafPending: false,
    lastMoveEvent: null,
  };

  /* ----------------------------- small utils ----------------------------- */
  function el(sel, root) {
    return (root || document).querySelector(sel);
  }
  function clip(s, n) {
    s = (s == null ? "" : String(s)).replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  function esc(s) {
    return (s == null ? "" : String(s))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function djb2(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function isOwnUI(node) {
    return !!(node && node.closest && node.closest("#ea-review-root"));
  }
  // Only navigate to same-origin http(s) URLs — neutralizes any javascript:/cross-origin
  // value that could reach a deep link via the (public) backend.
  function safeNavUrl(u) {
    try {
      var x = new URL(u, location.origin);
      if ((x.protocol === "http:" || x.protocol === "https:") && x.origin === location.origin) {
        return x.href;
      }
    } catch (e) {}
    return null;
  }
  function relTime(iso) {
    if (!iso) return "";
    var t = Date.parse(iso);
    if (isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.round(diff / 60) + " min ago";
    if (diff < 86400) return Math.round(diff / 3600) + " hr ago";
    if (diff < 2592000) return Math.round(diff / 86400) + " days ago";
    try {
      return new Date(t).toLocaleDateString();
    } catch (e) {
      return "";
    }
  }

  /* ----------------------------- element identity ----------------------------- */
  function getCssPath(node) {
    if (!node || node.nodeType !== 1) return null;
    if (isOwnUI(node)) return null;
    if (node === document.body) return "body";
    var parts = [];
    var cur = node;
    while (cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement) {
      if (isOwnUI(cur)) return null;
      if (cur.id && /^[A-Za-z][\w-]*$/.test(cur.id)) {
        parts.unshift("#" + cur.id);
        return parts.join(" > ");
      }
      var tag = cur.tagName.toLowerCase();
      var i = 1;
      var sib = cur;
      while ((sib = sib.previousElementSibling)) {
        if (sib.tagName === cur.tagName) i++;
      }
      parts.unshift(tag + ":nth-of-type(" + i + ")");
      cur = cur.parentElement;
    }
    return parts.length ? parts.join(" > ") : "body";
  }

  function nearestHeadingText(node) {
    var sec = node.closest ? node.closest("section, article, header, footer, main, div") : null;
    var scope = sec || document;
    var h = scope.querySelector ? scope.querySelector("h1, h2, h3, h4") : null;
    return h ? clip(h.textContent, 40) : "";
  }

  function describeElement(node) {
    var tag = node.tagName ? node.tagName.toLowerCase() : "element";
    if (tag === "img") return "Image" + (node.alt ? ': "' + clip(node.alt, 40) + '"' : "");
    if (tag === "svg" || node.closest && node.closest("svg")) return "Illustration";
    if (tag === "a") return 'Link: "' + clip(node.textContent || node.getAttribute("aria-label"), 40) + '"';
    if (tag === "button" || node.getAttribute("role") === "button")
      return 'Button: "' + clip(node.textContent || node.getAttribute("aria-label"), 40) + '"';
    if (/^h[1-6]$/.test(tag)) return "Heading: \"" + clip(node.textContent, 60) + '"';
    if (tag === "li") return 'List item: "' + clip(node.textContent, 50) + '"';
    if (tag === "p" || (node.childElementCount === 0 && (node.textContent || "").trim())) {
      var txt = clip(node.textContent, 60);
      if (txt) return 'Text: "' + txt + '"';
    }
    var nh = nearestHeadingText(node);
    return nh ? 'Area under "' + nh + '"' : "Section (" + tag + ")";
  }

  function pageName() {
    var t = (document.title || "").split("|")[0].split("—")[0].trim();
    return t || location.pathname;
  }

  function infoFor(node) {
    var path = getCssPath(node) || "body";
    var pagePath = location.pathname;
    return {
      el: node,
      cssSelector: path,
      elementKey: djb2(pagePath + "|" + path),
      elementLabel: describeElement(node),
      elementText: clip(node.textContent, 240),
      page: pagePath,
      pageTitle: pageName(),
      deepLink: location.origin + location.pathname + "?review=on&fb=" + encodeURIComponent(path),
    };
  }

  /* ----------------------------- styles ----------------------------- */
  function injectStyles() {
    var css =
      "#ea-review-root{font-family:'Inter',system-ui,-apple-system,sans-serif;}" +
      "#ea-review-root *{box-sizing:border-box;}" +
      /* highlight box + label */
      "#ea-hl{position:fixed;pointer-events:none;z-index:2147483000;border:2px solid var(--warm-clay,#b5836a);" +
      "background:rgba(181,131,106,.14);border-radius:4px;display:none;transition:" +
      (REDUCED ? "none" : "all .06s ease") + ";}" +
      "#ea-hl.pulse{animation:ea-pulse 1.2s ease 2;}" +
      "@keyframes ea-pulse{0%,100%{box-shadow:0 0 0 0 rgba(181,131,106,.55);}50%{box-shadow:0 0 0 8px rgba(181,131,106,0);}}" +
      "#ea-label{position:fixed;pointer-events:none;z-index:2147483001;display:none;max-width:320px;" +
      "background:var(--espresso,#3a2e26);color:#fff;font-size:12px;line-height:1.3;padding:5px 9px;" +
      "border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.22);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
      /* bottom bar */
      "#ea-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483004;display:flex;align-items:center;gap:12px;" +
      "flex-wrap:wrap;padding:9px 14px;background:var(--warm-paper,#faf8f5);color:var(--espresso,#3a2e26);" +
      "border-top:1px solid rgba(58,46,38,.14);box-shadow:0 -4px 18px rgba(58,46,38,.10);}" +
      "#ea-bar .ea-brand{font-weight:600;letter-spacing:.01em;display:flex;align-items:center;gap:7px;}" +
      "#ea-bar .ea-dot{width:9px;height:9px;border-radius:50%;background:#bbb;display:inline-block;}" +
      "#ea-bar.on .ea-dot{background:var(--warm-clay,#b5836a);box-shadow:0 0 0 3px rgba(181,131,106,.25);}" +
      "#ea-bar .ea-hint{font-size:12.5px;color:var(--slate-olive,#6b6a5c);flex:1 1 200px;min-width:120px;}" +
      "#ea-bar .ea-spacer{flex:1 1 auto;}" +
      ".ea-btn{font:inherit;font-size:13.5px;cursor:pointer;border-radius:999px;padding:8px 15px;border:1px solid rgba(58,46,38,.22);" +
      "background:#fff;color:var(--espresso,#3a2e26);transition:" + (REDUCED ? "none" : "background .15s,border-color .15s,transform .05s") + ";}" +
      ".ea-btn:hover{background:#f3efe9;}" +
      ".ea-btn:active{transform:translateY(1px);}" +
      ".ea-btn.ea-toggle{background:#fff;}" +
      ".ea-btn.ea-toggle[aria-pressed='true']{background:var(--warm-clay,#b5836a);border-color:var(--warm-clay,#b5836a);color:#fff;}" +
      ".ea-btn.ea-primary{background:var(--sage,#7d8a6a);border-color:var(--sage,#7d8a6a);color:#fff;}" +
      ".ea-btn.ea-primary:hover{filter:brightness(1.05);}" +
      ".ea-btn:disabled{opacity:.6;cursor:default;}" +
      ".ea-link{font:inherit;font-size:12.5px;background:none;border:none;color:var(--slate-olive,#6b6a5c);text-decoration:underline;cursor:pointer;padding:4px;}" +
      /* panels */
      ".ea-panel{position:fixed;left:0;right:0;bottom:0;z-index:2147483006;background:var(--warm-paper,#faf8f5);color:var(--espresso,#3a2e26);" +
      "max-height:82vh;display:flex;flex-direction:column;border-top:1px solid rgba(58,46,38,.16);" +
      "box-shadow:0 -10px 40px rgba(58,46,38,.20);transform:translateY(110%);transition:" +
      (REDUCED ? "none" : "transform .28s cubic-bezier(.22,.61,.36,1)") + ";}" +
      ".ea-panel.open{transform:translateY(0);}" +
      ".ea-panel[hidden]{display:none;}" +
      ".ea-phead{display:flex;align-items:flex-start;gap:12px;padding:14px 16px 10px;border-bottom:1px solid rgba(58,46,38,.10);}" +
      ".ea-phead h2{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;font-weight:600;line-height:1.2;}" +
      ".ea-phead .ea-sub{font-size:12.5px;color:var(--slate-olive,#6b6a5c);margin-top:2px;}" +
      ".ea-x{margin-left:auto;flex:0 0 auto;}" +
      ".ea-pbody{padding:14px 16px 18px;overflow-y:auto;}" +
      ".ea-target{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid rgba(58,46,38,.12);" +
      "border-radius:10px;padding:10px;margin-bottom:14px;}" +
      ".ea-thumb{flex:0 0 auto;width:96px;height:72px;border-radius:7px;border:1px solid rgba(58,46,38,.14);" +
      "background:#f0ece6 center/cover no-repeat;display:flex;align-items:center;justify-content:center;overflow:hidden;}" +
      ".ea-thumb img{width:100%;height:100%;object-fit:cover;display:block;}" +
      ".ea-thumb .ea-spin{width:18px;height:18px;border:2px solid rgba(58,46,38,.25);border-top-color:var(--warm-clay,#b5836a);" +
      "border-radius:50%;animation:ea-rot .7s linear infinite;}" +
      ".ea-thumb .ea-na{font-size:10px;color:var(--slate-olive,#6b6a5c);text-align:center;padding:4px;}" +
      "@keyframes ea-rot{to{transform:rotate(360deg);}}" +
      ".ea-tinfo .ea-tlabel{font-weight:600;font-size:14px;}" +
      ".ea-tinfo .ea-ttext{font-size:12.5px;color:var(--slate-olive,#6b6a5c);margin-top:3px;max-height:48px;overflow:hidden;}" +
      ".ea-prev{margin:0 0 14px;}" +
      ".ea-prev h3,.ea-group h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--slate-olive,#6b6a5c);" +
      "margin:0 0 7px;font-weight:700;}" +
      ".ea-cmt{background:#fff;border:1px solid rgba(58,46,38,.12);border-radius:9px;padding:9px 11px;margin-bottom:8px;}" +
      ".ea-cmt .ea-ctext{font-size:13.5px;line-height:1.45;white-space:pre-wrap;}" +
      ".ea-cmt .ea-cmeta{font-size:11px;color:var(--slate-olive,#6b6a5c);margin-top:5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}" +
      ".ea-badge{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;}" +
      ".ea-badge.open{background:rgba(125,138,106,.18);color:#566348;}" +
      ".ea-badge.closed{background:rgba(181,131,106,.18);color:#8a5a40;}" +
      ".ea-row{width:100%;text-align:left;background:#fff;border:1px solid rgba(58,46,38,.12);border-radius:9px;" +
      "padding:9px 11px;margin-bottom:8px;cursor:pointer;font:inherit;}" +
      ".ea-row:hover{background:#f3efe9;}" +
      ".ea-row .ea-rlabel{font-weight:600;font-size:13px;}" +
      ".ea-row .ea-rtext{font-size:12.5px;color:var(--slate-olive,#6b6a5c);margin-top:3px;}" +
      ".ea-group{margin-bottom:16px;}" +
      ".ea-field{margin-top:4px;}" +
      ".ea-field label{display:block;font-size:12.5px;font-weight:600;margin-bottom:5px;}" +
      ".ea-ta{width:100%;min-height:84px;resize:vertical;font:inherit;font-size:14px;padding:10px 12px;border-radius:9px;" +
      "border:1px solid rgba(58,46,38,.28);background:#fff;color:inherit;}" +
      ".ea-ta:focus,.ea-name:focus{outline:2px solid var(--warm-clay,#b5836a);outline-offset:1px;border-color:transparent;}" +
      ".ea-name{font:inherit;font-size:13.5px;padding:8px 11px;border-radius:9px;border:1px solid rgba(58,46,38,.28);" +
      "background:#fff;color:inherit;max-width:240px;width:100%;}" +
      ".ea-actions{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap;}" +
      ".ea-status{font-size:13px;min-height:18px;}" +
      ".ea-status.ok{color:#566348;font-weight:600;}" +
      ".ea-status.err{color:#a23b2c;font-weight:600;}" +
      ".ea-empty{font-size:13px;color:var(--slate-olive,#6b6a5c);padding:6px 0;}" +
      /* toast */
      "#ea-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(10px);z-index:2147483010;" +
      "background:var(--espresso,#3a2e26);color:#fff;font-size:13px;padding:9px 16px;border-radius:999px;" +
      "box-shadow:0 6px 22px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:" +
      (REDUCED ? "none" : "opacity .2s,transform .2s") + ";max-width:84vw;text-align:center;}" +
      "#ea-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}" +
      "body.ea-comment-cursor, body.ea-comment-cursor *{cursor:crosshair !important;}" +
      "@media (max-width:600px){.ea-thumb{width:74px;height:56px;}#ea-bar .ea-hint{flex-basis:100%;order:5;}}";
    var style = document.createElement("style");
    style.id = "ea-review-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ----------------------------- UI build ----------------------------- */
  var root, bar, hl, labelPill, toastEl, panel, myPanel;

  function buildUI() {
    root = document.createElement("div");
    root.id = "ea-review-root";
    root.innerHTML =
      '<div id="ea-hl"></div>' +
      '<div id="ea-label"></div>' +
      '<div id="ea-toast" role="status" aria-live="polite"></div>' +
      // bottom bar
      '<div id="ea-bar">' +
      '  <span class="ea-brand"><span class="ea-dot"></span>✏️ Review mode</span>' +
      '  <button type="button" class="ea-btn ea-toggle" id="ea-toggle" aria-pressed="false">Comment mode: Off</button>' +
      '  <button type="button" class="ea-btn" id="ea-mine">My comments</button>' +
      '  <span class="ea-hint" id="ea-hint">Turn on comment mode, then click anything on the page to leave a note.</span>' +
      '  <span class="ea-spacer"></span>' +
      '  <button type="button" class="ea-link" id="ea-exit">Turn off review mode</button>' +
      "</div>" +
      // comment panel
      '<div class="ea-panel" id="ea-panel" role="dialog" aria-modal="false" aria-label="Leave a comment" hidden>' +
      '  <div class="ea-phead">' +
      '    <div><h2>Leave a comment</h2><div class="ea-sub" id="ea-psub"></div></div>' +
      '    <button type="button" class="ea-btn ea-x" id="ea-pclose">Close</button>' +
      "  </div>" +
      '  <div class="ea-pbody">' +
      '    <div class="ea-target">' +
      '      <div class="ea-thumb" id="ea-thumb"><div class="ea-spin"></div></div>' +
      '      <div class="ea-tinfo"><div class="ea-tlabel" id="ea-tlabel"></div><div class="ea-ttext" id="ea-ttext"></div></div>' +
      "    </div>" +
      '    <div class="ea-prev" id="ea-prev" hidden><h3>Your previous comments on this</h3><div id="ea-prevlist"></div></div>' +
      '    <div class="ea-field"><label for="ea-ta">What would you like to change or note?</label>' +
      '      <textarea class="ea-ta" id="ea-ta" placeholder="Type your comment here…"></textarea></div>' +
      '    <div class="ea-field" style="margin-top:10px;"><label for="ea-name">Your name (optional)</label>' +
      '      <input class="ea-name" id="ea-name" type="text" placeholder="e.g. Elizabeth" autocomplete="name"></div>' +
      '    <div class="ea-actions">' +
      '      <button type="button" class="ea-btn ea-primary" id="ea-submit">Submit comment</button>' +
      '      <button type="button" class="ea-btn" id="ea-cancel">Cancel</button>' +
      '      <span class="ea-status" id="ea-status" aria-live="polite"></span>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      // my comments panel
      '<div class="ea-panel" id="ea-mypanel" role="dialog" aria-modal="false" aria-label="My comments" hidden>' +
      '  <div class="ea-phead">' +
      '    <div><h2>My comments</h2><div class="ea-sub" id="ea-mysub"></div></div>' +
      '    <button type="button" class="ea-btn ea-x" id="ea-myclose">Close</button>' +
      "  </div>" +
      '  <div class="ea-pbody" id="ea-mybody"></div>' +
      "</div>";
    document.body.appendChild(root);

    bar = el("#ea-bar");
    hl = el("#ea-hl");
    labelPill = el("#ea-label");
    toastEl = el("#ea-toast");
    panel = el("#ea-panel");
    myPanel = el("#ea-mypanel");

    el("#ea-toggle").addEventListener("click", function () {
      setCommentMode(!state.commentMode);
    });
    el("#ea-mine").addEventListener("click", openMyComments);
    el("#ea-exit").addEventListener("click", function () {
      location.href = location.origin + location.pathname + "?review=off";
    });
    el("#ea-pclose").addEventListener("click", closePanel);
    el("#ea-cancel").addEventListener("click", closePanel);
    el("#ea-submit").addEventListener("click", submitComment);
    el("#ea-myclose").addEventListener("click", closeMyComments);

    // restore saved name
    try {
      var nm = localStorage.getItem(LS_NAME);
      if (nm) el("#ea-name").value = nm;
    } catch (e) {}
  }

  /* ----------------------------- comment mode + hover ----------------------------- */
  function setCommentMode(on) {
    state.commentMode = on;
    var t = el("#ea-toggle");
    t.setAttribute("aria-pressed", on ? "true" : "false");
    t.textContent = on ? "Comment mode: On" : "Comment mode: Off";
    bar.classList.toggle("on", on);
    document.body.classList.toggle("ea-comment-cursor", on);
    el("#ea-hint").textContent = on
      ? "Hover to highlight, then click anything to comment on it."
      : "Turn on comment mode, then click anything on the page to leave a note.";
    if (!on) hideHighlight();
  }

  function showHighlight(node, pulse) {
    var r = node.getBoundingClientRect();
    if (!r.width && !r.height) {
      hideHighlight();
      return;
    }
    hl.style.left = r.left + "px";
    hl.style.top = r.top + "px";
    hl.style.width = r.width + "px";
    hl.style.height = r.height + "px";
    hl.style.display = "block";
    if (pulse && !REDUCED) {
      hl.classList.remove("pulse");
      void hl.offsetWidth; // reflow to restart animation
      hl.classList.add("pulse");
    }
  }
  function hideHighlight() {
    hl.style.display = "none";
    labelPill.style.display = "none";
  }

  function onMove(e) {
    state.lastMoveEvent = e;
    if (state.rafPending) return;
    state.rafPending = true;
    requestAnimationFrame(function () {
      state.rafPending = false;
      var ev = state.lastMoveEvent;
      if (!ev || !state.commentMode) return;
      var node = ev.target;
      if (!node || isOwnUI(node) || node === document.body || node === document.documentElement) {
        hideHighlight();
        return;
      }
      showHighlight(node, false);
      var r = node.getBoundingClientRect();
      labelPill.textContent = describeElement(node);
      labelPill.style.display = "block";
      var lh = labelPill.getBoundingClientRect();
      var top = r.top - lh.height - 6;
      if (top < 4) top = r.bottom + 6;
      var left = Math.max(4, Math.min(r.left, window.innerWidth - lh.width - 6));
      labelPill.style.top = top + "px";
      labelPill.style.left = left + "px";
    });
  }

  function onCaptureClick(e) {
    if (!state.commentMode) return;
    if (isOwnUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    openPanel(e.target);
  }
  function onCaptureSubmit(e) {
    if (state.commentMode && !isOwnUI(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /* ----------------------------- screenshot ----------------------------- */
  function ensureH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (state.h2cPromise) return state.h2cPromise;
    state.h2cPromise = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = withBase(H2C_PATH);
      s.onload = function () {
        window.html2canvas ? res(window.html2canvas) : rej(new Error("h2c missing"));
      };
      s.onerror = function () {
        rej(new Error("h2c load failed"));
      };
      document.head.appendChild(s);
    });
    return state.h2cPromise;
  }

  function captureElement(node) {
    return ensureH2C()
      .then(function (h2c) {
        var rect = node.getBoundingClientRect();
        var scale = Math.min(1, 1000 / Math.max(rect.width, 1));
        var bg = "#faf8f5";
        try {
          var c = getComputedStyle(document.body).backgroundColor;
          if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") bg = c;
        } catch (e) {}
        var p = h2c(node, {
          scale: scale,
          backgroundColor: bg,
          useCORS: true,
          allowTaint: false,
          logging: false,
          ignoreElements: function (n) {
            return n.id === "ea-review-root" || (n.closest && !!n.closest("#ea-review-root"));
          },
        }).then(function (canvas) {
          return canvas.toDataURL("image/jpeg", 0.85);
        });
        var timeout = new Promise(function (_, rej) {
          setTimeout(function () {
            rej(new Error("timeout"));
          }, 7000);
        });
        return Promise.race([p, timeout]);
      })
      .then(function (dataUrl) {
        if (dataUrl) {
          var comma = dataUrl.indexOf(",");
          var b64len = comma >= 0 ? dataUrl.length - comma - 1 : dataUrl.length;
          if (b64len * 0.75 > MAX_SHOT_BYTES) return null; // exceeds worker cap -> drop, still submit
        }
        return dataUrl || null;
      })
      .catch(function () {
        return null;
      });
  }

  /* ----------------------------- comment panel ----------------------------- */
  function openPanel(node) {
    state.currentEl = node;
    var info = infoFor(node);
    state.currentInfo = info;
    state.currentShot = null;

    el("#ea-psub").textContent = info.pageTitle;
    el("#ea-tlabel").textContent = info.elementLabel;
    el("#ea-ttext").textContent = info.elementText ? "“" + info.elementText + "”" : "";
    el("#ea-status").textContent = "";
    el("#ea-status").className = "ea-status";
    el("#ea-ta").value = "";

    var thumb = el("#ea-thumb");
    thumb.innerHTML = '<div class="ea-spin"></div>';

    renderPrev(info.elementKey);

    showPanel(panel);
    hideHighlight();
    setTimeout(function () {
      el("#ea-ta").focus();
    }, REDUCED ? 0 : 200);

    // capture screenshot after the panel is up (so the highlight box is hidden)
    captureElement(node).then(function (dataUrl) {
      state.currentShot = dataUrl;
      if (state.currentEl !== node) return; // panel moved on
      if (dataUrl) {
        thumb.innerHTML = "";
        var img = document.createElement("img");
        img.alt = "Preview of the selected element";
        img.src = dataUrl;
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = '<div class="ea-na">No preview<br>(still saved)</div>';
      }
    });
  }

  function renderPrev(key) {
    var box = el("#ea-prev");
    var list = el("#ea-prevlist");
    var items = (state.allComments || []).filter(function (c) {
      return c.elementKey === key;
    });
    if (!items.length) {
      box.hidden = true;
      list.innerHTML = "";
      return;
    }
    box.hidden = false;
    list.innerHTML = items.map(commentCardHTML).join("");
  }

  function commentCardHTML(c) {
    var badge =
      c.state === "closed"
        ? '<span class="ea-badge closed">Addressed ✓</span>'
        : '<span class="ea-badge open">Open</span>';
    return (
      '<div class="ea-cmt"><div class="ea-ctext">' +
      esc(c.comment || "") +
      '</div><div class="ea-cmeta">' +
      badge +
      "<span>" +
      esc(relTime(c.createdAt)) +
      "</span>" +
      (c.reviewerName ? "<span>· " + esc(c.reviewerName) + "</span>" : "") +
      "</div></div>"
    );
  }

  function submitComment() {
    var info = state.currentInfo;
    if (!info) return;
    var text = el("#ea-ta").value.trim();
    var status = el("#ea-status");
    if (!text) {
      status.className = "ea-status err";
      status.textContent = "Please type a comment first.";
      el("#ea-ta").focus();
      return;
    }
    var name = el("#ea-name").value.trim();
    try {
      if (name) localStorage.setItem(LS_NAME, name);
    } catch (e) {}

    var btn = el("#ea-submit");
    btn.disabled = true;
    status.className = "ea-status";
    status.textContent = "Sending…";

    var payload = {
      page: info.page,
      pageTitle: info.pageTitle,
      cssSelector: info.cssSelector,
      elementKey: info.elementKey,
      elementLabel: info.elementLabel,
      elementText: info.elementText,
      comment: text,
      reviewerName: name || null,
      screenshotDataUrl: state.currentShot || null,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      timestamp: new Date().toISOString(),
      deepLink: info.deepLink,
    };

    postComment(payload)
      .then(function (res) {
        btn.disabled = false;
        if (!res || !res.ok || !res.comment) throw new Error("bad response");
        if (!state.allComments) state.allComments = [];
        state.allComments.unshift(res.comment);
        updateMineCount();
        renderPrev(info.elementKey);
        el("#ea-ta").value = "";
        status.className = "ea-status ok";
        status.textContent = "✓ Sent! Thank you — add another, or close.";
      })
      .catch(function () {
        btn.disabled = false;
        status.className = "ea-status err";
        status.innerHTML = "Couldn’t send. ";
        var retry = document.createElement("button");
        retry.className = "ea-link";
        retry.textContent = "Try again";
        retry.addEventListener("click", submitComment);
        status.appendChild(retry);
      });
  }

  /* ----------------------------- my comments ----------------------------- */
  function openMyComments() {
    showPanel(myPanel);
    var body = el("#ea-mybody");
    if (state.allComments === null) {
      body.innerHTML = '<div class="ea-empty">Loading your comments…</div>';
      fetchAll().then(renderMine);
    } else {
      renderMine();
    }
  }

  function renderMine() {
    var body = el("#ea-mybody");
    var sub = el("#ea-mysub");
    if (state.fetchError) {
      body.innerHTML = '<div class="ea-empty">Couldn’t load your comments right now. Please try again in a moment.</div>';
      sub.textContent = "";
      return;
    }
    var all = state.allComments || [];
    sub.textContent = all.length === 1 ? "1 comment" : all.length + " comments";
    if (!all.length) {
      body.innerHTML =
        '<div class="ea-empty">No comments yet. Turn on comment mode and click anything on the page to leave your first note.</div>';
      return;
    }
    var groups = {};
    var order = [];
    all.forEach(function (c) {
      var k = c.pageTitle || c.page || "Other";
      if (!groups[k]) {
        groups[k] = [];
        order.push(k);
      }
      groups[k].push(c);
    });
    var html = order
      .map(function (k) {
        var rows = groups[k].map(rowHTML).join("");
        return '<div class="ea-group"><h3>' + esc(k) + "</h3>" + rows + "</div>";
      })
      .join("");
    body.innerHTML = html;
    // wire rows
    var rowsEls = body.querySelectorAll(".ea-row");
    for (var i = 0; i < rowsEls.length; i++) {
      rowsEls[i].addEventListener("click", function () {
        var safe = safeNavUrl(this.getAttribute("data-link"));
        if (safe) location.href = safe;
      });
    }
  }

  function rowHTML(c) {
    var badge =
      c.state === "closed"
        ? '<span class="ea-badge closed">Addressed ✓</span>'
        : '<span class="ea-badge open">Open</span>';
    return (
      '<button type="button" class="ea-row" data-link="' +
      esc(c.deepLink || "") +
      '"><div class="ea-rlabel">' +
      esc(c.elementLabel || "Element") +
      "</div><div class=\"ea-rtext\">" +
      esc(clip(c.comment, 90)) +
      '</div><div class="ea-cmeta" style="margin-top:5px;">' +
      badge +
      "<span>" +
      esc(relTime(c.createdAt)) +
      "</span></div></button>"
    );
  }

  function updateMineCount() {
    var n = (state.allComments || []).length;
    el("#ea-mine").textContent = n ? "My comments (" + n + ")" : "My comments";
  }

  /* ----------------------------- panel show/hide + a11y ----------------------------- */
  function showPanel(p) {
    // close the other panel if open
    [panel, myPanel].forEach(function (q) {
      if (q && q !== p && !q.hidden) hidePanel(q);
    });
    state.lastFocus = document.activeElement;
    p.hidden = false;
    void p.offsetWidth;
    p.classList.add("open");
    document.addEventListener("keydown", onPanelKey, true);
  }
  function hidePanel(p) {
    p.classList.remove("open");
    if (REDUCED) {
      p.hidden = true;
    } else {
      setTimeout(function () {
        if (!p.classList.contains("open")) p.hidden = true;
      }, 280);
    }
  }
  function anyPanelOpen() {
    return (panel && !panel.hidden) || (myPanel && !myPanel.hidden);
  }
  function closePanel() {
    hidePanel(panel);
    afterClose();
  }
  function closeMyComments() {
    hidePanel(myPanel);
    afterClose();
  }
  function afterClose() {
    document.removeEventListener("keydown", onPanelKey, true);
    if (state.lastFocus && state.lastFocus.focus) {
      try {
        state.lastFocus.focus();
      } catch (e) {}
    }
  }
  function onPanelKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!panel.hidden) closePanel();
      else if (!myPanel.hidden) closeMyComments();
      return;
    }
    if (e.key === "Tab") {
      var p = !panel.hidden ? panel : !myPanel.hidden ? myPanel : null;
      if (!p) return;
      var f = p.querySelectorAll(
        'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
      );
      f = Array.prototype.filter.call(f, function (n) {
        return !n.disabled && n.offsetParent !== null;
      });
      if (!f.length) return;
      var first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ----------------------------- toast ----------------------------- */
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 3200);
  }

  /* ----------------------------- backend ----------------------------- */
  function fetchAll() {
    return fetch(WORKER_URL, { headers: { "X-Feedback-Key": SHARED_KEY } })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (d) {
        state.allComments = (d && d.comments) || [];
        state.fetchError = false;
        updateMineCount();
      })
      .catch(function () {
        state.allComments = state.allComments || [];
        state.fetchError = true;
      });
  }
  function postComment(payload) {
    return fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Feedback-Key": SHARED_KEY },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  /* ----------------------------- deep link ----------------------------- */
  function handleDeepLink() {
    var sel = null;
    try {
      sel = new URLSearchParams(location.search).get("fb");
    } catch (e) {}
    if (!sel) return;
    var node = null;
    try {
      node = document.querySelector(sel);
    } catch (e) {}
    if (!node) {
      toast("That spot has moved since the comment was made.");
      return;
    }
    node.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    setTimeout(function () {
      showHighlight(node, true);
      toast("Here’s the spot from your comment.");
      setTimeout(hideHighlight, 4000);
    }, REDUCED ? 0 : 450);
  }

  /* ----------------------------- bootstrap ----------------------------- */
  function start() {
    injectStyles();
    buildUI();
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("click", onCaptureClick, true);
    document.addEventListener("submit", onCaptureSubmit, true);
    window.addEventListener(
      "scroll",
      function () {
        if (state.commentMode) hideHighlight();
      },
      { passive: true }
    );
    fetchAll().then(handleDeepLink);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
