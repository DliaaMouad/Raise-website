/* Data room builder: renders the stage-specific diligence checklist,
   tracks progress, persists checked items per stage in localStorage,
   copies the checklist as Markdown, and prints it via window.print. */
(function () {
  var cfg = window.DATA_ROOM;
  if (!cfg) return;

  var STAGE_ORDER = { "pre-seed": 0, "seed": 1, "series-a": 2 };
  var stageBtns = document.querySelectorAll("[data-stage-btn]");
  var listEl = document.getElementById("dataroom-list");
  var progressText = document.getElementById("dataroom-progress-text");
  var progressFill = document.getElementById("dataroom-progress-fill");
  var copyBtn = document.getElementById("dataroom-copy");
  var printBtn = document.getElementById("dataroom-print");
  var copyMsg = document.getElementById("dataroom-copy-msg");
  var currentStage = "pre-seed";

  function storageKey(stage) { return "raiseos_dataroom_" + stage; }

  function loadChecked(stage) {
    try {
      var raw = localStorage.getItem(storageKey(stage));
      if (!raw) return {};
      var arr = JSON.parse(raw);
      var out = {};
      arr.forEach(function (id) { out[id] = true; });
      return out;
    } catch (e) { return {}; }
  }

  function saveChecked(stage, checked) {
    try {
      var ids = Object.keys(checked).filter(function (id) { return checked[id]; });
      localStorage.setItem(storageKey(stage), JSON.stringify(ids));
    } catch (e) { /* persistence is best effort */ }
  }

  function itemsFor(stage) {
    var max = STAGE_ORDER[stage];
    return cfg.items.filter(function (item) { return STAGE_ORDER[item.minStage] <= max; });
  }

  function updateProgress(items, checked) {
    var done = items.filter(function (item) { return checked[item.id]; }).length;
    var total = items.length;
    progressText.textContent = done + " of " + total + " ready";
    progressFill.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
    return { done: done, total: total };
  }

  function render(stage) {
    currentStage = stage;
    var printStage = document.getElementById("dataroom-print-stage");
    if (printStage) {
      var label = "";
      cfg.stages.forEach(function (s) { if (s.key === stage) label = s.label; });
      printStage.textContent = "Data room checklist (" + label + ")";
    }
    var checked = loadChecked(stage);
    var items = itemsFor(stage);
    listEl.innerHTML = "";
    cfg.categories.forEach(function (cat) {
      var catItems = items.filter(function (item) { return item.category === cat; });
      if (!catItems.length) return;
      var group = document.createElement("section");
      group.className = "check-group";
      var h = document.createElement("h3");
      h.textContent = cat;
      group.appendChild(h);
      catItems.forEach(function (item) {
        var row = document.createElement("label");
        row.className = "check-row";
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = !!checked[item.id];
        box.setAttribute("data-item-id", item.id);
        box.addEventListener("change", function () {
          checked[item.id] = box.checked;
          saveChecked(stage, checked);
          updateProgress(items, checked);
        });
        row.appendChild(box);
        var text = document.createElement("span");
        text.className = "check-text";
        var title = document.createElement("strong");
        title.textContent = item.title;
        text.appendChild(title);
        var detail = document.createElement("span");
        detail.className = "check-detail";
        detail.textContent = item.detail;
        text.appendChild(detail);
        row.appendChild(text);
        group.appendChild(row);
      });
      listEl.appendChild(group);
    });
    updateProgress(items, checked);
    stageBtns.forEach(function (btn) {
      var active = btn.getAttribute("data-stage-btn") === stage;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function toMarkdown(stage) {
    var checked = loadChecked(stage);
    var items = itemsFor(stage);
    var label = "";
    cfg.stages.forEach(function (s) { if (s.key === stage) label = s.label; });
    var lines = ["# Data room checklist (" + label + ")", ""];
    cfg.categories.forEach(function (cat) {
      var catItems = items.filter(function (item) { return item.category === cat; });
      if (!catItems.length) return;
      lines.push("## " + cat);
      catItems.forEach(function (item) {
        lines.push("- [" + (checked[item.id] ? "x" : " ") + "] " + item.title + ": " + item.detail);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  stageBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      render(btn.getAttribute("data-stage-btn"));
    });
  });

  copyBtn.addEventListener("click", function () {
    var text = toMarkdown(currentStage);
    function done() {
      copyMsg.textContent = "Copied.";
      setTimeout(function () { copyMsg.textContent = ""; }, 2400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
    done();
  }

  printBtn.addEventListener("click", function () {
    window.print();
  });

  /* Expose for tests. */
  window.__dataroomItemsFor = itemsFor;
  window.__dataroomToMarkdown = toMarkdown;

  render("pre-seed");
})();
