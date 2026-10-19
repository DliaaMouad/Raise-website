/* AI Data Room: founder uploads a deck PDF + answers questions. The deck text
   and answers go to the build-data-room Edge Function (server-side), which
   calls the LLM, stores the data room, and returns a preview. The preview is
   free. The full room (documents) unlocks after Paddle payment, verified
   server-side by verify-payment. The founder's access link carries a token;
   get-data-room returns the preview always and the docs only when paid.
   The deck text IS sent to the AI (unlike the Audit). It is stored with the
   data room and never sold. */
(function () {
  var cfg = window.AI_DATA_ROOM_CONFIG;
  var roomCfg = window.DATA_ROOM;
  if (!cfg || !roomCfg) return;

  var TOKEN_KEY = "raiseos_ai_room_token";
  var TXN_KEY = "raiseos_ai_paddle_txn";
  var MAX_BYTES = 10 * 1024 * 1024;

  var form = document.getElementById("ai-form");
  var deckFile = document.getElementById("ai-deck-file");
  var dropzone = document.getElementById("ai-drop");
  var deckWords = document.getElementById("ai-deck-words");
  var aiError = document.getElementById("ai-error");
  var buildBtn = document.getElementById("ai-build");
  var stepBuild = document.getElementById("step-build");
  var stepPreview = document.getElementById("step-preview");
  var stepRoom = document.getElementById("step-room");
  var snapshotEl = document.getElementById("ai-snapshot");
  var previewList = document.getElementById("ai-preview-list");
  var accessLinkEl = document.getElementById("ai-access-link");
  var copyLinkBtn = document.getElementById("ai-copy-link");
  var copyLinkMsg = document.getElementById("ai-copy-link-msg");
  var unlockBtn = document.getElementById("ai-unlock");
  var unlockNote = document.getElementById("ai-unlock-note");
  var roomSnapshotEl = document.getElementById("ai-room-snapshot");
  var docsEl = document.getElementById("ai-docs");
  var roomList = document.getElementById("ai-room-list");
  var copyRoomBtn = document.getElementById("ai-copy-room");
  var printRoomBtn = document.getElementById("ai-print-room");
  var copyRoomMsg = document.getElementById("ai-copy-room-msg");

  var extractedText = "";
  var currentToken = "";
  var currentRoom = null; /* { email, stage, paid, preview, docs } */

  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  }

  function isPlaceholder(v) {
    return !v || v.indexOf("[FILL IN") === 0;
  }

  function fnUrl(name) {
    return cfg.supabaseUrl.replace(/\/$/, "") + cfg.functions[name];
  }

  function apiCall(name, body) {
    if (isPlaceholder(cfg.supabaseAnonKey)) {
      return Promise.reject(new Error("AI is not connected yet."));
    }
    return fetch(fnUrl(name), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.supabaseAnonKey,
        "Authorization": "Bearer " + cfg.supabaseAnonKey
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || "Request failed.");
        return data;
      });
    });
  }

  function wordsOf(text) {
    var t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Minimal safe Markdown renderer: headings, bold, bullet lists, paragraphs. */
  function renderMarkdown(md) {
    var lines = String(md || "").split("\n");
    var html = "";
    var inList = false;
    function closeList() { if (inList) { html += "</ul>"; inList = false; } }
    function inline(s) {
      return esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    }
    lines.forEach(function (line) {
      var t = line.trim();
      if (t.indexOf("## ") === 0) {
        closeList();
        html += "<h3>" + inline(t.slice(3)) + "</h3>";
      } else if (t.indexOf("# ") === 0) {
        closeList();
        html += "<h2>" + inline(t.slice(2)) + "</h2>";
      } else if (t.indexOf("- ") === 0) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inline(t.slice(2)) + "</li>";
      } else if (!t) {
        closeList();
      } else {
        closeList();
        html += "<p>" + inline(t) + "</p>";
      }
    });
    closeList();
    return html;
  }

  function itemMeta(id) {
    for (var i = 0; i < roomCfg.items.length; i++) {
      if (roomCfg.items[i].id === id) return roomCfg.items[i];
    }
    return null;
  }

  function renderChecklist(listEl, checklist) {
    listEl.innerHTML = "";
    roomCfg.categories.forEach(function (cat) {
      var catItems = checklist.filter(function (entry) {
        var meta = itemMeta(entry.id);
        return meta && meta.category === cat;
      });
      if (!catItems.length) return;
      var group = document.createElement("section");
      group.className = "check-group";
      var h = document.createElement("h3");
      h.textContent = cat;
      group.appendChild(h);
      catItems.forEach(function (entry) {
        var meta = itemMeta(entry.id);
        var row = document.createElement("div");
        row.className = "ai-check";
        var status = document.createElement("span");
        status.className = "ai-badge " + (entry.status === "have" ? "have" : "need");
        status.textContent = entry.status === "have" ? "Have" : "Need";
        row.appendChild(status);
        if (entry.status === "need" && entry.priority === "high") {
          var pri = document.createElement("span");
          pri.className = "ai-badge high";
          pri.textContent = "High priority";
          row.appendChild(pri);
        }
        var text = document.createElement("div");
        text.className = "ai-check-text";
        var title = document.createElement("strong");
        title.textContent = meta.title;
        text.appendChild(title);
        var note = document.createElement("span");
        note.textContent = entry.note || "";
        text.appendChild(note);
        row.appendChild(text);
        group.appendChild(row);
      });
      listEl.appendChild(group);
    });
  }

  function showPreview(room) {
    currentRoom = room;
    snapshotEl.textContent = room.preview.companySnapshot || "";
    renderChecklist(previewList, room.preview.checklist || []);
    var link = window.location.origin + window.location.pathname + "?room=" + room.token;
    accessLinkEl.textContent = link;
    unlockNote.textContent = isPlaceholder(cfg.price) ? "" : "One-time payment of " + cfg.price + ".";
    stepPreview.hidden = false;
    stepPreview.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showRoom(room) {
    currentRoom = room;
    roomSnapshotEl.textContent = room.preview.companySnapshot || "";
    docsEl.innerHTML = "";
    (room.docs || []).forEach(function (doc) {
      var section = document.createElement("section");
      section.className = "doc";
      var h = document.createElement("h3");
      h.textContent = doc.title;
      section.appendChild(h);
      var body = document.createElement("div");
      body.className = "doc-body";
      body.innerHTML = renderMarkdown(doc.content);
      section.appendChild(body);
      docsEl.appendChild(section);
    });
    renderChecklist(roomList, room.preview.checklist || []);
    stepRoom.hidden = false;
    stepRoom.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function storeToken(token) {
    currentToken = token;
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
  }

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function loadTxn() {
    try { return localStorage.getItem(TXN_KEY) || ""; } catch (e) { return ""; }
  }

  function extractPdfText(file) {
    return file.arrayBuffer().then(function (buffer) {
      return window.pdfjsLib.getDocument({ data: buffer }).promise;
    }).then(function (pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) { pages.push(pdf.getPage(i)); }
      return Promise.all(pages).then(function (pageObjs) {
        return Promise.all(pageObjs.map(function (page) { return page.getTextContent(); }));
      }).then(function (contents) {
        return contents.map(function (content) {
          return content.items.map(function (item) { return item.str; }).join(" ");
        }).join("\n\n");
      });
    });
  }

  function handleFile(file) {
    extractedText = "";
    if (!file) {
      deckWords.textContent = "No file selected";
      return;
    }
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      aiError.textContent = "Please upload a PDF file.";
      deckWords.textContent = "No file selected";
      return;
    }
    if (file.size > MAX_BYTES) {
      aiError.textContent = "PDF is larger than 10MB. Please use a smaller file.";
      deckWords.textContent = "No file selected";
      return;
    }
    if (!window.pdfjsLib) {
      aiError.textContent = "PDF reader failed to load. Check your connection and try again.";
      return;
    }
    aiError.textContent = "";
    deckWords.textContent = "Reading " + file.name + "...";
    extractPdfText(file).then(function (text) {
      extractedText = text;
      deckWords.textContent = file.name + ": " + wordsOf(text) + " words";
      if (wordsOf(text) === 0) {
        aiError.textContent = "No extractable text found in this PDF. It may be a scanned image. Export a text-based PDF from your slides tool and try again.";
        extractedText = "";
      }
    }).catch(function () {
      aiError.textContent = "Could not read this PDF. Please try another file.";
      deckWords.textContent = "No file selected";
      extractedText = "";
    });
  }

  deckFile.addEventListener("change", function () {
    handleFile(deckFile.files && deckFile.files[0]);
  });
  if (dropzone) {
    dropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      handleFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }

  function collectAnswers() {
    var have = [];
    var boxes = document.querySelectorAll('input[name="ai-have"]:checked');
    boxes.forEach(function (b) { have.push(b.value); });
    if (have.indexOf("None yet") > -1) have = [];
    var roundRaw = document.getElementById("ai-round").value;
    var teamRaw = document.getElementById("ai-team").value;
    return {
      stage: document.getElementById("ai-stage").value,
      roundSize: roundRaw ? parseFloat(roundRaw) : null,
      teamSize: teamRaw ? parseInt(teamRaw, 10) : null,
      revenue: document.getElementById("ai-revenue").value,
      incorporated: document.getElementById("ai-incorporated").value,
      alreadyHave: have
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("ai-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      aiError.textContent = "Please enter a valid email address.";
      return;
    }
    if (!extractedText) {
      aiError.textContent = "Upload a PDF deck first.";
      return;
    }
    if (wordsOf(extractedText) < 50) {
      aiError.textContent = "This PDF has only " + wordsOf(extractedText) + " words of text. Upload a deck with at least 50 words.";
      return;
    }
    aiError.textContent = "";
    buildBtn.disabled = true;
    buildBtn.textContent = "Building your data room...";
    apiCall("build", { deckText: extractedText, answers: collectAnswers(), email: email })
      .then(function (data) {
        storeToken(data.token);
        return apiCall("get", { token: data.token });
      })
      .then(function (room) {
        showPreview(room);
        buildBtn.disabled = false;
        buildBtn.textContent = "Build my data room";
        if (window.plausible) { try { window.plausible("AI Data Room Built"); } catch (err) {} }
      })
      .catch(function (err) {
        aiError.textContent = err.message || "Could not build the data room. Please try again.";
        buildBtn.disabled = false;
        buildBtn.textContent = "Build my data room";
      });
  });

  copyLinkBtn.addEventListener("click", function () {
    var link = accessLinkEl.textContent;
    function done() {
      copyLinkMsg.textContent = "Copied.";
      setTimeout(function () { copyLinkMsg.textContent = ""; }, 2400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(function () { done(); });
    } else { done(); }
  });

  unlockBtn.addEventListener("click", function () {
    if (!currentToken) return;
    unlockNote.textContent = "Starting checkout...";
    apiCall("createCheckout", { token: currentToken })
      .then(function (data) {
        try { localStorage.setItem(TXN_KEY, data.transactionId); } catch (e) {}
        window.location.href = data.checkoutUrl;
      })
      .catch(function (err) {
        unlockNote.textContent = err.message || "Could not start checkout.";
      });
  });

  function roomToMarkdown(room) {
    var lines = ["# Data room", "", room.preview.companySnapshot || "", ""];
    (room.docs || []).forEach(function (doc) {
      lines.push("## " + doc.title, "", doc.content || "", "");
    });
    lines.push("## Checklist");
    (room.preview.checklist || []).forEach(function (entry) {
      var meta = itemMeta(entry.id);
      lines.push("- [" + (entry.status === "have" ? "x" : " ") + "] " + (meta ? meta.title : entry.id) + ": " + (entry.note || ""));
    });
    return lines.join("\n");
  }

  copyRoomBtn.addEventListener("click", function () {
    if (!currentRoom) return;
    var text = roomToMarkdown(currentRoom);
    function done() {
      copyRoomMsg.textContent = "Copied.";
      setTimeout(function () { copyRoomMsg.textContent = ""; }, 2400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { done(); });
    } else { done(); }
  });

  printRoomBtn.addEventListener("click", function () {
    window.print();
  });

  /* On load: returning with a room token, or back from Paddle after payment. */
  var params = new URLSearchParams(window.location.search);
  var paidParam = params.get("paid");
  var txnParam = params.get("_ptxn");
  var roomParam = params.get("room");
  if (paidParam === "1") {
    var token = loadToken() || roomParam || "";
    var txnId = txnParam || loadTxn() || "";
    stepBuild.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!token || !txnId) {
      aiError.textContent = "Payment received. Open the access link you saved to unlock your room.";
    } else {
      aiError.textContent = "Verifying your payment...";
      apiCall("verify", { token: token, transactionId: txnId })
        .then(function (res) {
          if (!res.paid) {
            aiError.textContent = "Payment not confirmed yet. If you just paid, wait a moment and refresh.";
            return null;
          }
          aiError.textContent = "";
          return apiCall("get", { token: token });
        })
        .then(function (room) {
          if (!room) return;
          showPreview(room);
          if (room.paid) showRoom(room);
        })
        .catch(function (err) {
          aiError.textContent = err.message || "Could not verify the payment.";
        });
    }
  } else if (roomParam) {
    storeToken(roomParam);
    stepBuild.scrollIntoView({ behavior: "smooth", block: "start" });
    apiCall("get", { token: roomParam })
      .then(function (room) {
        showPreview(room);
        if (room.paid) showRoom(room);
      })
      .catch(function () {
        aiError.textContent = "Could not find that data room. Check the link and try again.";
      });
  }

  /* Expose for tests. */
  window.__aiRenderMarkdown = renderMarkdown;
  window.__aiCollectAnswers = collectAnswers;
  window.__aiRenderChecklist = renderChecklist;
})();
