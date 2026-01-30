/**
 * Contact Form Validation & Enhancement
 */
(function() {
  'use strict';

  var contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Get form data
      var formData = new FormData(contactForm);
      var data = Object.fromEntries(formData.entries());

      // Basic validation (HTML5 handles most of it)
      var isValid = true;
      var requiredFields = contactForm.querySelectorAll('[required]');

      requiredFields.forEach(function(field) {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });

      // Email validation
      var emailField = contactForm.querySelector('#email');
      if (emailField && emailField.value) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailField.value)) {
          isValid = false;
          emailField.classList.add('error');
        }
      }

      if (isValid) {
        // Show success message
        var submitButton = contactForm.querySelector('[type="submit"]');
        var originalText = submitButton.textContent;

        submitButton.textContent = 'Message Sent!';
        submitButton.disabled = true;
        submitButton.style.backgroundColor = 'var(--sage)';
        submitButton.style.borderColor = 'var(--sage)';

        // In a real implementation, you would send the form data to a server here

        setTimeout(function() {
          contactForm.reset();
          submitButton.textContent = originalText;
          submitButton.disabled = false;
          submitButton.style.backgroundColor = '';
          submitButton.style.borderColor = '';
        }, 3000);
      }
    });

    // Clear error state on input
    var formInputs = contactForm.querySelectorAll('.form-input, .form-textarea');
    formInputs.forEach(function(input) {
      input.addEventListener('input', function() {
        this.classList.remove('error');
      });
    });
  }
})();
