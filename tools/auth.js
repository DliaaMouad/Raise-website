/* Raise Tools shared auth (in-tool gate).
 * ONE account system, shared with the Tools landing page (tools-auth.js):
 * Supabase Auth + a profiles row. Sign up once, log in anywhere, on any
 * device. Passwords live in Supabase Auth, never in our tables or in the
 * browser. The Google button below is unchanged: it connects the founder's
 * own Google Sheet for tool data (needs the Google OAuth client ID).
 * If Supabase is not configured yet, the forms show a setup notice instead
 * of failing. */
(function () {
  var COUNTRIES = ['Algeria', 'Argentina', 'Australia', 'Austria', 'Bahrain', 'Bangladesh',
    'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia',
    'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
    'Germany', 'Ghana', 'Greece', 'Hong Kong', 'Hungary', 'India', 'Indonesia', 'Iran',
    'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
    'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Morocco',
    'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Philippines', 'Poland',
    'Portugal', 'Qatar', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia',
    'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan',
    'Thailand', 'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Vietnam', 'Other'];

  var SETUP_MSG = 'Founder accounts are being set up. Come back shortly.';
  var LEGACY_ACCOUNT_KEY = 'raise_account';
  var LEGACY_SESSION_KEY = 'raise_auth_user';
  var cachedUser = null;
  var cachedProfile = null;

  // SHA-256, only used to verify a legacy local-account password during
  // migration. Passwords for real accounts live in Supabase Auth.
  function hashPassword(pw) {
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) return Promise.resolve(null);
    var data = new TextEncoder().encode(pw);
    return window.crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  // Legacy account from the short window the browser-only gate was live:
  // localStorage 'raise_account' (profile + password hash, no email), or a
  // leftover 'raise_auth_user' session with a password profile.
  function getLegacyAccount() {
    try {
      var raw = localStorage.getItem(LEGACY_ACCOUNT_KEY);
      if (raw) {
        var a = JSON.parse(raw);
        if (a && a.fullName) return a;
      }
    } catch (e) { /* no usable legacy account */ }
    try {
      var s = JSON.parse(localStorage.getItem(LEGACY_SESSION_KEY) || 'null');
      if (s && s.mode === 'password' && s.profile) {
        return { fullName: s.name || '', country: s.profile.country || '',
          company: s.profile.company || '', stage: s.profile.stage || '',
          linkedin: s.profile.linkedin || '', passHash: null };
      }
    } catch (e) { /* no usable legacy session */ }
    return null;
  }

  function clearLegacyAccount() {
    try { localStorage.removeItem(LEGACY_ACCOUNT_KEY); } catch (e) {}
    try { localStorage.removeItem(LEGACY_SESSION_KEY); } catch (e) {}
    try { sessionStorage.removeItem(LEGACY_SESSION_KEY); } catch (e) {}
    var block = $('migration-block');
    if (block) block.hidden = true;
  }

  function cfg() { return window.RAISE_TOOLS_CONFIG || {}; }

  // Google OAuth client ID for Sheets connect (kept separate from Supabase).
  function isConfigured() {
    var id = cfg().GOOGLE_OAUTH_CLIENT_ID || '';
    return id && id.indexOf('[FILL') !== 0;
  }

  function isSupabaseConfigured() {
    return window.RaiseSupabase && window.RaiseSupabase.isConfigured();
  }

  function $(id) { return document.getElementById(id); }

  function getUser() { return cachedUser; }
  function isSignedIn() { return !!cachedUser; }
  function getProfile() { return cachedProfile; }

  function signOut() {
    try { sessionStorage.removeItem('raise_sheets_token'); } catch (e) {}
    cachedUser = null;
    cachedProfile = null;
    render();
    if (isSupabaseConfigured()) {
      window.RaiseSupabase.signOut().catch(function () { /* already signed out */ });
    }
  }

  function showError(msg) {
    var el = $('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError() {
    var el = $('auth-error');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  function showSuccess(msg) {
    var el = $('auth-success');
    if (!el) {
      el = document.createElement('p');
      el.id = 'auth-success';
      el.className = 'auth-success';
      el.hidden = true;
      var err = $('auth-error');
      if (err && err.parentNode) err.parentNode.insertBefore(el, err.nextSibling);
      else return;
    }
    el.textContent = msg;
    el.hidden = false;
  }

  function clearSuccess() {
    var el = $('auth-success');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  function showForm(which) {
    var signup = $('signup-form');
    var login = $('login-form');
    var forgot = $('forgot-form');
    var title = $('gate-title');
    var toLogin = $('show-login');
    var toSignup = $('show-signup');
    clearError();
    clearSuccess();
    if (signup) signup.hidden = which !== 'signup';
    if (login) login.hidden = which !== 'login';
    if (forgot) forgot.hidden = which !== 'forgot';
    var migration = $('migration-block');
    if (migration && which !== 'signup') migration.hidden = true;
    if (title) title.textContent = which === 'login' ? 'Welcome back' : which === 'forgot' ? 'Reset your password' : 'Create your account';
    if (toLogin) toLogin.hidden = which !== 'signup';
    if (toSignup) toSignup.hidden = which !== 'login' && which !== 'forgot';
    var toForgot = $('show-forgot');
    if (toForgot) toForgot.hidden = which !== 'login';
  }

  function setBusy(formId, busy, label) {
    var btn = document.querySelector('#' + formId + ' button[type="submit"]');
    if (btn) {
      btn.disabled = busy;
      if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label; }
      else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
    }
  }

  function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

  function validSignup(f) {
    if (!f.fullName) return 'Full name is required.';
    if (!f.email) return 'Email is required.';
    if (!validEmail(f.email)) return 'Enter a valid email address.';
    if (!f.country) return 'Country is required.';
    if (!f.company) return 'Company name is required.';
    if (!f.stage) return 'Stage you are raising is required.';
    if (f.linkedin && !/^https?:\/\/.+/i.test(f.linkedin)) return 'LinkedIn link must start with https://';
    if (!f.password) return 'Password is required.';
    if (f.password.length < 8) return 'Password must be at least 8 characters.';
    if (f.password !== f.confirm) return 'Passwords do not match.';
    return null;
  }

  // Move a legacy browser-only account into Supabase. The founder adds the
  // email their old account never had, and confirms the old password.
  // Profile (name, country, company, stage, LinkedIn) carries over, so
  // nothing has to be retyped. The legacy account is deleted once the
  // Supabase account exists.
  function handleMigration(e) {
    e.preventDefault();
    clearError();
    clearSuccess();
    if (!isSupabaseConfigured()) { showError(SETUP_MSG); return; }
    var legacy = getLegacyAccount();
    if (!legacy) { showError('No earlier account found on this device.'); return; }
    var email = ($('mg-email') || {}).value ? $('mg-email').value.trim() : '';
    var pw = ($('mg-password') || {}).value || '';
    if (!email) { showError('Email is required.'); return; }
    if (!validEmail(email)) { showError('Enter a valid email address.'); return; }
    if (!pw) { showError('Your earlier password is required.'); return; }
    setBusy('migration-form', true, 'Moving your account...');
    var verify = legacy.passHash
      ? hashPassword(pw).then(function (hash) { return hash === legacy.passHash; })
      : Promise.resolve(true);
    verify.then(function (ok) {
      if (!ok) throw new Error('WRONG_LEGACY_PASSWORD');
      return window.RaiseSupabase.signUp({
        email: email,
        password: pw,
        profile: {
          full_name: legacy.fullName, country: legacy.country || '',
          company: legacy.company || '', stage: legacy.stage || '',
          linkedin: legacy.linkedin || '', twitter: ''
        }
      });
    }).then(function (res) {
      setBusy('migration-form', false);
      if (res.needsConfirmation) {
        showForm('login');
        showError('Check your email to confirm your account, then log in.');
        return;
      }
      cachedUser = res.user;
      cachedProfile = res.profile;
      clearLegacyAccount();
      render();
      showSuccess('Your earlier account is moved. You are logged in.');
    }).catch(function (ex) {
      setBusy('migration-form', false);
      if (ex && ex.message === 'WRONG_LEGACY_PASSWORD') {
        showError('That password does not match your earlier account.');
        return;
      }
      if (ex && /user already registered/i.test(ex.message || '')) {
        clearLegacyAccount();
        showForm('login');
        showError('An account with this email already exists. Log in instead.');
        return;
      }
      showError(window.RaiseSupabase.friendlyAuthError(ex));
    });
  }

  function handleForgot(e) {
    e.preventDefault();
    clearError();
    clearSuccess();
    if (!isSupabaseConfigured()) { showError(SETUP_MSG); return; }
    var email = ($('fp-email') || {}).value ? $('fp-email').value.trim() : '';
    if (!email) { showError('Email is required.'); return; }
    if (!validEmail(email)) { showError('Enter a valid email address.'); return; }
    setBusy('forgot-form', true, 'Sending...');
    window.RaiseSupabase.sendPasswordReset(email).then(function () {
      setBusy('forgot-form', false);
      showForm('login');
      showSuccess('Check your email for a password reset link.');
    }).catch(function (ex) {
      setBusy('forgot-form', false);
      showError(window.RaiseSupabase.friendlyAuthError(ex));
    });
  }

  // The migration block, forgot form, and "Forgot password?" link are
  // injected by JS so the six tool pages keep one identical gate block.
  function buildGateExtras() {
    var signup = $('signup-form');
    var login = $('login-form');
    if (signup && !$('migration-block')) {
      var block = document.createElement('div');
      block.id = 'migration-block';
      block.className = 'auth-form';
      block.hidden = true;
      block.innerHTML =
        '<p class="gate-sub">You have an account from an earlier version. Add your email and confirm your earlier password to move it. Nothing else to retype.</p>' +
        '<form id="migration-form" class="auth-form" novalidate>' +
        '<label for="mg-email">Email *</label>' +
        '<input id="mg-email" type="email" autocomplete="email" required>' +
        '<label for="mg-password">Earlier password *</label>' +
        '<input id="mg-password" type="password" autocomplete="current-password" required>' +
        '<p><button class="btn btn-lime auth-submit" type="submit">Move my account</button></p>' +
        '</form>';
      signup.parentNode.insertBefore(block, signup);
      var mgForm = $('migration-form');
      if (mgForm) mgForm.addEventListener('submit', handleMigration);
    }
    if (login && !$('forgot-form')) {
      var forgot = document.createElement('form');
      forgot.id = 'forgot-form';
      forgot.className = 'auth-form';
      forgot.hidden = true;
      forgot.setAttribute('novalidate', '');
      forgot.innerHTML =
        '<label for="fp-email">Email *</label>' +
        '<input id="fp-email" type="email" autocomplete="email" required>' +
        '<p><button class="btn btn-lime auth-submit" type="submit">Send reset link</button></p>' +
        '<p class="auth-switch"><button type="button" class="link-btn" id="back-to-login">Back to log in</button></p>';
      login.parentNode.insertBefore(forgot, login.nextSibling);
      forgot.addEventListener('submit', handleForgot);
      var back = $('back-to-login');
      if (back) back.addEventListener('click', function () { showForm('login'); });
    }
    if (login && !$('show-forgot')) {
      var link = document.createElement('p');
      link.className = 'auth-switch';
      link.innerHTML = '<button type="button" class="link-btn" id="show-forgot">Forgot password?</button>';
      login.parentNode.insertBefore(link, login.nextSibling);
      var btn = $('show-forgot');
      if (btn) btn.addEventListener('click', function () { showForm('forgot'); });
    }
  }

  function refreshSession() {
    if (!isSupabaseConfigured()) { cachedUser = null; cachedProfile = null; render(); return; }
    window.RaiseSupabase.getSessionUser().then(function (user) {
      if (!user) { cachedUser = null; cachedProfile = null; render(); return; }
      clearLegacyAccount();
      cachedUser = user;
      window.RaiseSupabase.getClient().then(function (client) {
        return window.RaiseSupabase.ensureProfile(client, user);
      }).then(function (profile) {
        cachedProfile = profile;
        render();
      }).catch(function () { cachedProfile = null; render(); });
    }).catch(function () { cachedUser = null; cachedProfile = null; render(); });
  }

  function handleSignup(e) {
    e.preventDefault();
    clearError();
    if (!isSupabaseConfigured()) { showError(SETUP_MSG); return; }
    var f = {
      fullName: ($('su-name') || {}).value ? $('su-name').value.trim() : '',
      email: ($('su-email') || {}).value ? $('su-email').value.trim() : '',
      country: ($('su-country') || {}).value ? $('su-country').value.trim() : '',
      company: ($('su-company') || {}).value ? $('su-company').value.trim() : '',
      stage: ($('su-stage') || {}).value || '',
      linkedin: ($('su-linkedin') || {}).value ? $('su-linkedin').value.trim() : '',
      password: ($('su-password') || {}).value || '',
      confirm: ($('su-confirm') || {}).value || ''
    };
    var err = validSignup(f);
    if (err) { showError(err); return; }
    setBusy('signup-form', true, 'Creating account...');
    window.RaiseSupabase.signUp({
      email: f.email,
      password: f.password,
      profile: {
        full_name: f.fullName, country: f.country, company: f.company,
        stage: f.stage, linkedin: f.linkedin, twitter: ''
      }
    }).then(function (res) {
      setBusy('signup-form', false);
      if (res.needsConfirmation) {
        showForm('login');
        showError('Check your email to confirm your account, then log in.');
        return;
      }
      cachedUser = res.user;
      cachedProfile = res.profile;
      clearLegacyAccount();
      render();
    }).catch(function (ex) {
      setBusy('signup-form', false);
      showError(window.RaiseSupabase.friendlyAuthError(ex));
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    clearError();
    if (!isSupabaseConfigured()) { showError(SETUP_MSG); return; }
    var email = ($('li-email') || {}).value ? $('li-email').value.trim() : '';
    var pw = ($('li-password') || {}).value || '';
    if (!email) { showError('Email is required.'); return; }
    if (!validEmail(email)) { showError('Enter a valid email address.'); return; }
    if (!pw) { showError('Password is required.'); return; }
    setBusy('login-form', true, 'Logging in...');
    window.RaiseSupabase.signIn(email, pw).then(function (res) {
      setBusy('login-form', false);
      cachedUser = res.user;
      cachedProfile = res.profile;
      clearLegacyAccount();
      render();
    }).catch(function (ex) {
      setBusy('login-form', false);
      showError(window.RaiseSupabase.friendlyAuthError(ex));
    });
  }

  function render() {
    var user = cachedUser;
    var status = $('auth-status');
    var signout = $('signout-btn');
    var localBanner = $('local-banner');
    var gate = $('gate');
    var app = $('app');
    if (status) {
      status.textContent = user
        ? ('Signed in as ' + ((cachedProfile && cachedProfile.full_name) || user.email || ''))
        : 'Not signed in';
    }
    if (signout) signout.hidden = !user;
    if (localBanner) localBanner.hidden = true;
    if (gate && app) { gate.hidden = !!user; app.hidden = !user; }
    var migration = $('migration-block');
    if (migration) migration.hidden = !(!user && isSupabaseConfigured() && !!getLegacyAccount());
    if (gate && !user && !isSupabaseConfigured()) {
      var title = $('gate-title');
      if (title) title.textContent = 'Create your account';
      showError(SETUP_MSG);
    }
  }

  function bindToggle(checkboxId, inputIds) {
    var box = $(checkboxId);
    if (!box) return;
    box.addEventListener('change', function () {
      inputIds.forEach(function (id) {
        var input = $(id);
        if (input) input.type = box.checked ? 'text' : 'password';
      });
    });
  }

  function initGate() {
    render();
    var list = $('country-list');
    if (list) {
      COUNTRIES.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c;
        list.appendChild(opt);
      });
    }
    buildGateExtras();
    showForm('signup');
    var signupForm = $('signup-form');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    var loginForm = $('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    var toLogin = $('show-login');
    if (toLogin) toLogin.addEventListener('click', function () { showForm('login'); });
    var toSignup = $('show-signup');
    if (toSignup) toSignup.addEventListener('click', function () { showForm('signup'); });
    bindToggle('su-show', ['su-password', 'su-confirm']);
    bindToggle('li-show', ['li-password']);

    var signout = $('signout-btn');
    if (signout) signout.addEventListener('click', signOut);

    // Live session: first load + every sign-in / sign-out (including other tabs).
    refreshSession();
    if (window.RaiseSupabase) window.RaiseSupabase.onAuthStateChange(function () { refreshSession(); });
  }

  document.addEventListener('DOMContentLoaded', initGate);
  window.RaiseAuth = {
    isConfigured: isConfigured,
    isSupabaseConfigured: isSupabaseConfigured,
    getUser: getUser,
    isSignedIn: isSignedIn,
    getProfile: getProfile,
    signOut: signOut
  };
})();
