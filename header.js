/* Shared pill-header mobile menu (all pages).
   Hamburger toggles the mobile panel. Closes on Escape, outside click,
   or when a menu link is tapped. Guarded: no-ops on pages without the menu. */
(function () {
  var btn = document.getElementById('pill-hamburger');
  var menu = document.getElementById('pill-mobile-menu');
  if (!btn || !menu) return;

  function closeMenu() {
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('open');
  }
  function openMenu() {
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    menu.classList.add('open');
  }

  btn.addEventListener('click', function () {
    if (menu.classList.contains('open')) { closeMenu(); } else { openMenu(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu();
      btn.focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (menu.classList.contains('open') && !e.target.closest('.pill-header')) {
      closeMenu();
    }
  });
  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
})();

/* Tools mega-menu: hover and click on desktop, click on touch, Escape to
   close, close button inside the panel. Guarded: no-ops without the menu. */
(function () {
  var btn = document.getElementById('tools-btn');
  var panel = document.getElementById('tools-panel');
  if (!btn || !panel) return;
  var wrap = btn.closest('.tools-menu');
  var closeBtn = document.getElementById('tools-close');
  var hoverTimer = null;

  function openMenu() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.hidden) { openMenu(); } else { closeMenu(); }
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      closeMenu();
      btn.focus();
    });
  }
  if (wrap && window.matchMedia('(hover: hover) and (min-width: 641px)').matches) {
    wrap.addEventListener('mouseenter', function () {
      clearTimeout(hoverTimer);
      openMenu();
    });
    wrap.addEventListener('mouseleave', function () {
      hoverTimer = setTimeout(closeMenu, 180);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) {
      closeMenu();
      btn.focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !e.target.closest('.tools-menu')) { closeMenu(); }
  });
  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
})();
