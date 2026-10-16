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

  // 7. Live Substack Feed Integration (@raiseos)
  const articlesGrid = document.getElementById('substack-articles-grid');
  if (articlesGrid) {
    const rssFeedUrl = 'https://raiseos.substack.com/feed';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'ok' && data.items && data.items.length > 0) {
          articlesGrid.innerHTML = data.items.slice(0, 6).map(item => {
            let thumb = item.thumbnail || (item.enclosure && item.enclosure.link);
            if (!thumb && item.content) {
              const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (imgMatch) thumb = imgMatch[1];
            }
            if (!thumb) {
              thumb = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80';
            }

            const cleanExcerpt = item.description 
              ? item.description.replace(/<[^>]*>?/gm, '').slice(0, 130) + '...'
              : 'Read Mouad Dliaa\'s pitch deck teardown and fundraising strategy on Substack.';

            const pubDate = new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return `
              <article class="article-card revealed" style="background:#17181B; border:1px solid rgba(255,255,255,0.1); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s, border-color 0.2s;">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="display:block; height:180px; overflow:hidden; position:relative;">
                  <img src="${thumb}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s ease;">
                  <span style="position:absolute; top:12px; left:12px; font-size:10px; font-weight:800; color:#111110; background:#B9FF66; padding:4px 10px; border-radius:100px; text-transform:uppercase;">FIELD NOTES</span>
                </a>
                <div style="padding:24px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                      <span style="font-size:12px; color:#B9FF66; font-weight:700;">@raiseos</span>
                      <span style="font-size:12px; color:#848792;">${pubDate}</span>
                    </div>
                    <h3 style="font-size:17px; font-weight:800; color:#fff; margin-bottom:10px; line-height:1.4;">
                      <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color:inherit;">
                        ${item.title}
                      </a>
                    </h3>
                    <p style="font-size:13px; color:#A3A6B4; line-height:1.6; margin-bottom:20px;">
                      ${cleanExcerpt}
                    </p>
                  </div>
                  <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:12px; color:#848792;">By ${item.author || 'Mouad Dliaa'}</span>
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="font-size:13px; font-weight:700; color:#B9FF66; display:inline-flex; align-items:center; gap:4px;">
                      Read on Substack →
                    </a>
                  </div>
                </div>
              </article>
            `;
          }).join('');
        }
      })
      .catch(err => {
        console.log('Substack feed fallback:', err);
      });
  }
});
