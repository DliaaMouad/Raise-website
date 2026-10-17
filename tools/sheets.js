/* Raise Tools Google Sheets storage.
 * Data lives in the USER'S OWN Google account (a "Raise Tools" spreadsheet
 * in their Drive, one tab per tool) via Sheets API v4. Nothing is sent to
 * Raise servers. Without a configured OAuth client ID, everything stays in
 * localStorage on the device. */
(function () {
  var SHEET_ID_KEY = 'raise_sheets_id';
  var TOKEN_KEY = 'raise_sheets_token';
  var TAB_BY_KEY = {
    crm: 'CRM',
    outreach: 'Outreach',
    readiness: 'Readiness',
    financials: 'Financials',
    vault: 'Vault',
    simulation: 'Simulation'
  };
  var SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

  function cfg() { return window.RAISE_TOOLS_CONFIG || {}; }

  function isConfigured() { return window.RaiseAuth && window.RaiseAuth.isConfigured(); }

  function saveLocal(key, data) {
    try { localStorage.setItem('raise_tool_' + key, JSON.stringify(data)); } catch (e) {}
  }

  function loadLocal(key, fallback) {
    try {
      var raw = localStorage.getItem('raise_tool_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function getToken() {
    try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) { return null; }
  }

  function setToken(t) {
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) {}
  }

  function isConnected() {
    var t = getToken();
    return !!(t && t.access_token && t.expires_at && t.expires_at > Date.now());
  }

  function getSheetId() {
    try { return localStorage.getItem(SHEET_ID_KEY) || ''; } catch (e) { return ''; }
  }

  function setSheetId(id) {
    try { localStorage.setItem(SHEET_ID_KEY, id); } catch (e) {}
  }

  function status(msg) {
    var el = document.getElementById('sync-status');
    if (el) el.textContent = msg;
  }

  function showBanner() {
    var b = document.getElementById('sheets-banner');
    if (b) { b.hidden = false; }
  }

  function connect() {
    if (!isConfigured()) {
      showBanner();
      status('Google connect needs an OAuth client ID to be configured.');
      return false;
    }
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      requestToken();
    } else {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = function () { requestToken(); };
      document.head.appendChild(s);
    }
    return true;
  }

  function requestToken() {
    var client = window.google.accounts.oauth2.initTokenClient({
      client_id: cfg().GOOGLE_OAUTH_CLIENT_ID,
      scope: SHEETS_SCOPE,
      callback: function (resp) {
        if (resp && resp.access_token) {
          setToken({ access_token: resp.access_token, expires_at: Date.now() + (resp.expires_in || 3600) * 1000 });
          status('Connected to Google Sheets.');
          ensureSpreadsheet();
        } else {
          status('Google Sheets connect was not completed.');
        }
      }
    });
    client.requestAccessToken();
  }

  function api(path, method, body, cb) {
    var t = getToken();
    if (!t) { status('Connect Google Sheets first.'); return; }
    fetch('https://sheets.googleapis.com/v4/' + path, {
      method: method || 'GET',
      headers: { 'Authorization': 'Bearer ' + t.access_token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (json) { cb(json); })
      .catch(function () { status('Sheets request failed. Try connecting again.'); });
  }

  function ensureSpreadsheet(cb) {
    var existing = getSheetId();
    if (existing) { if (cb) cb(existing); return; }
    var tabs = ['CRM', 'Outreach', 'Readiness', 'Financials', 'Vault', 'Simulation'];
    api('spreadsheets', 'POST', {
      properties: { title: cfg().SHEETS_TITLE || 'Raise Tools' },
      sheets: tabs.map(function (t) { return { properties: { title: t } }; })
    }, function (json) {
      if (json && json.spreadsheetId) {
        setSheetId(json.spreadsheetId);
        status('Created "Raise Tools" spreadsheet in your Drive.');
        if (cb) cb(json.spreadsheetId);
      } else {
        status('Could not create the spreadsheet. Check the connection and try again.');
      }
    });
  }

  function syncTool(key, data) {
    if (!isConnected()) { status('Connect Google Sheets first.'); return; }
    var tab = TAB_BY_KEY[key];
    if (!tab) { status('Unknown tool for sync.'); return; }
    ensureSpreadsheet(function (id) {
      api('spreadsheets/' + id + '/values/' + encodeURIComponent(tab) + '!A1?valueInputOption=RAW', 'PUT', {
        range: tab + '!A1',
        values: [[JSON.stringify(data)]]
      }, function (json) {
        if (json && !json.error) status('Synced to your Google Sheet.');
        else status('Sync failed. Try connecting again.');
      });
    });
  }

  function pullTool(key, onData) {
    if (!isConnected()) { status('Connect Google Sheets first.'); return; }
    var tab = TAB_BY_KEY[key];
    if (!tab) { status('Unknown tool for sync.'); return; }
    var id = getSheetId();
    if (!id) { status('No spreadsheet found. Sync once first.'); return; }
    api('spreadsheets/' + id + '/values/' + encodeURIComponent(tab) + '!A1', 'GET', null, function (json) {
      try {
        var raw = json && json.values && json.values[0] && json.values[0][0];
        if (raw) { onData(JSON.parse(raw)); status('Loaded from your Google Sheet.'); }
        else status('No saved data in that sheet tab yet.');
      } catch (e) { status('Could not read that sheet tab.'); }
    });
  }

  function spreadsheetUrl() {
    var id = getSheetId();
    return id ? ('https://docs.google.com/spreadsheets/d/' + id + '/edit') : '';
  }

  function initSyncBar() {
    var connectBtn = document.getElementById('connect-sheets');
    var syncBtn = document.getElementById('sync-sheets');
    var pullBtn = document.getElementById('pull-sheets');
    if (connectBtn) connectBtn.addEventListener('click', function () { connect(); });
    if (syncBtn) syncBtn.addEventListener('click', function () {
      if (window.TOOL_KEY && window.getToolData) syncTool(window.TOOL_KEY, window.getToolData());
    });
    if (pullBtn) pullBtn.addEventListener('click', function () {
      if (window.TOOL_KEY && window.setToolData) pullTool(window.TOOL_KEY, window.setToolData);
    });
  }

  document.addEventListener('DOMContentLoaded', initSyncBar);

  window.RaiseSheets = {
    isConfigured: isConfigured,
    isConnected: isConnected,
    saveLocal: saveLocal,
    loadLocal: loadLocal,
    connect: connect,
    syncTool: syncTool,
    pullTool: pullTool,
    spreadsheetUrl: spreadsheetUrl,
    status: status
  };
})();
