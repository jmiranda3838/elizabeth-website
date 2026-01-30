/**
 * FAQ Accordion & Print Handling
 */
(function() {
  'use strict';

  var faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function(item) {
    var question = item.querySelector('.faq-question');

    if (question) {
      question.addEventListener('click', function() {
        var isOpen = item.classList.contains('open');
        var answer = item.querySelector('.faq-answer');

        // Close all other FAQ items
        faqItems.forEach(function(otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
            var otherQuestion = otherItem.querySelector('.faq-question');
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

  // Expand all FAQ items for printing
  window.addEventListener('beforeprint', function() {
    faqItems.forEach(function(item) {
      item.classList.add('open');
    });
  });

  window.addEventListener('afterprint', function() {
    faqItems.forEach(function(item) {
      item.classList.remove('open');
    });
  });
})();
