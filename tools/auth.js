/* Raise Tools shared auth.
 * Two ways in:
 *  1. Password account: sign up with full name, country, company name,
 *     stage raising, LinkedIn link (optional), password + confirm password.
 *     The account lives in this browser's localStorage: profile + SHA-256
 *     password hash, never the plaintext password. Log in with full name
 *     + password. One account per device. No backend, so accounts do not
 *     roam across devices and Raise never receives the profile.
 *  2. Google (Google Identity Services) when an OAuth client ID is
 *     configured. First-time Google sign-in = sign up; returning = log in.
 * The session lives in localStorage, so one sign-up / log-in covers all
 * tools, all tabs, and return visits on this device, until Sign out.
 * A legacy sessionStorage session (from the older gate) is migrated to
 * localStorage on first read. */
(function () {
  var SESSION_KEY = 'raise_auth_user';
  var ACCOUNT_KEY = 'raise_account';

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

  function cfg() { return window.RAISE_TOOLS_CONFIG || {}; }

  function isConfigured() {
    var id = cfg().GOOGLE_OAUTH_CLIENT_ID || '';
    return id && id.indexOf('[FILL') !== 0;
  }

  function $(id) { return document.getElementById(id); }

  function getUser() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
      // Migrate a legacy sessionStorage session (older gate) once.
      var legacy = sessionStorage.getItem(SESSION_KEY);
      if (legacy) {
        try { localStorage.setItem(SESSION_KEY, legacy); } catch (e) {}
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
        return JSON.parse(legacy);
      }
      return null;
    } catch (e) { return null; }
  }

  function isSignedIn() { return !!getUser(); }

  function setUser(u) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) {}
    render();
  }

  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    try { sessionStorage.removeItem('raise_sheets_token'); } catch (e) {}
    render();
  }

  function getAccount() {
    try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); } catch (e) { return null; }
  }

  function getProfile() {
    var a = getAccount();
    if (!a) return null;
    return { fullName: a.fullName, country: a.country, company: a.company, stage: a.stage, linkedin: a.linkedin || '' };
  }

  function hashPassword(pw) {
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) return Promise.resolve(null);
    var data = new TextEncoder().encode(pw);
    return window.crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
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

  function validSignup(f) {
    if (!f.fullName) return 'Full name is required.';
    if (!f.country) return 'Country is required.';
    if (!f.company) return 'Company name is required.';
    if (!f.stage) return 'Stage you are raising is required.';
    if (f.linkedin && !/^https?:\/\/.+/i.test(f.linkedin)) return 'LinkedIn link must start with https://';
    if (!f.password) return 'Password is required.';
    if (f.password.length < 8) return 'Password must be at least 8 characters.';
    if (f.password !== f.confirm) return 'Passwords do not match.';
    return null;
  }

  function handleSignup(e) {
    e.preventDefault();
    clearError();
    var f = {
      fullName: ($('su-name') || {}).value ? $('su-name').value.trim() : '',
      country: ($('su-country') || {}).value ? $('su-country').value.trim() : '',
      company: ($('su-company') || {}).value ? $('su-company').value.trim() : '',
      stage: ($('su-stage') || {}).value || '',
      linkedin: ($('su-linkedin') || {}).value ? $('su-linkedin').value.trim() : '',
      password: ($('su-password') || {}).value || '',
      confirm: ($('su-confirm') || {}).value || ''
    };
    var err = validSignup(f);
    if (err) { showError(err); return; }
    if (getAccount()) { showForm('login'); showError('An account already exists on this device. Log in instead.'); return; }
    hashPassword(f.password).then(function (hash) {
      if (!hash) { showError('Password sign-up needs a secure connection (HTTPS). Use Google instead.'); return; }
      try {
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
          fullName: f.fullName, country: f.country, company: f.company,
          stage: f.stage, linkedin: f.linkedin, passHash: hash,
          provider: 'password', createdAt: new Date().toISOString()
        }));
      } catch (ex) { showError('Could not save the account on this device.'); return; }
      setUser({
        name: f.fullName, email: '', picture: '', mode: 'password',
        profile: { country: f.country, company: f.company, stage: f.stage, linkedin: f.linkedin },
        signedInAt: new Date().toISOString()
      });
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    clearError();
    var name = ($('li-name') || {}).value ? $('li-name').value.trim() : '';
    var pw = ($('li-password') || {}).value || '';
    if (!name) { showError('Full name is required.'); return; }
    if (!pw) { showError('Password is required.'); return; }
    var account = getAccount();
    if (!account) { showForm('signup'); showError('No account on this device yet. Create one below.'); return; }
    if (account.fullName.trim().toLowerCase() !== name.toLowerCase()) {
      showError('No account with that full name on this device.');
      return;
    }
    hashPassword(pw).then(function (hash) {
      if (!hash) { showError('Log in needs a secure connection (HTTPS).'); return; }
      if (hash !== account.passHash) { showError('Wrong password. Try again.'); return; }
      setUser({
        name: account.fullName, email: '', picture: '', mode: 'password',
        profile: { country: account.country, company: account.company, stage: account.stage, linkedin: account.linkedin || '' },
        signedInAt: new Date().toISOString()
      });
    });
  }

  function decodeJwt(token) {
    var parts = token.split('.');
    var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    return JSON.parse(atob(payload));
  }

  function onGoogleCredential(resp) {
    try {
      var p = decodeJwt(resp.credential);
      setUser({
        name: p.name || 'Google user',
        email: p.email || '',
        picture: p.picture || '',
        mode: 'google',
        sub: p.sub || '',
        signedInAt: new Date().toISOString()
      });
    } catch (e) { /* invalid credential: stay signed out */ }
  }

  function render() {
    var user = getUser();
    var status = $('auth-status');
    var signout = $('signout-btn');
    var localBanner = $('local-banner');
    var gate = $('gate');
    var app = $('app');
    if (status) {
      status.textContent = user
        ? (user.mode === 'google' ? ('Signed in as ' + (user.email || user.name)) : ('Signed in as ' + user.name))
        : 'Not signed in';
    }
    if (signout) signout.hidden = !user;
    if (localBanner) localBanner.hidden = !(user && (user.mode === 'local' || user.mode === 'password'));
    if (gate && app) { gate.hidden = !!user; app.hidden = !user; }
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
    showForm(getAccount() ? 'login' : 'signup');
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

    var googleBtn = $('google-btn');
    var holder = $('google-btn-holder');
    var banner = $('sheets-banner');

    if (!isConfigured()) {
      if (banner) banner.hidden = false;
      if (googleBtn) googleBtn.addEventListener('click', function () {
        if (banner) { banner.hidden = false; banner.scrollIntoView(); }
      });
    } else {
      if (googleBtn) googleBtn.hidden = true;
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = function () {
        window.google.accounts.id.initialize({
          client_id: cfg().GOOGLE_OAUTH_CLIENT_ID,
          callback: onGoogleCredential
        });
        if (holder) {
          window.google.accounts.id.renderButton(holder, {
            theme: 'filled_black', size: 'large', text: 'continue_with', width: 320
          });
        }
      };
      document.head.appendChild(s);
    }

    var signout = $('signout-btn');
    if (signout) signout.addEventListener('click', signOut);
  }

  // Keep every open tool tab in sync: logging in or out in one tab
  // updates the gate in all the others without a reload.
  window.addEventListener('storage', function (e) {
    if (e && e.key === SESSION_KEY) render();
  });

  document.addEventListener('DOMContentLoaded', initGate);
  window.RaiseAuth = {
    isConfigured: isConfigured,
    getUser: getUser,
    isSignedIn: isSignedIn,
    getProfile: getProfile,
    signOut: signOut
  };
})();
