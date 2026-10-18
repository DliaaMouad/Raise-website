/* Raise Tools shared Supabase client.
 * Used by BOTH the in-tool gate (tools/auth.js) and the Tools landing page
 * (tools-auth.js), so founders have ONE account system across the whole
 * Raise Tools surface: sign up once, log in anywhere.
 * Only the anon (publishable) key goes in tools/config.js. It is safe to
 * ship in browser code; Row Level Security on the profiles table is what
 * protects founder data. NEVER put the service_role key in any file
 * shipped to the browser. */
(function () {
  var clientPromise = null;

  function cfg() { return window.RAISE_TOOLS_CONFIG || {}; }

  function isConfigured() {
    var url = cfg().SUPABASE_URL || '';
    var key = cfg().SUPABASE_ANON_KEY || '';
    return !!(url && url.indexOf('[FILL') !== 0 && key && key.indexOf('[FILL') !== 0);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load the Supabase library. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = new Promise(function (resolve, reject) {
      if (!isConfigured()) { reject(new Error('Supabase is not configured yet.')); return; }
      var create = function () {
        try {
          resolve(window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY));
        } catch (e) { reject(e); }
      };
      if (window.supabase && window.supabase.createClient) { create(); return; }
      loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2').then(create, reject);
    });
    return clientPromise;
  }

  function profileFromMetadata(user) {
    var m = (user && user.user_metadata) || {};
    return {
      id: user.id,
      email: user.email || '',
      full_name: m.full_name || '',
      country: m.country || '',
      company: m.company || '',
      stage: m.stage || '',
      linkedin: m.linkedin || '',
      twitter: m.twitter || ''
    };
  }

  function fetchProfile(client, userId) {
    return client.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(function (res) { return res.data || null; });
  }

  function ensureProfile(client, user) {
    return fetchProfile(client, user.id).then(function (existing) {
      if (existing) return existing;
      var p = profileFromMetadata(user);
      return client.from('profiles').upsert(p).select().single()
        .then(function (res) { return res.data || p; })
        .catch(function () { return p; });
    });
  }

  function getSessionUser() {
    return getClient().then(function (client) {
      return client.auth.getSession().then(function (res) {
        return (res.data && res.data.session && res.data.session.user) || null;
      });
    });
  }

  function signUp(opts) {
    return getClient().then(function (client) {
      return client.auth.signUp({
        email: opts.email,
        password: opts.password,
        options: { data: opts.profile || {} }
      }).then(function (res) {
        if (res.error) throw res.error;
        var user = res.data && res.data.user;
        var hasSession = !!(res.data && res.data.session);
        if (!user) throw new Error('Sign-up did not return an account. Try again.');
        if (!hasSession) return { user: user, profile: profileFromMetadata(user), needsConfirmation: true };
        return ensureProfile(client, user).then(function (profile) {
          return { user: user, profile: profile, needsConfirmation: false };
        });
      });
    });
  }

  function signIn(email, password) {
    return getClient().then(function (client) {
      return client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          var user = res.data && res.data.user;
          if (!user) throw new Error('Log-in did not return an account. Try again.');
          return ensureProfile(client, user).then(function (profile) {
            return { user: user, profile: profile };
          });
        });
    });
  }

  function signOut() {
    return getClient().then(function (client) { return client.auth.signOut(); });
  }

  function onAuthStateChange(cb) {
    getClient().then(function (client) {
      client.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') cb(event);
      });
    }).catch(function () { /* Supabase not configured: no live auth events */ });
  }

  function friendlyAuthError(err) {
    var msg = (err && err.message) || 'Something went wrong. Try again.';
    if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
    if (/user already registered/i.test(msg)) return 'An account with this email already exists. Log in instead.';
    if (/password should be at least/i.test(msg)) return 'Password must be at least 8 characters.';
    if (/email.*not confirmed|email link is invalid/i.test(msg)) return 'Confirm your email first (check your inbox), then log in.';
    if (/too many requests|rate limit/i.test(msg)) return 'Too many attempts. Wait a minute and try again.';
    return msg;
  }

  window.RaiseSupabase = {
    isConfigured: isConfigured,
    getClient: getClient,
    getSessionUser: getSessionUser,
    ensureProfile: ensureProfile,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    onAuthStateChange: onAuthStateChange,
    friendlyAuthError: friendlyAuthError
  };
})();
