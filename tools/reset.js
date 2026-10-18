/* Reset password page: handles the Supabase recovery link.
 * Two link shapes: token hash (#access_token=...&type=recovery) and PKCE
 * (?code=...). Both end in a session, then the founder sets a new password.
 * Without a valid link, the page offers to send a fresh reset email. */
(function () {
  function $(id) { return document.getElementById(id); }

  function show(id) { var el = $(id); if (el) el.hidden = false; }
  function hide(id) { var el = $(id); if (el) el.hidden = true; }

  function setError(msg) {
    var el = $('reset-error');
    if (el) { el.textContent = msg; el.hidden = false; }
  }
  function setSuccess(msg) {
    var el = $('reset-success');
    if (el) { el.textContent = msg; el.hidden = false; }
  }

  function hasRecoveryHash() {
    var h = window.location.hash || '';
    return h.indexOf('type=recovery') !== -1 && h.indexOf('access_token=') !== -1;
  }

  function getCodeParam() {
    try { return new URLSearchParams(window.location.search).get('code') || ''; }
    catch (e) { return ''; }
  }

  function init() {
    if (!window.RaiseSupabase || !window.RaiseSupabase.isConfigured()) {
      setError('Password reset is being set up. Come back shortly.');
      return;
    }
    var code = getCodeParam();
    var start = code
      ? window.RaiseSupabase.exchangeCode(code)
      : Promise.resolve(null);
    start.then(function () {
      return window.RaiseSupabase.getSessionUser();
    }).then(function (user) {
      if (user || hasRecoveryHash()) {
        // Valid recovery session (hash links are parsed by the client on load).
        show('new-password-block');
      } else {
        show('request-block');
        setError('This reset link is invalid or expired. Request a fresh one below.');
      }
    }).catch(function () {
      show('request-block');
      setError('This reset link is invalid or expired. Request a fresh one below.');
    });

    var newForm = $('new-password-form');
    if (newForm) newForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = ($('np-password') || {}).value || '';
      var confirm = ($('np-confirm') || {}).value || '';
      if (!pw) { setError('New password is required.'); return; }
      if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (pw !== confirm) { setError('Passwords do not match.'); return; }
      window.RaiseSupabase.updatePassword(pw).then(function () {
        hide('new-password-block');
        setSuccess('Password updated. You are logged in. Head to the tools.');
        show('done-links');
      }).catch(function (ex) {
        setError(window.RaiseSupabase.friendlyAuthError(ex));
      });
    });

    var reqForm = $('request-form');
    if (reqForm) reqForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = ($('rq-email') || {}).value ? $('rq-email').value.trim() : '';
      if (!email) { setError('Email is required.'); return; }
      window.RaiseSupabase.sendPasswordReset(email).then(function () {
        setSuccess('Check your email for a fresh password reset link.');
      }).catch(function (ex) {
        setError(window.RaiseSupabase.friendlyAuthError(ex));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  window.RaiseReset = { init: init };
})();
