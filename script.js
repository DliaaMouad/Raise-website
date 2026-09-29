/**
 * RAISE Landing Page Client Logic
 * Handles interactive elements, modal states, scroll animations, and form feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Year in Footer
  const yearElem = document.getElementById('current-year');
  if (yearElem) {
    yearElem.textContent = new Date().getFullYear();
  }

  // 2. Sticky Header Shadow on Scroll
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 3. Mobile Navigation Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking nav links
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 4. Scroll Reveal Animations with IntersectionObserver
  const revealElements = document.querySelectorAll('.reveal-item');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  // 5. Interactive Modal Management
  const modal = document.getElementById('contact-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const openModalBtns = document.querySelectorAll('.open-modal-btn');
  const formSuccessState = document.getElementById('form-success-state');
  const deckReviewForm = document.getElementById('deck-review-form');
  const closeSuccessBtn = document.getElementById('close-success-btn');

  function openModal() {
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // Reset form if closed earlier
      if (deckReviewForm && formSuccessState) {
        deckReviewForm.style.display = 'flex';
        formSuccessState.style.display = 'none';
      }
    }
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', closeModal);
  }

  // Close modal when clicking outer backdrop
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // 6. Form Submission Handling
  window.handleFormSubmit = function() {
    const submitBtn = document.getElementById('submit-form-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Audit Request...';
    }

    setTimeout(() => {
      if (deckReviewForm && formSuccessState) {
        deckReviewForm.style.display = 'none';
        formSuccessState.style.display = 'block';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Request Confidential Deck Audit →';
        }
      }
    }, 600);
  };
});
