/* =========================================================
   Raise Tools — Authentication & Modal Handler (landing page)
   ONE account system, shared with the in-tool gate (tools/auth.js):
   Supabase Auth + a profiles row. Sign up once, log in anywhere.
   Passwords live in Supabase Auth, never in our tables or the browser.
   The old localStorage session (raise_user_session) and the fake
   "Google" login that accepted any email are gone.
   Email + password only. Google sign-in was removed by decision.
   If Supabase is not configured yet, the forms show a setup notice.
   ========================================================= */
(function () {
  'use strict';

  var SETUP_MSG = 'Founder accounts are being set up. Come back shortly.';
  var currentProfile = null;

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

  // Containers
  var headerAuthActions = document.getElementById('header-auth-actions');
  var mobileAuthActions = document.getElementById('mobile-auth-actions');

  function isSupabaseConfigured() {
    return window.RaiseSupabase && window.RaiseSupabase.isConfigured();
  }

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

  function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

  function firstNameOf(profile) {
    var full = (profile && profile.full_name) || '';
    return full.split(' ')[0] || '';
  }

  function refreshAuthState() {
    if (!isSupabaseConfigured()) { currentProfile = null; renderAuthState(); return; }
    window.RaiseSupabase.getSessionUser().then(function (user) {
      if (!user) { currentProfile = null; renderAuthState(); return; }
      window.RaiseSupabase.getClient().then(function (client) {
        return window.RaiseSupabase.ensureProfile(client, user);
      }).then(function (profile) {
        currentProfile = profile;
        renderAuthState();
      }).catch(function () { currentProfile = null; renderAuthState(); });
    }).catch(function () { currentProfile = null; renderAuthState(); });
  }

  function logout() {
    currentProfile = null;
    renderAuthState();
    if (isSupabaseConfigured()) {
      window.RaiseSupabase.signOut().catch(function () { /* already signed out */ });
    }
  }

  function renderAuthState() {
    var existingProfile = document.getElementById('user-profile-menu');
    if (existingProfile) {
      existingProfile.remove();
    }

    var firstName = currentProfile ? firstNameOf(currentProfile) : '';
    if (currentProfile && firstName) {
      if (headerAuthActions) headerAuthActions.hidden = true;
      if (mobileAuthActions) mobileAuthActions.hidden = true;

      var headerInner = document.querySelector('.header-inner');
      if (headerInner) {
        var profileWrapper = document.createElement('div');
        profileWrapper.className = 'user-profile-menu';
        profileWrapper.id = 'user-profile-menu';

        var initials = (firstName[0] || 'U') + ((currentProfile.full_name || '').split(' ')[1] || '').charAt(0);
        var fullName = currentProfile.full_name || '';
        profileWrapper.innerHTML = [
          '<button type="button" class="btn-profile" id="user-profile-btn" aria-expanded="false" aria-label="Founder account">',
          '  <span class="user-avatar">' + escapeHtml(initials) + '</span>',
          '  <span class="user-greeting">' + escapeHtml(firstName) + '</span>',
          '  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>',
          '</button>',
          '<div class="user-dropdown" id="user-dropdown" hidden>',
          '  <div class="user-dropdown-info">',
          '    <strong>' + escapeHtml(fullName) + '</strong>',
          '    <span>' + escapeHtml(currentProfile.email || '') + '</span>',
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
      if (!isSupabaseConfigured()) { setSuError(SETUP_MSG); return; }

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
      if (!validEmail(email)) {
        setSuError('Enter a valid email address.');
        return;
      }
      if (linkedin && !/^https?:\/\/.+/i.test(linkedin)) {
        setSuError('LinkedIn link must start with https://');
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

      var submitBtn = document.getElementById('su-submit-btn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account...'; }
      window.RaiseSupabase.signUp({
        email: email,
        password: password,
        profile: {
          full_name: firstName + ' ' + lastName,
          country: '', company: '', stage: '',
          linkedin: linkedin, twitter: twitter
        }
      }).then(function (res) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
        if (res.needsConfirmation) {
          showLoginView();
          setLiError('Check your email to confirm your account, then log in.');
          return;
        }
        currentProfile = res.profile;
        renderAuthState();
        closeModal();
        showWelcomeBanner('Welcome to Raise Tools, ' + firstName + '! Your account is active.');
      }).catch(function (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
        setSuError(window.RaiseSupabase.friendlyAuthError(err));
      });
    });
  }

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      if (!isSupabaseConfigured()) { setLiError(SETUP_MSG); return; }

      var email = (document.getElementById('li-email').value || '').trim();
      var password = document.getElementById('li-password').value || '';

      if (!email || !password) {
        setLiError('Please provide both email and password');
        return;
      }
      if (!validEmail(email)) {
        setLiError('Enter a valid email address.');
        return;
      }

      var submitBtn = document.getElementById('li-submit-btn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in...'; }
      window.RaiseSupabase.signIn(email, password).then(function (res) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Log in'; }
        currentProfile = res.profile;
        renderAuthState();
        closeModal();
        showWelcomeBanner('Welcome back, ' + firstNameOf(res.profile) + '!');
      }).catch(function (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Log in'; }
        setLiError(window.RaiseSupabase.friendlyAuthError(err));
      });
    });
  }

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

  // Initial check + live auth events (including other tabs).
  refreshAuthState();
  if (window.RaiseSupabase) window.RaiseSupabase.onAuthStateChange(function () { refreshAuthState(); });
})();
