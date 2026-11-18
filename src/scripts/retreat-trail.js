// Retreat page (retreat.astro): the dotted trail and the hero's red-rock parallax.
//
// Trail: builds one smooth path through every visible [data-trail-point] inside
// .retreat-page (sorted top to bottom, vertical tangents at each point so it reads
// as a winding footpath), then reveals it through a mask as you scroll, with the
// tip leading just below the middle of the viewport. Cairns the tip has passed get
// .is-reached. Points hidden by CSS (display: none) are skipped, so the route
// changes per breakpoint without any width logic here.
//
// Parallax: the hero's strata (.mesa-far … .mesa-near) and the low sun drift at
// different rates while the hero is on screen.
//
// Reduced motion: the whole trail is drawn at once, every cairn is reached, and
// nothing in the hero moves. Without JS the CSS fallback line shows instead.

export function initRetreatTrail() {
  const page = document.querySelector(".retreat-page");
  const svg = page?.querySelector(".trail-svg");
  if (!page || !svg) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = svg.querySelector(".trail-reveal");
  if (!reveal) return;
  const drawn = svg.querySelectorAll(".trail-bed, .trail-dots");

  let total = 0;
  let lut = []; // [{ len, y }] sampled along the path, y increasing
  let cairns = []; // [{ stop, len }]
  let current = 0;
  let target = 0;
  let raf = 0;

  // Layout position of an element's centre within .retreat-page, ignoring
  // transforms (so .reveal's pre-reveal offset never bends the path).
  const centreIn = (el) => {
    let x = el.offsetWidth / 2;
    let y = el.offsetHeight / 2;
    let node = el;
    while (node && node !== page) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return node === page ? { x, y } : null;
  };

  // Catmull-Rom through the waypoints, as cubic Béziers. Control points are
  // clamped between their segment's ends vertically, so the trail never doubles
  // back up the page.
  const buildPath = (pts) => {
    if (pts.length < 2) return "";
    const f = (n) => n.toFixed(1);
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = Math.min(p1.y + (p2.y - p0.y) / 6, p2.y);
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = Math.max(p2.y - (p3.y - p1.y) / 6, p1.y);
      d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
    }
    return d;
  };

  const lengthAtY = (y) => {
    if (!lut.length || y <= lut[0].y) return 0;
    if (y >= lut[lut.length - 1].y) return total;
    let lo = 0;
    let hi = lut.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lut[mid].y < y) lo = mid;
      else hi = mid;
    }
    const a = lut[lo];
    const b = lut[hi];
    const f = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
    return a.len + (b.len - a.len) * f;
  };

  // Prayer flags (retreat.astro) the trail would touch are hidden, so the path runs
  // through a gap in the string at every width. Flag boxes come from
  // getBoundingClientRect (they are rotated SVG), shifted by the gap between their
  // hang's layout position and its rendered one, which undoes .reveal's offset.
  const flags = [...page.querySelectorAll("[data-flag]")];
  const flagHang = page.querySelector(".flagline-hang");
  const clearFlags = () => {
    flags.forEach((f) => f.classList.remove("is-cleared"));
    if (!flags.length || !flagHang) return;
    const pageBox = page.getBoundingClientRect();
    const hangBox = flagHang.getBoundingClientRect();
    const hangAt = centreIn(flagHang);
    if (!hangAt) return;
    const dx = hangAt.x - (hangBox.left + hangBox.width / 2 - pageBox.left);
    const dy = hangAt.y - (hangBox.top + hangBox.height / 2 - pageBox.top);
    const pad = 9;
    for (const f of flags) {
      const b = f.getBoundingClientRect();
      if (b.right < pageBox.left || b.left > pageBox.right) continue;
      const left = b.left - pageBox.left + dx - pad;
      const right = b.right - pageBox.left + dx + pad;
      const top = b.top - pageBox.top + dy - pad;
      const bottom = b.bottom - pageBox.top + dy + pad;
      const end = lengthAtY(bottom);
      for (let len = lengthAtY(top); len <= end; len += 3) {
        const p = reveal.getPointAtLength(len);
        if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) {
          f.classList.add("is-cleared");
          break;
        }
      }
    }
  };

  const paint = () => {
    const off = Math.max(0, total - current);
    reveal.style.strokeDashoffset = `${off}`;
    for (const c of cairns) c.stop.classList.toggle("is-reached", current >= c.len - 6);
  };

  const layout = () => {
    const w = page.offsetWidth;
    const h = page.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", `${w}`);
    svg.setAttribute("height", `${h}`);

    const els = [...page.querySelectorAll("[data-trail-point]")].filter(
      (el) => el.offsetParent !== null,
    );
    const pts = els
      .map((el) => ({ el, ...centreIn(el) }))
      .filter((p) => Number.isFinite(p.y))
      .sort((a, b) => a.y - b.y);

    const d = buildPath(pts);
    reveal.setAttribute("d", d);
    drawn.forEach((p) => p.setAttribute("d", d));

    if (!d) {
      total = 0;
      lut = [];
      cairns = [];
      flags.forEach((f) => f.classList.remove("is-cleared"));
      page.classList.remove("trail-live");
      return;
    }

    total = reveal.getTotalLength();
    reveal.style.strokeDasharray = `${total} ${total}`;
    lut = [];
    const step = 6;
    let maxY = -Infinity;
    for (let len = 0; len <= total; len += step) {
      const p = reveal.getPointAtLength(len);
      maxY = Math.max(maxY, p.y); // keep y monotonic for the lookup
      lut.push({ len, y: maxY });
    }
    lut.push({ len: total, y: Math.max(maxY, pts[pts.length - 1].y) });

    cairns = pts
      .filter((p) => p.el.hasAttribute("data-trail-cairn"))
      .map((p) => ({ stop: p.el.closest(".trail-stop"), len: lengthAtY(p.y) }))
      .filter((c) => c.stop);

    clearFlags();
    page.classList.add("trail-live");
    if (reduced) current = total;
    update(true);
  };

  const tick = () => {
    raf = 0;
    const diff = target - current;
    current = Math.abs(diff) < 0.5 ? target : current + diff * 0.14;
    paint();
    if (current !== target) raf = requestAnimationFrame(tick);
  };

  // Hero parallax: strata drift at different rates; the sun settles fastest.
  const hero = page.querySelector(".retreat-hero");
  const layers = hero
    ? [
        [hero.querySelector(".mesa-sun"), 0.26],
        [hero.querySelector(".mesa-far"), 0.17],
        [hero.querySelector(".mesa-buttes"), 0.11],
        [hero.querySelector(".mesa-bell"), 0.06],
        [hero.querySelector(".mesa-near"), 0.025],
      ].filter(([el]) => el)
    : [];

  const parallax = () => {
    if (reduced || !hero) return;
    const s = Math.min(window.scrollY, hero.offsetHeight);
    for (const [el, rate] of layers) el.style.transform = `translateY(${(s * rate).toFixed(1)}px)`;
  };

  function update(immediate = false) {
    parallax();
    if (!total) return;
    if (reduced) {
      current = target = total;
      paint();
      return;
    }
    const top = page.getBoundingClientRect().top;
    target = lengthAtY(window.innerHeight * 0.66 - top);
    if (immediate) {
      current = target;
      paint();
    } else if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  }

  let resizeTimer = 0;
  const relayout = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 120);
  };

  window.addEventListener("scroll", () => update(), { passive: true });
  window.addEventListener("resize", relayout);
  window.addEventListener("load", layout);
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(page);
  if (document.fonts?.ready) document.fonts.ready.then(layout);
  layout();
}
