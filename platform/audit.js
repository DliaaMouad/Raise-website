/* Audit page logic (deck rater): analyzes pasted deck text in the browser
   with the transparent checks in AUDIT_CONFIG, scores each dimension,
   shows leaks and fixes, gates the full report behind email + consent.
   The deck text never leaves the browser and is never stored. Only scores,
   leaks, and email (if provided) are stored. The email gate only appears
   when Supabase is configured. Until then the full report shows directly
   and no email is requested. */
(function () {
  var cfg = window.AUDIT_CONFIG;
  if (!cfg) return;

  var deckText = document.getElementById("deck-text");
  var deckWords = document.getElementById("deck-words");
  var deckError = document.getElementById("deck-error");
  var analyzeBtn = document.getElementById("audit-analyze");
  var resultsEl = document.getElementById("audit-results");
  var scoreEl = document.getElementById("audit-score");
  var bandEl = document.getElementById("audit-band");
  var leaksEl = document.getElementById("audit-leaks");
  var gateEl = document.getElementById("audit-gate");
  var gateForm = document.getElementById("gate-form");
  var gateError = document.getElementById("gate-error");
  var reportEl = document.getElementById("audit-report");
  var fixesEl = document.getElementById("audit-fixes");
  var ctasEl = document.getElementById("audit-ctas");
  var retakeBtn = document.getElementById("audit-retake");
  var started = false;

  function track(name) {
    if (window.plausible) {
      try { window.plausible(name); } catch (e) { /* analytics is best effort */ }
    }
  }

  function supabaseConfigured() {
    var s = cfg.service;
    return s.supabaseUrl && s.supabaseUrl.indexOf("[FILL IN") !== 0 &&
      s.supabaseAnonKey && s.supabaseAnonKey.indexOf("[FILL IN") !== 0;
  }

  function kitConfigured() {
    var id = cfg.service.kitFormId;
    return id && id.indexOf("[FILL IN") !== 0;
  }

  function stripeConfigured() {
    var u = cfg.service.stripeAuditUrl;
    return u && u.indexOf("[FILL IN") !== 0;
  }

  function getParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || null,
      utm_medium: p.get("utm_medium") || null,
      utm_campaign: p.get("utm_campaign") || null,
      source: "audit-paste"
    };
  }

  function wordsOf(text) {
    var trimmed = text.trim();
    if (!trimmed) return [];
    return trimmed.split(/\s+/);
  }

  function runCheck(check, text, words) {
    if (check.test === "wordCountMax") return words.length <= check.max;
    if (check.test === "earlyMention") {
      var head = words.slice(0, Math.max(1, Math.floor(words.length * check.fraction))).join(" ");
      return check.anyOf.some(function (p) { return new RegExp(p, "i").test(head); });
    }
    if (check.test === "sectionCount") {
      var found = 0;
      check.anyOf.forEach(function (p) { if (new RegExp(p, "i").test(text)) found += 1; });
      return found >= check.min;
    }
    if (check.test === "hasNumber") return /[$£%]/.test(text) && /\d/.test(text);
    return check.anyOf.some(function (p) { return new RegExp(p, "i").test(text); });
  }

  function analyze(text) {
    var words = wordsOf(text);
    return cfg.dimensions.map(function (dim, idx) {
      var passed = [];
      var failed = [];
      dim.checks.forEach(function (check) {
        if (runCheck(check, text, words)) { passed.push(check); } else { failed.push(check); }
      });
      return { dim: dim, idx: idx, score: 1 + passed.length, passed: passed, failed: failed };
    });
  }

  function bandFor(total) {
    for (var i = 0; i < cfg.bands.length; i++) {
      if (total >= cfg.bands[i].min && total <= cfg.bands[i].max) return cfg.bands[i];
    }
    return cfg.bands[cfg.bands.length - 1];
  }

  function sortedByWeakness(results) {
    return results.slice().sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return a.idx - b.idx;
    });
  }

  function scaleLabel(score) {
    for (var i = 0; i < cfg.scale.length; i++) {
      if (cfg.scale[i].value === score) return cfg.scale[i].label;
    }
    return "";
  }

  function renderLeaks(results) {
    leaksEl.innerHTML = "";
    sortedByWeakness(results).slice(0, 3).forEach(function (item, i) {
      var card = document.createElement("article");
      card.className = "leak-card";
      var h = document.createElement("h3");
      h.textContent = "Leak " + (i + 1) + ": " + item.dim.name + " (" + item.score + "/5 " + scaleLabel(item.score) + ")";
      card.appendChild(h);
      var p = document.createElement("p");
      p.textContent = item.dim.leak;
      card.appendChild(p);
      var missing = document.createElement("p");
      missing.textContent = "Missing: " + item.failed.map(function (c) { return c.label; }).join("; ");
      card.appendChild(missing);
      leaksEl.appendChild(card);
    });
  }

  function renderReport(results) {
    fixesEl.innerHTML = "";
    sortedByWeakness(results).forEach(function (item) {
      var row = document.createElement("div");
      row.className = "fix-row";
      var head = document.createElement("p");
      head.className = "fix-head";
      head.textContent = item.dim.name + " (" + item.score + "/5 " + scaleLabel(item.score) + ")";
      row.appendChild(head);
      if (item.passed.length) {
        var found = document.createElement("p");
        found.textContent = "Found: " + item.passed.map(function (c) { return c.label; }).join("; ");
        row.appendChild(found);
      }
      if (item.failed.length) {
        var missing = document.createElement("p");
        missing.textContent = "Missing: " + item.failed.map(function (c) { return c.label; }).join("; ");
        row.appendChild(missing);
      }
      var fix = document.createElement("p");
      fix.textContent = "Fix: " + item.dim.fix;
      row.appendChild(fix);
      fixesEl.appendChild(row);
    });
  }

  function showReport() {
    reportEl.hidden = false;
    reportEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveResult(email, consent, answers, total, leaks) {
    var row = { email: email, consent: consent, total_score: total, top_3_leaks: leaks };
    cfg.dimensions.forEach(function (dim) { row[dim.key] = answers[dim.key]; });
    var params = getParams();
    row.utm_source = params.utm_source;
    row.utm_medium = params.utm_medium;
    row.utm_campaign = params.utm_campaign;
    row.source = params.source;
    return fetch(cfg.service.supabaseUrl.replace(/\/$/, "") + "/rest/v1/score_results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.service.supabaseAnonKey,
        "Authorization": "Bearer " + cfg.service.supabaseAnonKey,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(row)
    }).then(function (res) {
      if (!res.ok) throw new Error("Supabase insert failed: " + res.status);
    });
  }

  function subscribeKit(email) {
    /* Best effort: a Kit failure must never block the report. */
    if (!kitConfigured()) return Promise.resolve();
    return fetch("https://app.kit.com/forms/" + cfg.service.kitFormId + "/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_address: email })
    }).catch(function () { /* ignore */ });
  }

  deckText.addEventListener("input", function () {
    var n = wordsOf(deckText.value).length;
    deckWords.textContent = n + " words (minimum " + cfg.minWords + ")";
    if (!started) {
      started = true;
      track("Audit Started");
    }
  });

  analyzeBtn.addEventListener("click", function () {
    var text = deckText.value;
    var n = wordsOf(text).length;
    if (n < cfg.minWords) {
      deckError.textContent = "Paste at least " + cfg.minWords + " words of deck text (currently " + n + ").";
      return;
    }
    deckError.textContent = "";
    var results = analyze(text);
    var answers = {};
    var total = 0;
    results.forEach(function (item) {
      answers[item.dim.key] = item.score;
      total += item.score;
    });
    var band = bandFor(total);
    var leaks = sortedByWeakness(results).slice(0, 3).map(function (item) { return item.dim.key; });

    scoreEl.textContent = total + " / 50";
    bandEl.textContent = band.label + ": " + band.description;
    renderLeaks(results);
    renderReport(results);
    resultsEl.hidden = false;
    ctasEl.hidden = false;
    track("Audit Completed");
    window.__auditAnswers = answers;
    window.__auditTotal = total;
    window.__auditLeaks = leaks;

    if (supabaseConfigured()) {
      gateEl.hidden = false;
    } else {
      showReport();
    }
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("gate-email").value.trim();
    var consent = document.getElementById("gate-consent").checked;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      gateError.textContent = "Please enter a valid email address.";
      return;
    }
    if (!consent) {
      gateError.textContent = "Please tick the consent checkbox to continue.";
      return;
    }
    gateError.textContent = "";
    var submit = document.getElementById("gate-submit");
    submit.disabled = true;
    submit.textContent = "Unlocking...";
    saveResult(email, consent, window.__auditAnswers, window.__auditTotal, window.__auditLeaks)
      .then(function () { return subscribeKit(email); })
      .then(function () {
        track("Audit Email Captured");
        gateEl.hidden = true;
        showReport();
      })
      .catch(function () {
        gateError.textContent = "Could not save. Please try again.";
        submit.disabled = false;
        submit.textContent = "Unlock the full report";
      });
  });

  retakeBtn.addEventListener("click", function () {
    deckText.value = "";
    deckWords.textContent = "0 words (minimum " + cfg.minWords + ")";
    deckError.textContent = "";
    started = false;
    resultsEl.hidden = true;
    gateEl.hidden = true;
    reportEl.hidden = true;
    ctasEl.hidden = true;
    deckText.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* CTAs: real Cal.com link; Stripe link when configured, else the apply form. */
  var callCta = document.getElementById("cta-call");
  if (callCta) {
    callCta.href = cfg.service.calComUrl;
    callCta.addEventListener("click", function () { track("Audit Call Booked"); });
  }
  var auditCta = document.getElementById("cta-audit");
  if (auditCta) {
    if (stripeConfigured()) {
      auditCta.href = cfg.service.stripeAuditUrl;
      auditCta.textContent = "Buy the Deck Audit";
    } else {
      auditCta.href = "/get-started.html#apply-form";
      auditCta.textContent = "Apply for the Deck Audit";
    }
  }
})();
