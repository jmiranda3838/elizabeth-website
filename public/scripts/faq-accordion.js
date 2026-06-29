/**
 * FAQ Accordion & Print Handling
 */
(function () {
  "use strict";

  var faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(function (item, index) {
    var question = item.querySelector(".faq-question");
    var answer = item.querySelector(".faq-answer");

    if (question) {
      // Wire up ARIA relationships so screen readers announce the panel each
      // question controls and whether it is expanded.
      var idx = index + 1;
      if (!question.id) question.id = "faq-question-" + idx;
      if (answer) {
        if (!answer.id) answer.id = "faq-answer-" + idx;
        answer.setAttribute("role", "region");
        answer.setAttribute("aria-labelledby", question.id);
        question.setAttribute("aria-controls", answer.id);
      }
      question.setAttribute("aria-expanded", "false");

      question.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");

        // Close all other FAQ items
        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove("open");
            var otherQuestion = otherItem.querySelector(".faq-question");
            if (otherQuestion) {
              otherQuestion.setAttribute("aria-expanded", "false");
            }
          }
        });

        // Toggle current item
        item.classList.toggle("open");
        question.setAttribute("aria-expanded", String(!isOpen));

        // Focus management for accessibility
        if (!isOpen && answer) {
          answer.setAttribute("tabindex", "-1");
        }
      });

      // Keyboard navigation
      question.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          question.click();
        }
      });
    }
  });

  // Expand all FAQ items for printing
  window.addEventListener("beforeprint", function () {
    faqItems.forEach(function (item) {
      item.classList.add("open");
    });
  });

  window.addEventListener("afterprint", function () {
    faqItems.forEach(function (item) {
      item.classList.remove("open");
    });
  });
})();
