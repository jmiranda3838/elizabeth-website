/**
 * Scroll Reveal Animations & Service Card Touch Effects
 */
(function() {
  'use strict';

  // Scroll reveal
  var revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(function(element) {
      revealObserver.observe(element);
    });
  } else if (revealElements.length > 0) {
    // Fallback for browsers without IntersectionObserver
    var revealOnScroll = function() {
      var windowHeight = window.innerHeight;
      var revealPoint = 100;

      revealElements.forEach(function(element) {
        var elementTop = element.getBoundingClientRect().top;

        if (elementTop < windowHeight - revealPoint) {
          element.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', revealOnScroll, { passive: true });
    window.addEventListener('load', revealOnScroll);
  }

  // Service card touch effects for mobile
  var serviceCards = document.querySelectorAll('.service-card');

  if ('ontouchstart' in window) {
    serviceCards.forEach(function(card) {
      card.addEventListener('touchstart', function() {
        this.classList.add('touch-hover');
      });

      card.addEventListener('touchend', function() {
        var self = this;
        setTimeout(function() {
          self.classList.remove('touch-hover');
        }, 300);
      });
    });
  }
})();
