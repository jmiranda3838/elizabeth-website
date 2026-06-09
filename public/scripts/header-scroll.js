/**
 * Header Scroll Behavior & Active Navigation State
 */
(function() {
  'use strict';

  // Header scroll shadow
  var header = document.querySelector('.header');

  if (header) {
    window.addEventListener('scroll', function() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > 100) {
        header.classList.add('scrolled');
        header.style.boxShadow = '0 2px 10px rgba(84, 49, 35, 0.08)';
      } else {
        header.classList.remove('scrolled');
        header.style.boxShadow = '';
      }
    }, { passive: true });
  }

  // Active navigation state
  var currentPath = window.location.pathname;
  var navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  // Spoke pages live one click under the "Offerings" hub nav item
  var offeringSpokes = ['/therapy.html', '/reiki.html'];
  var isOfferingSpoke = offeringSpokes.some(function(spoke) {
    return currentPath.endsWith(spoke);
  });

  navLinks.forEach(function(link) {
    var href = link.getAttribute('href');
    if (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html')) {
      link.classList.add('active');
    } else if (isOfferingSpoke && href === '/ways.html') {
      link.classList.add('active');
    }
  });
})();
