/* =========================================================
   Raise Tools — Authentication & Modal Handler
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'raise_user_session';

  // Elements
  var authModal = document.getElementById('auth-modal');
  var modalCloseBtn = document.getElementById('modal-close-btn');
  var signupView = document.getElementById('signup-view');
  var loginView = document.getElementById('login-view');
  var signupForm = document.getElementById('signup-form');
  var loginForm = document.getElementById('login-form');
  var suError = document.getElementById('su-error');
  var liError = document.getElementById('li-error');
  var switchToLogin = document.getElementById('switch-to-login');
  var switchToSignup = document.getElementById('switch-to-signup');

  // Trigger buttons
  var headerSignupBtn = document.getElementById('header-signup-btn');
  var headerLoginBtn = document.getElementById('header-login-btn');
  var mobileSignupBtn = document.getElementById('mobile-signup-btn');
  var mobileLoginBtn = document.getElementById('mobile-login-btn');
  var suGoogleBtn = document.getElementById('su-google-btn');
  var liGoogleBtn = document.getElementById('li-google-btn');

  // Containers
  var headerAuthActions = document.getElementById('header-auth-actions');
  var mobileAuthActions = document.getElementById('mobile-auth-actions');

  function openModal(view) {
    if (!authModal) return;
    authModal.hidden = false;
    document.body.style.overflow = 'hidden';
    clearErrors();
    if (view === 'login') {
      showLoginView();
    } else {
      showSignupView();
    }
  }

  function closeModal() {
    if (!authModal) return;
    authModal.hidden = true;
    document.body.style.overflow = '';
    clearErrors();
  }

  function showSignupView() {
    if (signupView) signupView.hidden = false;
    if (loginView) loginView.hidden = true;
    var firstInput = document.getElementById('su-firstname');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 50);
  }

  function showLoginView() {
    if (signupView) signupView.hidden = true;
    if (loginView) loginView.hidden = false;
    var emailInput = document.getElementById('li-email');
    if (emailInput) setTimeout(function () { emailInput.focus(); }, 50);
  }

  function clearErrors() {
    if (suError) { suError.hidden = true; suError.textContent = ''; }
    if (liError) { liError.hidden = true; liError.textContent = ''; }
  }

  function setSuError(msg) {
    if (suError) {
      suError.textContent = msg;
      suError.hidden = false;
    }
  }

  function setLiError(msg) {
    if (liError) {
      liError.textContent = msg;
      liError.hidden = false;
    }
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save session to localStorage', e);
    }
    renderAuthState();
  }

  function logout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    renderAuthState();
  }

  function renderAuthState() {
    var session = getSession();
    var existingProfile = document.getElementById('user-profile-menu');
    if (existingProfile) {
      existingProfile.remove();
    }

    if (session && session.firstName) {
      if (headerAuthActions) headerAuthActions.hidden = true;
      if (mobileAuthActions) mobileAuthActions.hidden = true;

      var headerInner = document.querySelector('.header-inner');
      if (headerInner) {
        var profileWrapper = document.createElement('div');
        profileWrapper.className = 'user-profile-menu';
        profileWrapper.id = 'user-profile-menu';

        var initials = (session.firstName[0] || 'U') + (session.lastName ? session.lastName[0] : '');
        profileWrapper.innerHTML = [
          '<button type="button" class="btn-profile" id="user-profile-btn" aria-expanded="false" aria-label="Founder account">',
          '  <span class="user-avatar">' + escapeHtml(initials) + '</span>',
          '  <span class="user-greeting">' + escapeHtml(session.firstName) + '</span>',
          '  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>',
          '</button>',
          '<div class="user-dropdown" id="user-dropdown" hidden>',
          '  <div class="user-dropdown-info">',
          '    <strong>' + escapeHtml(session.firstName + (session.lastName ? ' ' + session.lastName : '')) + '</strong>',
          '    <span>' + escapeHtml(session.email || '') + '</span>',
          '  </div>',
          '  <hr class="user-dropdown-sep">',
          '  <a href="/deck-rating" class="user-dropdown-link">◈ Deck Audit</a>',
          '  <a href="/investors" class="user-dropdown-link">⌖ Investor Finder</a>',
          '  <a href="/tools/crm" class="user-dropdown-link">▦ Fundraising CRM</a>',
          '  <hr class="user-dropdown-sep">',
          '  <button type="button" class="user-dropdown-link user-dropdown-logout" id="logout-btn">Log Out</button>',
          '</div>'
        ].join('\n');

        // Insert before hamburger
        var hamburger = document.getElementById('hamburger');
        if (hamburger) {
          headerInner.insertBefore(profileWrapper, hamburger);
        } else {
          headerInner.appendChild(profileWrapper);
        }

        var profileBtn = profileWrapper.querySelector('#user-profile-btn');
        var userDropdown = profileWrapper.querySelector('#user-dropdown');
        var logoutBtn = profileWrapper.querySelector('#logout-btn');

        if (profileBtn && userDropdown) {
          profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = !userDropdown.hidden;
            userDropdown.hidden = isOpen;
            profileBtn.setAttribute('aria-expanded', String(!isOpen));
          });

          document.addEventListener('click', function (e) {
            if (!profileWrapper.contains(e.target)) {
              userDropdown.hidden = true;
              profileBtn.setAttribute('aria-expanded', 'false');
            }
          });
        }

        if (logoutBtn) {
          logoutBtn.addEventListener('click', function () {
            logout();
          });
        }
      }
    } else {
      if (headerAuthActions) headerAuthActions.hidden = false;
      if (mobileAuthActions) mobileAuthActions.hidden = false;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Event Listeners for opening
  if (headerSignupBtn) {
    headerSignupBtn.addEventListener('click', function () { openModal('signup'); });
  }
  if (headerLoginBtn) {
    headerLoginBtn.addEventListener('click', function () { openModal('login'); });
  }
  if (mobileSignupBtn) {
    mobileSignupBtn.addEventListener('click', function () {
      var mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.hidden = true;
      openModal('signup');
    });
  }
  if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener('click', function () {
      var mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.hidden = true;
      openModal('login');
    });
  }

  // Trigger from any element with data-open-auth
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-open-auth]');
    if (trigger) {
      e.preventDefault();
      var type = trigger.getAttribute('data-open-auth');
      openModal(type || 'signup');
    }
  });

  // Modal close events
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }
  if (authModal) {
    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) closeModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && authModal && !authModal.hidden) {
      closeModal();
    }
  });

  // Switch tabs
  if (switchToLogin) {
    switchToLogin.addEventListener('click', function () {
      clearErrors();
      showLoginView();
    });
  }
  if (switchToSignup) {
    switchToSignup.addEventListener('click', function () {
      clearErrors();
      showSignupView();
    });
  }

  // Handle Signup Form Submit
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      var firstName = (document.getElementById('su-firstname').value || '').trim();
      var lastName = (document.getElementById('su-lastname').value || '').trim();
      var linkedin = (document.getElementById('su-linkedin').value || '').trim();
      var twitter = (document.getElementById('su-twitter').value || '').trim();
      var email = (document.getElementById('su-email').value || '').trim();
      var password = document.getElementById('su-password').value || '';
      var confirmPassword = document.getElementById('su-confirm-password').value || '';

      if (!firstName || !lastName || !email || !password || !confirmPassword) {
        setSuError('Please fill in all required fields marked with *');
        return;
      }

      if (password.length < 8) {
        setSuError('Password must be at least 8 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setSuError('Passwords do not match. Please re-enter.');
        return;
      }

      var userSession = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        linkedin: linkedin,
        twitter: twitter,
        provider: 'email',
        signedUpAt: new Date().toISOString()
      };

      saveSession(userSession);
      closeModal();
      showWelcomeBanner('Welcome to Raise Tools, ' + firstName + '! Your account is active.');
    });
  }

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      var email = (document.getElementById('li-email').value || '').trim();
      var password = document.getElementById('li-password').value || '';

      if (!email || !password) {
        setLiError('Please provide both email and password');
        return;
      }

      // Check existing session name or deduce from email
      var prev = getSession();
      var firstName = (prev && prev.firstName) ? prev.firstName : email.split('@')[0];
      var lastName = (prev && prev.lastName) ? prev.lastName : '';

      var userSession = {
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName,
        email: email,
        provider: 'email',
        loggedInAt: new Date().toISOString()
      };

      saveSession(userSession);
      closeModal();
      showWelcomeBanner('Welcome back, ' + userSession.firstName + '!');
    });
  }

  // Google Sign-in Handler
  function handleGoogleAuth() {
    var googleUser = {
      firstName: 'Founder',
      lastName: '',
      email: 'founder@raiseos.site',
      provider: 'google',
      signedUpAt: new Date().toISOString()
    };
    saveSession(googleUser);
    closeModal();
    showWelcomeBanner('Signed in with Google successfully!');
  }

  if (suGoogleBtn) suGoogleBtn.addEventListener('click', handleGoogleAuth);
  if (liGoogleBtn) liGoogleBtn.addEventListener('click', handleGoogleAuth);

  function showWelcomeBanner(msg) {
    var banner = document.createElement('div');
    banner.className = 'toast show';
    banner.textContent = msg;
    document.body.appendChild(banner);
    setTimeout(function () {
      banner.classList.remove('show');
      setTimeout(function () { banner.remove(); }, 300);
    }, 4000);
  }

  // Initial check
  renderAuthState();
})();
