/* Raise preview header interactions:
   - Tools dropdown: opens on hover over the Tools nav item, stays open while the
     pointer moves from the label into the dropdown, closes when the pointer
     leaves the combined nav area. Also click-toggle and keyboard accessible.
   - Mobile: hamburger opens menu; Tools expands tap-to-open. */
(function () {
  var toolsItem = document.getElementById('tools-nav-item');
  var toolsToggle = document.getElementById('tools-toggle');
  var dropdown = document.getElementById('tools-dropdown');
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  var mobileToolsToggle = document.getElementById('mobile-tools-toggle');
  var mobileToolsList = document.getElementById('mobile-tools-list');
  var openedBy = null; // 'hover' or 'click' — tracks how the menu was opened

  function openTools(source) {
    openedBy = source;
    toolsItem.classList.add('open');
    toolsToggle.setAttribute('aria-expanded', 'true');
  }
  function closeTools() {
    openedBy = null;
    toolsItem.classList.remove('open');
    toolsToggle.setAttribute('aria-expanded', 'false');
  }
  function isToolsOpen() {
    return toolsItem.classList.contains('open');
  }

  if (toolsItem && toolsToggle) {
    // Hover: the wrapper covers label + dropdown, so moving from the label
    // into the dropdown keeps mouseenter active and does not close it.
    toolsItem.addEventListener('mouseenter', function () { openTools('hover'); });
    // Only hover-opened menus close on mouseleave; a click-pinned menu
    // stays until clicked again, Escape, or an outside click.
    toolsItem.addEventListener('mouseleave', function () {
      if (openedBy === 'hover') { closeTools(); }
    });

    // Click toggles. A click on a hover-opened menu pins it open instead of
    // immediately closing it (the pointer already opened it on hover/tap).
    toolsToggle.addEventListener('click', function (e) {
      e.preventDefault();
      if (isToolsOpen()) {
        if (openedBy === 'hover') { openedBy = 'click'; }
        else { closeTools(); }
      } else {
        openTools('click');
      }
    });

    // Keyboard: Enter/Space handled natively by the button click.
    // Escape closes and returns focus to the toggle.
    // ArrowDown moves focus into the first dropdown link.
    toolsToggle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openTools();
        var firstLink = dropdown.querySelector('a.tool-item');
        if (firstLink) { firstLink.focus(); }
      }
      if (e.key === 'Escape') { closeTools(); toolsToggle.focus(); }
    });
    dropdown.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeTools(); toolsToggle.focus(); }
    });

    // Close when focus leaves the whole Tools nav item.
    toolsItem.addEventListener('focusout', function (e) {
      if (!toolsItem.contains(e.relatedTarget)) { closeTools(); }
    });

    // Close on outside click.
    document.addEventListener('click', function (e) {
      if (!toolsItem.contains(e.target)) { closeTools(); }
    });
  }

  // Mobile hamburger.
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!expanded));
      hamburger.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu');
      mobileMenu.hidden = expanded;
    });
  }

  // Mobile Tools accordion (tap-to-expand).
  if (mobileToolsToggle && mobileToolsList) {
    mobileToolsToggle.addEventListener('click', function () {
      var expanded = mobileToolsToggle.getAttribute('aria-expanded') === 'true';
      mobileToolsToggle.setAttribute('aria-expanded', String(!expanded));
      mobileToolsList.hidden = expanded;
    });
  }
})();
