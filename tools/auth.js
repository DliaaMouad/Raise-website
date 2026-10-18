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
  var cachedUser = null;
  var cachedProfile = null;

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

  function showForm(which) {
    var signup = $('signup-form');
    var login = $('login-form');
    var title = $('gate-title');
    var toLogin = $('show-login');
    var toSignup = $('show-signup');
    clearError();
    if (signup) signup.hidden = which !== 'signup';
    if (login) login.hidden = which !== 'login';
    if (title) title.textContent = which === 'login' ? 'Welcome back' : 'Create your account';
    if (toLogin) toLogin.hidden = which !== 'signup';
    if (toSignup) toSignup.hidden = which !== 'login';
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

  function refreshSession() {
    if (!isSupabaseConfigured()) { cachedUser = null; cachedProfile = null; render(); return; }
    window.RaiseSupabase.getSessionUser().then(function (user) {
      if (!user) { cachedUser = null; cachedProfile = null; render(); return; }
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

    // Google sign-in for accounts comes later via Supabase OAuth (needs the
    // provider configured in the Supabase dashboard). Until then the gate
    // is email + password only. Sheets connect lives inside each tool.
    var googleBtn = $('google-btn');
    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.textContent = 'Google sign-in coming soon';
    }

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
