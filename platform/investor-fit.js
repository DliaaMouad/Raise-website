/* Investor-fit matcher: scores the 2,197-investor list against the founder's
   stage, sector, round size, and geography, and renders a ranked shortlist
   with a one-line "why this investor" built only from the record's data.
   Stage: exact match 40, no listed stage 15, listed other stage excluded.
   Sector: match 30. Round: published cheque fits 30, close (up to 2x max) 15,
   no published cheque 10 (neutral). Geography: match 20, Anywhere 20,
   no listed region 5. Max 120. Fit % = score / 120. */
(function () {
  var ACCESS_CODE = "Raise100";
  var LS_KEY = "raiseos_access";
  var DATA_FILES = ["investors-data-1.js", "investors-data-2.js", "investors-data-3.js",
    "investors-data-4.js", "investors-data-5.js", "investors-data-6.js",
    "investors-data-7.js", "investors-data-8.js", "investors-data-9.js",
    "investors-data-10.js", "investors-data-11.js", "investors-data-12.js",
    "investors-data-13.js", "investors-data-17.js", "investors-data-18.js",
    "investors-data-19.js", "investors-data-20.js", "investors-data-21.js",
    "investors-data-22.js", "investors-industries.js", "investors-flags.js"];
  var TOP_N = 20;
  var MAX_SCORE = 120;

  var gate = document.getElementById("auth-gate");
  var appEl = document.getElementById("app-content");
  var errEl = document.getElementById("auth-err");
  var form = document.getElementById("fit-form");
  var fitError = document.getElementById("fit-error");
  var submitBtn = document.getElementById("fit-submit");
  var resultsEl = document.getElementById("fit-results");
  var countEl = document.getElementById("fit-count");
  var listEl = document.getElementById("fit-list");
  var ctasEl = document.getElementById("fit-ctas");
  var authed = false;
  var dataPromise = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmtMoney(n) {
    if (n >= 1000000) return "$" + (n / 1000000).toString().replace(/\.0$/, "") + "M";
    if (n >= 1000) return "$" + (n / 1000).toString().replace(/\.0$/, "") + "K";
    return "$" + n;
  }

  /* parseCheck copied from investors.html: cheque string to approx USD {min, max}. */
  function parseCheck(s) {
    if (!s) return null;
    var cur = "$";
    if (/EUR|€/.test(s)) cur = "EUR";
    else if (/GBP|£/.test(s)) cur = "GBP";
    var rate = cur === "EUR" ? 1.08 : (cur === "GBP" ? 1.27 : 1);
    s = s.replace(/\d+(?:\.\d+)?\s*%/g, "");
    var nums = [];
    var re = /(\d+(?:\.\d+)?)\s*([KMB])?/g, m;
    while ((m = re.exec(s)) !== null) {
      var v = parseFloat(m[1]);
      var mult = m[2] === "M" ? 1000000 : (m[2] === "B" ? 1000000000 : 1000);
      nums.push(v * mult * rate);
    }
    if (!nums.length) return null;
    if (/^\s*up to/i.test(s)) return { min: 0, max: nums[0] };
    if (nums.length === 1) return { min: nums[0], max: nums[0] };
    return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
  }

  function industriesOf(inv) {
    if (Array.isArray(inv.industry)) return inv.industry;
    if (typeof INDUSTRY_MAP !== "undefined" && INDUSTRY_MAP[inv.fund]) return INDUSTRY_MAP[inv.fund];
    return [];
  }

  function scoreInvestor(inv, input) {
    /* Explicit stage mismatch: excluded from the shortlist. */
    if (inv.stage && inv.stage !== input.stage) return null;
    var score = 0;
    var reasons = [];
    if (inv.stage === input.stage) {
      score += 40;
      reasons.push("Invests at " + input.stage);
    } else if (!inv.stage) {
      score += 15;
    }
    var inds = industriesOf(inv);
    if (inds.indexOf(input.sector) > -1) {
      score += 30;
      reasons.push("Backs " + input.sector);
    }
    var range = parseCheck(inv.check);
    if (!range) {
      score += 10;
    } else {
      var min = range.min, max = range.max;
      if (min === max) min = 0; /* single value = up-to */
      if (input.round >= min && input.round <= max) {
        score += 30;
        reasons.push("Cheque " + inv.check + " fits your " + fmtMoney(input.round) + " round");
      } else if (input.round > max && input.round <= max * 2) {
        score += 15;
        reasons.push("Cheque " + inv.check + " is close to your " + fmtMoney(input.round) + " round");
      }
    }
    if (input.region === "Anywhere") {
      score += 20;
    } else if (inv.region === input.region) {
      score += 20;
      reasons.push("Based in " + input.region);
    } else if (!inv.region) {
      score += 5;
    }
    return { score: score, fit: Math.round(score / MAX_SCORE * 100), reasons: reasons };
  }

  function whyLine(result) {
    if (result.reasons.length) return result.reasons.join(", ") + ".";
    return "In the Raise investor list.";
  }

  function typeLabel(inv) {
    var t = inv.type || "vc";
    if (t === "vc") return "VC";
    if (t === "accelerator") return "Accelerator";
    if (t === "angel") return "Angel";
    return t;
  }

  function loadDataScripts() {
    if (dataPromise) return dataPromise;
    if (window.INVESTORS && window.INVESTORS.length) {
      dataPromise = Promise.resolve();
      return dataPromise;
    }
    var chain = Promise.resolve();
    DATA_FILES.forEach(function (file) {
      chain = chain.then(function () {
        return new Promise(function (res) {
          var s = document.createElement("script");
          s.src = "/" + file;
          s.onload = res; s.onerror = res;
          document.head.appendChild(s);
        });
      });
    });
    dataPromise = chain;
    return dataPromise;
  }

  function render(results, total) {
    listEl.innerHTML = "";
    results.forEach(function (item, i) {
      var inv = item.inv;
      var card = document.createElement("article");
      card.className = "inv-card";
      var rank = document.createElement("div");
      rank.className = "inv-rank";
      rank.textContent = String(i + 1);
      card.appendChild(rank);
      var main = document.createElement("div");
      main.className = "inv-main";
      var name = document.createElement("h3");
      name.className = "inv-name";
      if (inv.website) {
        var a = document.createElement("a");
        a.href = inv.website;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = inv.fund;
        name.appendChild(a);
      } else {
        name.textContent = inv.fund;
      }
      main.appendChild(name);
      var badges = document.createElement("div");
      badges.className = "inv-badges";
      var typeBadge = document.createElement("span");
      typeBadge.className = "badge";
      typeBadge.textContent = typeLabel(inv);
      badges.appendChild(typeBadge);
      if (inv.hot) {
        var hot = document.createElement("span");
        hot.className = "badge badge-hot";
        hot.textContent = "Hot";
        badges.appendChild(hot);
      }
      main.appendChild(badges);
      var why = document.createElement("p");
      why.className = "inv-why";
      why.textContent = whyLine(item.result);
      main.appendChild(why);
      var meta = document.createElement("p");
      meta.className = "inv-meta";
      var parts = [];
      if (inv.region) parts.push(inv.region);
      if (inv.stage) parts.push(inv.stage);
      if (inv.check) parts.push("Cheque " + inv.check);
      if (inv.hq) parts.push(inv.hq);
      meta.textContent = parts.join(" · ");
      main.appendChild(meta);
      if (inv.linkedin) {
        var li = document.createElement("p");
        li.className = "inv-meta";
        var la = document.createElement("a");
        la.href = inv.linkedin;
        la.target = "_blank";
        la.rel = "noopener";
        la.textContent = "LinkedIn";
        li.appendChild(la);
        main.appendChild(li);
      }
      card.appendChild(main);
      var fit = document.createElement("div");
      fit.className = "fit-badge";
      fit.textContent = item.result.fit + "% fit";
      card.appendChild(fit);
      listEl.appendChild(card);
    });
    countEl.textContent = "Top " + results.length + " of " + total + " investors, ranked by fit.";
    resultsEl.hidden = false;
    ctasEl.hidden = false;
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runMatch() {
    var stage = document.getElementById("fit-stage").value;
    var sector = document.getElementById("fit-sector").value;
    var roundRaw = document.getElementById("fit-round").value;
    var region = document.getElementById("fit-region").value;
    var round = parseFloat(roundRaw);
    if (!round || round <= 0) {
      fitError.textContent = "Enter your round size in USD (e.g. 1000000 for $1M).";
      return;
    }
    fitError.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Finding your shortlist...";
    loadDataScripts().then(function () {
      var all = window.INVESTORS || [];
      var input = { stage: stage, sector: sector, round: round, region: region };
      var scored = [];
      all.forEach(function (inv) {
        var r = scoreInvestor(inv, input);
        if (r) scored.push({ inv: inv, result: r });
      });
      scored.sort(function (a, b) {
        if (b.result.score !== a.result.score) return b.result.score - a.result.score;
        return (a.inv.fund || "").localeCompare(b.inv.fund || "");
      });
      render(scored.slice(0, TOP_N), all.length);
      submitBtn.disabled = false;
      submitBtn.textContent = "Find my shortlist";
      if (window.plausible) { try { window.plausible("Investor Fit Matched"); } catch (e) {} }
    }).catch(function () {
      fitError.textContent = "Could not load investor data. Please refresh and try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Find my shortlist";
    });
  }

  function showApp() {
    if (authed) return;
    authed = true;
    gate.style.display = "none";
    appEl.style.display = "block";
    loadDataScripts();
  }

  document.getElementById("code-form").addEventListener("submit", function (e) {
    e.preventDefault();
    errEl.textContent = "";
    var code = document.getElementById("access-code").value.trim();
    if (code === ACCESS_CODE) {
      try { localStorage.setItem(LS_KEY, "1"); } catch (e2) {}
      showApp();
    } else {
      errEl.textContent = "Wrong code. Check it and try again.";
    }
  });

  try {
    if (localStorage.getItem(LS_KEY) === "1") showApp();
  } catch (e) {}

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    runMatch();
  });

  /* Expose scoring for tests. */
  window.__fitScore = scoreInvestor;
  window.__fitParseCheck = parseCheck;
})();
