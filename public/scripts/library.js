/**
 * Lending Library Shelf (resources page)
 * Lets the three lendable books pull out of the shelf and share a note.
 * One book out at a time; Escape or clicking elsewhere reshelves it.
 * Inert on every page without a .shelf-lend-wrap.
 */
(function() {
  'use strict';

  var wraps = document.querySelectorAll('.shelf-lend-wrap');
  if (!wraps.length) return;

  function reshelve(wrap) {
    wrap.classList.remove('is-pulled');
    var btn = wrap.querySelector('.shelf-book--lend');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function reshelveAll() {
    wraps.forEach(reshelve);
  }

  wraps.forEach(function(wrap) {
    var btn = wrap.querySelector('.shelf-book--lend');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var wasPulled = wrap.classList.contains('is-pulled');
      reshelveAll();
      if (!wasPulled) {
        wrap.classList.add('is-pulled');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.shelf-lend-wrap')) reshelveAll();
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') reshelveAll();
  });
})();
