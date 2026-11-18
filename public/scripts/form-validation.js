/**
 * Contact Form Validation & Enhancement
 *
 * NOTE: this form is not yet wired to a backend. On a valid submission it shows
 * an honest notice directing visitors to email/call, rather than faking a "sent"
 * state. To make it live, POST `data` to a form service (e.g. Formspree) inside
 * the isValid branch and only reveal a success message on a 2xx response.
 */
(function () {
  "use strict";

  var contactForm = document.getElementById("contact-form");
  if (!contactForm) return;

  var notice = document.getElementById("form-notice");

  // Our own messages replace the browser's validation bubbles. Set here, not
  // in the markup, so a visitor without JS still gets native validation.
  contactForm.noValidate = true;

  var messages = {
    "first-name": "Please enter your first name.",
    "last-name": "Please enter your last name.",
    email: "Please enter your email address.",
    message: "Please tell me a little about what brings you here.",
    privacy: "Please check this box to continue.",
  };
  var invalidEmailMessage = "Please enter a valid email address, like name@example.com.";

  // Shows (msg is a string) or clears (msg is falsy) a field's error: the
  // class and aria-invalid on the field, plus a visible message beneath it
  // tied to the field with aria-describedby.
  function setError(field, msg) {
    var errorId = field.id + "-error";
    var errorEl = document.getElementById(errorId);
    if (msg) {
      field.classList.add("error");
      field.setAttribute("aria-invalid", "true");
      if (!errorEl) {
        errorEl = document.createElement("p");
        errorEl.id = errorId;
        errorEl.className = "form-error";
        field.parentNode.appendChild(errorEl);
      }
      errorEl.textContent = msg;
      errorEl.hidden = false;
      field.setAttribute("aria-describedby", errorId);
    } else {
      field.classList.remove("error");
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      if (errorEl) errorEl.hidden = true;
    }
  }

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var isValid = true;
    var requiredFields = contactForm.querySelectorAll("[required]");

    requiredFields.forEach(function (field) {
      var empty = field.type === "checkbox" ? !field.checked : !field.value.trim();
      setError(field, empty && (messages[field.id] || "Please fill in this field."));
      if (empty) isValid = false;
    });

    // Email format check
    var emailField = contactForm.querySelector("#email");
    if (emailField && emailField.value.trim()) {
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailField.value.trim())) {
        setError(emailField, invalidEmailMessage);
        isValid = false;
      }
    }

    if (!isValid) {
      var firstInvalid = contactForm.querySelector('[aria-invalid="true"]');
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      return;
    }

    // Valid input — but there is no backend yet. Be honest instead of faking success.
    var data = Object.fromEntries(new FormData(contactForm).entries()); // eslint-disable-line no-unused-vars
    if (notice) {
      notice.innerHTML =
        "Thank you for reaching out. This form isn’t connected yet — for now, " +
        'please email <a href="mailto:elizabetharmstrongtherapy@gmail.com">' +
        "elizabetharmstrongtherapy@gmail.com</a> or call " +
        '<a href="tel:+19494443899">(949) 444-3899</a>, and I’ll respond ' +
        "within one business day.";
      notice.hidden = false;
      notice.setAttribute("tabindex", "-1");
      if (notice.focus) notice.focus();
      if (notice.scrollIntoView) notice.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  // Clear error state as the user corrects each field
  var formFields = contactForm.querySelectorAll(".form-input, .form-textarea, .form-checkbox");
  formFields.forEach(function (field) {
    var evt = field.type === "checkbox" ? "change" : "input";
    field.addEventListener(evt, function () {
      if (field.classList.contains("error")) setError(field, "");
    });
  });
})();
