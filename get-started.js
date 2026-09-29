/**
 * RAISE — "Get Started" Page Interactive Controller
 * Handles Accordion toggles and Application Form Submission
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. FAQ Accordion Logic
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Optional: Close other open accordion items
      accordionItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
          otherItem.querySelector('.accordion-content').style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null;
      } else {
        item.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

  // Open first FAQ by default for immediate engagement
  if (accordionItems.length > 0) {
    const firstItem = accordionItems[0];
    const firstTrigger = firstItem.querySelector('.accordion-trigger');
    const firstContent = firstItem.querySelector('.accordion-content');
    firstItem.classList.add('active');
    firstTrigger.setAttribute('aria-expanded', 'true');
    firstContent.style.maxHeight = firstContent.scrollHeight + 'px';
  }

  // 2. Application Form Submission
  window.handleApplySubmit = function() {
    const submitBtn = document.getElementById('app-submit-btn');
    const form = document.getElementById('gs-application-form');
    const successBox = document.getElementById('app-success-box');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Submitting Application...</span>';
    }

    setTimeout(() => {
      if (form && successBox) {
        form.style.display = 'none';
        successBox.style.display = 'block';
        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 700);
  };
});
