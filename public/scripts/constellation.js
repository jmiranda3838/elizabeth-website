/**
 * Dynamic Constellation SVG Lines
 */
(function() {
  'use strict';

  var map = document.querySelector('.constellation-map');
  var svg = document.querySelector('.constellation-lines');
  var stars = document.querySelectorAll('.constellation-star');

  if (!map || !svg || stars.length === 0) return;

  // Define connections (pairs of star indices)
  var connections = [
    [0, 1], // Anxiety -> Depression
    [1, 2], // Depression -> Relationships
    [2, 3], // Relationships -> Grief
    [0, 4], // Anxiety -> Life Transitions
    [4, 5], // Life Transitions -> LGBTQ+
    [5, 6], // LGBTQ+ -> Career
    [6, 3], // Career -> Grief
    [1, 5], // Depression -> LGBTQ+
    [2, 6]  // Relationships -> Career
  ];

  function updateLines() {
    var mapRect = map.getBoundingClientRect();
    var starCenters = {};

    // Get center of each star icon
    stars.forEach(function(star, index) {
      var icon = star.querySelector('.star-icon');
      if (!icon) return;

      var iconRect = icon.getBoundingClientRect();
      starCenters[index] = {
        x: iconRect.left + iconRect.width / 2 - mapRect.left,
        y: iconRect.top + iconRect.height / 2 - mapRect.top
      };
    });

    // Update SVG viewBox to match container
    var width = mapRect.width;
    var height = mapRect.height;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    // Generate path elements
    var pathsHtml = connections.map(function(conn) {
      var from = conn[0];
      var to = conn[1];
      var start = starCenters[from];
      var end = starCenters[to];
      if (!start || !end) return '';
      return '<path d="M' + start.x.toFixed(1) + ' ' + start.y.toFixed(1) + ' L' + end.x.toFixed(1) + ' ' + end.y.toFixed(1) + '" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>';
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
