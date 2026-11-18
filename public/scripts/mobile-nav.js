/**
 * Mobile Navigation Toggle & Focus Trap
 */
(function () {
  "use strict";

  var menuToggle = document.querySelector(".menu-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  var body = document.body;

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.contains("open");

      // Toggle menu
      mobileNav.classList.toggle("open");
      menuToggle.classList.toggle("open");

      // Update aria-expanded
      menuToggle.setAttribute("aria-expanded", !isOpen);

      // Prevent body scroll when menu is open
      if (!isOpen) {
        body.style.overflow = "hidden";
      } else {
        body.style.overflow = "";
      }
    });

    var closeMenu = function () {
      mobileNav.classList.remove("open");
      menuToggle.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      body.style.overflow = "";
    };

    // Close menu when clicking a link
    var mobileNavLinks = mobileNav.querySelectorAll(".mobile-nav-link");
    mobileNavLinks.forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Close menu on escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        closeMenu();
        menuToggle.focus();
      }
    });

    // Close menu when the window grows past the mobile breakpoint (rotation, resize),
    // so the scroll lock is never left on behind the desktop nav
    var desktopQuery = window.matchMedia("(min-width: 901px)");
    var onDesktopChange = function (e) {
      if (e.matches && mobileNav.classList.contains("open")) {
        closeMenu();
      }
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", onDesktopChange);
    }

    // Focus trap for accessibility
    var focusableElements = mobileNav.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select',
    );
    var firstFocusable = focusableElements[0];
    var lastFocusable = focusableElements[focusableElements.length - 1];

    mobileNav.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;

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
  }
})();
