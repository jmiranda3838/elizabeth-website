/**
 * Smooth Scroll for Anchor Links
 */
(function() {
  'use strict';

  var anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      var href = this.getAttribute('href');

      // Skip if it's just "#" or empty
      if (href === '#' || href === '') {
        return;
      }

      var target = document.querySelector(href);

      if (target) {
        e.preventDefault();

        var headerHeight = document.querySelector('.header').offsetHeight;
        var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
})();
