/**
 * Dynamic Constellation SVG Lines
 * Desktop: the star map below. Up to 768px wide: a single meandering trail
 * through the stars in markup order (constellation.css lays them out).
 */
(function () {
  "use strict";

  var map = document.querySelector(".constellation-map");
  var svg = document.querySelector(".constellation-lines");
  var stars = document.querySelectorAll(".constellation-star");

  if (!map || !svg || stars.length === 0) return;

  // One connected figure: a ring through six stars spanning the whole sky,
  // with Clarity and Joy trailing off opposite corners.
  // Indices match the markup order in index.astro:
  // 0 Clarity, 1 Self-Trust, 2 Connection, 3 Courage, 4 Rest,
  // 5 Belonging, 6 Growth, 7 Joy
  var connections = [
    [1, 2], // ring: Self-Trust -> Connection
    [2, 3], // ring: Connection -> Courage
    [3, 6], // ring: Courage -> Growth
    [6, 5], // ring: Growth -> Belonging
    [5, 4], // ring: Belonging -> Rest
    [4, 1], // ring: Rest -> Self-Trust
    [0, 1], // tail: Clarity -> Self-Trust (top-left)
    [6, 7], // tail: Growth -> Joy (bottom-right)
  ];

  // Phones and small tablets (constellation.css, max-width 768px) lay the same
  // stars down a vertical path, so there one curve links them in order
  // (see trailHtml).
  var pathQuery = window.matchMedia("(max-width: 768px)");

  // Stop lines short of each star so they rest at the glow's edge
  var STAR_GAP = 22;
  var LABEL_PAD = 6;

  // Distance along a ray (from a star's center) at which it exits the star's
  // own label box — so descending lines never strike through the label text.
  function labelExitDistance(center, ux, uy, rect) {
    var tEnter = -Infinity;
    var tExit = Infinity;

    // X slab
    if (ux === 0) {
      if (center.x < rect.left || center.x > rect.right) return 0;
    } else {
      var tx1 = (rect.left - center.x) / ux;
      var tx2 = (rect.right - center.x) / ux;
      tEnter = Math.max(tEnter, Math.min(tx1, tx2));
      tExit = Math.min(tExit, Math.max(tx1, tx2));
    }

    // Y slab
    if (uy === 0) {
      if (center.y < rect.top || center.y > rect.bottom) return 0;
    } else {
      var ty1 = (rect.top - center.y) / uy;
      var ty2 = (rect.bottom - center.y) / uy;
      tEnter = Math.max(tEnter, Math.min(ty1, ty2));
      tExit = Math.min(tExit, Math.max(ty1, ty2));
    }

    // Ray misses the box (or it's behind the start point)
    if (tEnter > tExit || tExit < 0) return 0;
    return tExit;
  }

  // --- Phone trail -----------------------------------------------------------
  // One smooth curve (Catmull-Rom through every star centre, in markup order),
  // drawn as one cubic per step so it reads as a single path passing behind
  // the stars. Each step is clipped where it leaves the star's glow and its
  // label, and where it reaches the next star's.
  function cubicAt(p, t) {
    var m = 1 - t;
    var a = m * m * m;
    var b = 3 * m * m * t;
    var c = 3 * m * t * t;
    var d = t * t * t;
    return {
      x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
      y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
    };
  }

  function lerp(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  // Split a cubic and keep the part between t0 and t1 (de Casteljau, twice).
  function subCubic(p, t0, t1) {
    function splitRight(q, t) {
      var ab = lerp(q[0], q[1], t);
      var bc = lerp(q[1], q[2], t);
      var cd = lerp(q[2], q[3], t);
      var abc = lerp(ab, bc, t);
      var bcd = lerp(bc, cd, t);
      return [lerp(abc, bcd, t), bcd, cd, q[3]];
    }
    function splitLeft(q, t) {
      var ab = lerp(q[0], q[1], t);
      var bc = lerp(q[1], q[2], t);
      var cd = lerp(q[2], q[3], t);
      var abc = lerp(ab, bc, t);
      var bcd = lerp(bc, cd, t);
      return [q[0], ab, abc, lerp(abc, bcd, t)];
    }
    var right = splitRight(p, t0);
    return splitLeft(right, (t1 - t0) / (1 - t0));
  }

  function clear(pt, centre, rect) {
    var dx = pt.x - centre.x;
    var dy = pt.y - centre.y;
    if (dx * dx + dy * dy < STAR_GAP * STAR_GAP) return false;
    if (rect && pt.x > rect.left && pt.x < rect.right && pt.y > rect.top && pt.y < rect.bottom) {
      return false;
    }
    return true;
  }

  function trailHtml(centres, labels) {
    var pts = [];
    for (var k = 0; k < stars.length; k++) if (centres[k]) pts.push(k);
    var out = [];
    for (var j = 0; j < pts.length - 1; j++) {
      var i0 = pts[Math.max(0, j - 1)];
      var i1 = pts[j];
      var i2 = pts[j + 1];
      var i3 = pts[Math.min(pts.length - 1, j + 2)];
      var P0 = centres[i0];
      var P1 = centres[i1];
      var P2 = centres[i2];
      var P3 = centres[i3];
      var curve = [
        P1,
        { x: P1.x + (P2.x - P0.x) / 6, y: P1.y + (P2.y - P0.y) / 6 },
        { x: P2.x - (P3.x - P1.x) / 6, y: P2.y - (P3.y - P1.y) / 6 },
        P2,
      ];
      var STEPS = 80;
      var t0 = -1;
      var t1 = -1;
      for (var s = 0; s <= STEPS; s++) {
        var t = s / STEPS;
        var pt = cubicAt(curve, t);
        if (t0 < 0 && clear(pt, P1, labels[i1]) && clear(pt, P2, labels[i2])) t0 = t;
        if (t0 >= 0 && clear(pt, P2, labels[i2]) && clear(pt, P1, labels[i1])) t1 = t;
      }
      if (t0 < 0 || t1 <= t0) continue;
      var c = subCubic(curve, t0, t1);
      out.push(
        '<path d="M' +
          c[0].x.toFixed(1) +
          " " +
          c[0].y.toFixed(1) +
          " C" +
          [c[1], c[2], c[3]]
            .map(function (q) {
              return q.x.toFixed(1) + " " + q.y.toFixed(1);
            })
            .join(" ") +
          '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="1.5 5.5" opacity="0.8"/>',
      );
    }
    return out.join("\n");
  }

  function updateLines() {
    var mapRect = map.getBoundingClientRect();
    var starCenters = {};
    var labelRects = {};

    // Get center of each star icon + its label's (padded) bounding box
    stars.forEach(function (star, index) {
      var icon = star.querySelector(".star-icon");
      if (!icon) return;

      var iconRect = icon.getBoundingClientRect();
      starCenters[index] = {
        x: iconRect.left + iconRect.width / 2 - mapRect.left,
        y: iconRect.top + iconRect.height / 2 - mapRect.top,
      };

      var label = star.querySelector(".star-label");
      if (label) {
        var r = label.getBoundingClientRect();
        labelRects[index] = {
          left: r.left - mapRect.left - LABEL_PAD,
          right: r.right - mapRect.left + LABEL_PAD,
          top: r.top - mapRect.top - LABEL_PAD,
          bottom: r.bottom - mapRect.top + LABEL_PAD,
        };
      }
    });

    // Update SVG viewBox to match container
    var width = mapRect.width;
    var height = mapRect.height;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    // Generate path elements
    var pathsHtml = pathQuery.matches
      ? trailHtml(starCenters, labelRects)
      : connections
          .map(function (conn) {
            var start = starCenters[conn[0]];
            var end = starCenters[conn[1]];
            if (!start || !end) return "";

            var dx = end.x - start.x;
            var dy = end.y - start.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            var ux = dx / len;
            var uy = dy / len;

            // Trim both ends: at least STAR_GAP, more if the line would
            // otherwise pass through that star's own label
            var trimStart = STAR_GAP;
            if (labelRects[conn[0]]) {
              trimStart = Math.max(
                trimStart,
                labelExitDistance(start, ux, uy, labelRects[conn[0]]),
              );
            }
            var trimEnd = STAR_GAP;
            if (labelRects[conn[1]]) {
              trimEnd = Math.max(trimEnd, labelExitDistance(end, -ux, -uy, labelRects[conn[1]]));
            }
            if (len <= trimStart + trimEnd) return "";

            var x1 = start.x + ux * trimStart;
            var y1 = start.y + uy * trimStart;
            var x2 = end.x - ux * trimEnd;
            var y2 = end.y - uy * trimEnd;

            return (
              '<path d="M' +
              x1.toFixed(1) +
              " " +
              y1.toFixed(1) +
              " L" +
              x2.toFixed(1) +
              " " +
              y2.toFixed(1) +
              '" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-dasharray="6 6" opacity="0.7"/>'
            );
          })
          .join("\n");

    svg.innerHTML = pathsHtml;
  }

  // Initial calculation (delayed to ensure layout is complete)
  setTimeout(updateLines, 100);

  // Recalculate whenever the layout can move: resize, rotation, crossing the
  // phone breakpoint, the map itself changing size, and web fonts arriving
  // (they change label widths, which set where lines are trimmed).
  var resizeTimeout;
  function scheduleUpdate() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateLines, 100);
  }
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("orientationchange", scheduleUpdate);
  if (pathQuery.addEventListener) pathQuery.addEventListener("change", scheduleUpdate);
  if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(map);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleUpdate);
})();
