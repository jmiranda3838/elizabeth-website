/**
 * Dynamic Constellation SVG Lines
 */
(function() {
  'use strict';

  var map = document.querySelector('.constellation-map');
  var svg = document.querySelector('.constellation-lines');
  var stars = document.querySelectorAll('.constellation-star');

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
    [6, 7]  // tail: Growth -> Joy (bottom-right)
  ];

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

  function updateLines() {
    var mapRect = map.getBoundingClientRect();
    var starCenters = {};
    var labelRects = {};

    // Get center of each star icon + its label's (padded) bounding box
    stars.forEach(function(star, index) {
      var icon = star.querySelector('.star-icon');
      if (!icon) return;

      var iconRect = icon.getBoundingClientRect();
      starCenters[index] = {
        x: iconRect.left + iconRect.width / 2 - mapRect.left,
        y: iconRect.top + iconRect.height / 2 - mapRect.top
      };

      var label = star.querySelector('.star-label');
      if (label) {
        var r = label.getBoundingClientRect();
        labelRects[index] = {
          left: r.left - mapRect.left - LABEL_PAD,
          right: r.right - mapRect.left + LABEL_PAD,
          top: r.top - mapRect.top - LABEL_PAD,
          bottom: r.bottom - mapRect.top + LABEL_PAD
        };
      }
    });

    // Update SVG viewBox to match container
    var width = mapRect.width;
    var height = mapRect.height;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    // Generate path elements
    var pathsHtml = connections.map(function(conn) {
      var start = starCenters[conn[0]];
      var end = starCenters[conn[1]];
      if (!start || !end) return '';

      var dx = end.x - start.x;
      var dy = end.y - start.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / len;
      var uy = dy / len;

      // Trim both ends: at least STAR_GAP, more if the line would
      // otherwise pass through that star's own label
      var trimStart = STAR_GAP;
      if (labelRects[conn[0]]) {
        trimStart = Math.max(trimStart, labelExitDistance(start, ux, uy, labelRects[conn[0]]));
      }
      var trimEnd = STAR_GAP;
      if (labelRects[conn[1]]) {
        trimEnd = Math.max(trimEnd, labelExitDistance(end, -ux, -uy, labelRects[conn[1]]));
      }
      if (len <= trimStart + trimEnd) return '';

      var x1 = start.x + ux * trimStart;
      var y1 = start.y + uy * trimStart;
      var x2 = end.x - ux * trimEnd;
      var y2 = end.y - uy * trimEnd;

      return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-dasharray="6 6" opacity="0.7"/>';
    }).join('\n');

    svg.innerHTML = pathsHtml;
  }

  // Initial calculation (delayed to ensure layout is complete)
  setTimeout(updateLines, 100);

  // Recalculate on resize (debounced)
  var resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateLines, 100);
  });
})();
