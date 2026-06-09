/**
 * Conduit Light Motes (Reiki page)
 * Spawns soft drifting light particles inside the hero's light channel.
 * Inert on every page without a .conduit-motes container.
 */
(function() {
  'use strict';

  var container = document.querySelector('.conduit-motes');
  if (!container) return;

  // Respect reduced motion: no motes at all
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COUNT = 14;

  for (var i = 0; i < COUNT; i++) {
    var mote = document.createElement('span');
    mote.className = 'conduit-mote';

    var size = 3 + Math.random() * 4;
    mote.style.width = size + 'px';
    mote.style.height = size + 'px';
    mote.style.left = (18 + Math.random() * 64) + '%';
    mote.style.setProperty('--sway', (Math.random() * 60 - 30).toFixed(0) + 'px');

    var duration = 9 + Math.random() * 8;
    mote.style.animationDuration = duration.toFixed(1) + 's';
    // Negative delay so motes are already mid-drift on load
    mote.style.animationDelay = (-Math.random() * duration).toFixed(1) + 's';

    container.appendChild(mote);
  }
})();
