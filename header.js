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
