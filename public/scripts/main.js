/**
 * Elizabeth Armstrong Therapy Website
 * Main JavaScript
 */

(function() {
  'use strict';

  // =========================================
  // Mobile Navigation Toggle
  // =========================================
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const body = document.body;

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function() {
      const isOpen = mobileNav.classList.contains('open');

      // Toggle menu
      mobileNav.classList.toggle('open');
      menuToggle.classList.toggle('open');

      // Update aria-expanded
      menuToggle.setAttribute('aria-expanded', !isOpen);

      // Prevent body scroll when menu is open
      if (!isOpen) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    });

    // Close menu when clicking a link
    const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        mobileNav.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
        menuToggle.focus();
      }
    });
  }

  // =========================================
  // FAQ Accordion
  // =========================================
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function(item) {
    const question = item.querySelector('.faq-question');

    if (question) {
      question.addEventListener('click', function() {
        const isOpen = item.classList.contains('open');
        const answer = item.querySelector('.faq-answer');

        // Close all other FAQ items
        faqItems.forEach(function(otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
            const otherQuestion = otherItem.querySelector('.faq-question');
            if (otherQuestion) {
              otherQuestion.setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle current item
        item.classList.toggle('open');
        question.setAttribute('aria-expanded', !isOpen);

        // Focus management for accessibility
        if (!isOpen && answer) {
          answer.setAttribute('tabindex', '-1');
        }
      });

      // Keyboard navigation
      question.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          question.click();
        }
      });
    }
  });

  // =========================================
  // Smooth Scroll for Anchor Links
  // =========================================
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');

      // Skip if it's just "#" or empty
      if (href === '#' || href === '') {
        return;
      }

      const target = document.querySelector(href);

      if (target) {
        e.preventDefault();

        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });

  // =========================================
  // Header Scroll Behavior
  // =========================================
  const header = document.querySelector('.header');
  let lastScrollTop = 0;
  const scrollThreshold = 100;

  if (header) {
    window.addEventListener('scroll', function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Add scrolled class when past the hero (around 100px)
      if (scrollTop > 100) {
        header.classList.add('scrolled');
        header.style.boxShadow = '0 2px 10px rgba(84, 49, 35, 0.08)';
      } else {
        header.classList.remove('scrolled');
        header.style.boxShadow = '';
      }

      lastScrollTop = scrollTop;
    }, { passive: true });
  }

  // =========================================
  // Form Validation & Enhancement
  // =========================================
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Get form data
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData.entries());

      // Basic validation (HTML5 handles most of it)
      let isValid = true;
      const requiredFields = contactForm.querySelectorAll('[required]');

      requiredFields.forEach(function(field) {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });

      // Email validation
      const emailField = contactForm.querySelector('#email');
      if (emailField && emailField.value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailField.value)) {
          isValid = false;
          emailField.classList.add('error');
        }
      }

      if (isValid) {
        // Show success message
        const submitButton = contactForm.querySelector('[type="submit"]');
        const originalText = submitButton.textContent;

        submitButton.textContent = 'Message Sent!';
        submitButton.disabled = true;
        submitButton.style.backgroundColor = 'var(--sage)';
        submitButton.style.borderColor = 'var(--sage)';

        // In a real implementation, you would send the form data to a server here
        // For demo purposes, we'll just show a success state

        setTimeout(function() {
          // Reset form
          contactForm.reset();
          submitButton.textContent = originalText;
          submitButton.disabled = false;
          submitButton.style.backgroundColor = '';
          submitButton.style.borderColor = '';
        }, 3000);
      }
    });

    // Clear error state on input
    const formInputs = contactForm.querySelectorAll('.form-input, .form-textarea');
    formInputs.forEach(function(input) {
      input.addEventListener('input', function() {
        this.classList.remove('error');
      });
    });
  }

  // =========================================
  // Scroll Reveal Animation (Enhanced)
  // =========================================
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    // Use Intersection Observer for better performance
    const revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Only animate once - unobserve after triggering
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
    const revealOnScroll = function() {
      const windowHeight = window.innerHeight;
      const revealPoint = 100;

      revealElements.forEach(function(element) {
        const elementTop = element.getBoundingClientRect().top;

        if (elementTop < windowHeight - revealPoint) {
          element.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', revealOnScroll, { passive: true });
    window.addEventListener('load', revealOnScroll);
  }

  // =========================================
  // Service Card Hover Effects (for touch)
  // =========================================
  const serviceCards = document.querySelectorAll('.service-card');

  if ('ontouchstart' in window) {
    serviceCards.forEach(function(card) {
      card.addEventListener('touchstart', function() {
        this.classList.add('touch-hover');
      });

      card.addEventListener('touchend', function() {
        const self = this;
        setTimeout(function() {
          self.classList.remove('touch-hover');
        }, 300);
      });
    });
  }

  // =========================================
  // Active Navigation State
  // =========================================
  const setActiveNav = function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    navLinks.forEach(function(link) {
      const href = link.getAttribute('href');
      if (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  };

  setActiveNav();

  // =========================================
  // Lazy Loading Images (if needed)
  // =========================================
  if ('IntersectionObserver' in window) {
    const lazyImages = document.querySelectorAll('img[data-src]');

    if (lazyImages.length > 0) {
      const imageObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        });
      });

      lazyImages.forEach(function(img) {
        imageObserver.observe(img);
      });
    }
  }

  // =========================================
  // Focus Trap for Mobile Menu (Accessibility)
  // =========================================
  const trapFocus = function(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    });
  };

  if (mobileNav) {
    trapFocus(mobileNav);
  }

  // =========================================
  // Print-friendly handling
  // =========================================
  window.addEventListener('beforeprint', function() {
    // Expand all FAQ items for printing
    faqItems.forEach(function(item) {
      item.classList.add('open');
    });
  });

  window.addEventListener('afterprint', function() {
    // Collapse FAQ items after printing
    faqItems.forEach(function(item) {
      item.classList.remove('open');
    });
  });

  // =========================================
  // Constellation Lines - Dynamic Positioning
  // =========================================
  function initConstellationLines() {
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
  }

  // Initialize constellation lines
  initConstellationLines();

})();
