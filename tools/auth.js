/* Raise Tools shared auth.
 * Sign up and log in are ONE "Continue with Google" flow (Google Identity
 * Services). First-time Google sign-in = sign up; returning = log in.
 * NO passwords anywhere. Without a configured OAuth client ID, the tools
 * fall back to local mode (saved on this device only). */
(function () {
  var SESSION_KEY = 'raise_auth_user';

  function cfg() { return window.RAISE_TOOLS_CONFIG || {}; }

  function isConfigured() {
    var id = cfg().GOOGLE_OAUTH_CLIENT_ID || '';
    return id && id.indexOf('[FILL') !== 0;
  }

  function getUser() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }

  function isSignedIn() { return !!getUser(); }

  function setUser(u) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) {}
    render();
  }

  function signInLocal() {
    setUser({ name: 'Local user', email: '', picture: '', mode: 'local', signedInAt: new Date().toISOString() });
  }

  function signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    try { sessionStorage.removeItem('raise_sheets_token'); } catch (e) {}
    render();
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
    var status = document.getElementById('auth-status');
    var signout = document.getElementById('signout-btn');
    var localBanner = document.getElementById('local-banner');
    var gate = document.getElementById('gate');
    var app = document.getElementById('app');
    if (status) {
      status.textContent = user
        ? (user.mode === 'local' ? 'Signed in on this device' : ('Signed in as ' + (user.email || user.name)))
        : 'Not signed in';
    }
    if (signout) signout.hidden = !user;
    if (localBanner) localBanner.hidden = !(user && user.mode === 'local');
    if (gate && app) { gate.hidden = !!user; app.hidden = !user; }
  }

  function initGate() {
    render();
    var googleBtn = document.getElementById('google-btn');
    var holder = document.getElementById('google-btn-holder');
    var localBtn = document.getElementById('local-btn');
    var banner = document.getElementById('sheets-banner');

    if (!isConfigured()) {
      if (banner) banner.hidden = false;
      if (localBtn) localBtn.hidden = false;
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

    if (localBtn) localBtn.addEventListener('click', function () { signInLocal(); });
    var signout = document.getElementById('signout-btn');
    if (signout) signout.addEventListener('click', signOut);
  }

  document.addEventListener('DOMContentLoaded', initGate);
  window.RaiseAuth = {
    isConfigured: isConfigured,
    getUser: getUser,
    isSignedIn: isSignedIn,
    signInLocal: signInLocal,
    signOut: signOut
  };
})();
