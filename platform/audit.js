/* Audit page logic: renders questions from AUDIT_CONFIG, scores, leaks,
   email gate, Supabase storage, Kit subscribe, Plausible funnel events.
   The email gate only appears when Supabase is configured. Until then the
   full report shows directly and no email is requested. */
(function () {
  var cfg = window.AUDIT_CONFIG;
  if (!cfg) return;

  var questionsEl = document.getElementById("audit-questions");
  var progressEl = document.getElementById("audit-progress");
  var submitBtn = document.getElementById("audit-submit");
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
      source: "audit-page"
    };
  }

  /* Render one card per dimension, driven by the config. */
  cfg.dimensions.forEach(function (dim, idx) {
    var card = document.createElement("fieldset");
    card.className = "audit-q";
    var legend = document.createElement("legend");
    legend.textContent = (idx + 1) + ". " + dim.name + ": " + dim.definition;
    card.appendChild(legend);
    var q = document.createElement("p");
    q.className = "audit-q-text";
    q.textContent = dim.question;
    card.appendChild(q);
    cfg.scale.forEach(function (opt) {
      var label = document.createElement("label");
      label.className = "audit-opt";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = dim.key;
      input.value = String(opt.value);
      input.required = true;
      input.addEventListener("change", onAnswer);
      label.appendChild(input);
      var strong = document.createElement("strong");
      strong.textContent = opt.value + " " + opt.label;
      label.appendChild(strong);
      var span = document.createElement("span");
      span.textContent = opt.desc;
      label.appendChild(span);
      card.appendChild(label);
    });
    questionsEl.appendChild(card);
  });

  function answeredCount() {
    var count = 0;
    cfg.dimensions.forEach(function (dim) {
      if (document.querySelector('input[name="' + dim.key + '"]:checked')) count += 1;
    });
    return count;
  }

  function onAnswer() {
    if (!started) {
      started = true;
      track("Audit Started");
    }
    var n = answeredCount();
    progressEl.textContent = n + " of 10 answered";
    submitBtn.disabled = n < 10;
  }

  function readAnswers() {
    var answers = {};
    cfg.dimensions.forEach(function (dim) {
      var checked = document.querySelector('input[name="' + dim.key + '"]:checked');
      answers[dim.key] = checked ? parseInt(checked.value, 10) : null;
    });
    return answers;
  }

  function bandFor(total) {
    for (var i = 0; i < cfg.bands.length; i++) {
      if (total >= cfg.bands[i].min && total <= cfg.bands[i].max) return cfg.bands[i];
    }
    return cfg.bands[cfg.bands.length - 1];
  }

  function sortedByWeakness(answers) {
    return cfg.dimensions.map(function (dim, idx) {
      return { dim: dim, idx: idx, score: answers[dim.key] };
    }).sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return a.idx - b.idx;
    });
  }

  function renderLeaks(answers) {
    leaksEl.innerHTML = "";
    sortedByWeakness(answers).slice(0, 3).forEach(function (item, i) {
      var card = document.createElement("article");
      card.className = "leak-card";
      var h = document.createElement("h3");
      h.textContent = "Leak " + (i + 1) + ": " + item.dim.name + " (" + item.score + "/5)";
      card.appendChild(h);
      var p = document.createElement("p");
      p.textContent = item.dim.leak;
      card.appendChild(p);
      leaksEl.appendChild(card);
    });
  }

  function renderReport(answers) {
    fixesEl.innerHTML = "";
    sortedByWeakness(answers).forEach(function (item) {
      var row = document.createElement("div");
      row.className = "fix-row";
      var head = document.createElement("p");
      head.className = "fix-head";
      head.textContent = item.dim.name + " (" + item.score + "/5)";
      row.appendChild(head);
      var p = document.createElement("p");
      p.textContent = item.dim.fix;
      row.appendChild(p);
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

  submitBtn.addEventListener("click", function () {
    var answers = readAnswers();
    var total = 0;
    cfg.dimensions.forEach(function (dim) { total += answers[dim.key]; });
    var band = bandFor(total);
    var leaks = sortedByWeakness(answers).slice(0, 3).map(function (item) { return item.dim.key; });

    scoreEl.textContent = total + " / 50";
    bandEl.textContent = band.label + ": " + band.description;
    renderLeaks(answers);
    renderReport(answers);
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
    document.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    started = false;
    progressEl.textContent = "0 of 10 answered";
    submitBtn.disabled = true;
    resultsEl.hidden = true;
    gateEl.hidden = true;
    reportEl.hidden = true;
    ctasEl.hidden = true;
    document.getElementById("audit-questions").scrollIntoView({ behavior: "smooth", block: "start" });
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
