/* =================================================================
   BHULLAR FITNESS — Theme toggle (light / dark)
   Plain script (no module). Include on every page AFTER Lucide.
   A tiny inline script in <head> applies the saved theme before
   paint to avoid a flash; this file wires the toggle buttons.
   ================================================================= */
(function () {
  var KEY = 'bhullar_theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  // Rebuild the icon each time: Lucide swaps <i> for <svg> on render,
  // so we replace the button's contents with a fresh <i> then re-render.
  function syncIcons(theme) {
    var name = theme === 'light' ? 'moon' : 'sun';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.innerHTML = '<i data-lucide="' + name + '"></i>';
      btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('title', theme === 'light' ? 'Dark mode' : 'Light mode');
    });
    if (window.lucide) lucide.createIcons();
  }

  function apply(theme) {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    syncIcons(theme);
  }

  function init() {
    syncIcons(current());
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(current() === 'light' ? 'dark' : 'light');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
