/* ReachEmpireBot URL Address Clean Hard Core v1 (R129)
 * Scope: only the decorative `v` parameter on SAME-ORIGIN WEBSITE PAGE URLs.
 * Preserve other page parameters, anchors and static asset cache versions.
 * No API, authentication, storage or backend changes.
 */
(function (win, doc) {
  'use strict';
  if (win.__REB_URL_ADDRESS_CLEAN_V1__) return;
  win.__REB_URL_ADDRESS_CLEAN_V1__ = true;

  function cleanPageUrl(value) {
    try {
      if (value === null || value === undefined || value === '') return null;
      var current = win.location;
      var target = new URL(String(value), current.href);
      if (!/^https?:$/.test(target.protocol) || target.origin !== current.origin) return null;
      if (!target.searchParams.has('v')) return null;

      // Leave cache-busting for static files and API calls untouched.
      if (/^\/(?:assets|api|uploads)(?:\/|$)/i.test(target.pathname)) return null;
      if (/\.(?:css|js|mjs|json|png|jpe?g|gif|svg|webp|ico|avif|mp4|webm|mp3|pdf|zip|woff2?|ttf|otf|txt|xml)$/i.test(target.pathname)) return null;

      // The website doesn't read `v` to select page content; it was used in
      // old menu links solely as a build/version note.
      target.searchParams.delete('v');
      return target.pathname + target.search + target.hash;
    } catch (_error) { return null; }
  }

  function cleanAddressBar() {
    try {
      var cleaned = cleanPageUrl(win.location.href);
      if (cleaned !== null) win.history.replaceState(win.history.state, '', cleaned);
    } catch (_error) { /* history is unavailable in some embedded contexts */ }
  }

  // Also protect navigation created later through client-side routing/history.
  ['pushState', 'replaceState'].forEach(function (method) {
    try {
      var original = win.history[method];
      if (typeof original !== 'function') return;
      win.history[method] = function () {
        if (arguments.length >= 3) {
          var cleaned = cleanPageUrl(arguments[2]);
          if (cleaned !== null) arguments[2] = cleaned;
        }
        return original.apply(this, arguments);
      };
    } catch (_error) { /* preserve native behavior if patching is blocked */ }
  });

  function cleanAnchor(anchor) {
    if (!anchor || !anchor.getAttribute) return;
    var raw = anchor.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return;
    var cleaned = cleanPageUrl(raw);
    if (cleaned !== null) anchor.setAttribute('href', cleaned);
  }

  // Update existing links so users can copy/open a clean URL (also Ctrl-click).
  function cleanDocumentLinks() {
    try {
      var links = doc.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) cleanAnchor(links[i]);
    } catch (_error) { /* do not interfere with page rendering */ }
  }

  // Dynamically added links are sanitized only on user navigation; no costly
  // MutationObserver or repeated DOM scanning across the Social Feed.
  doc.addEventListener('click', function (event) {
    try {
      var el = event.target;
      var anchor = el && el.closest ? el.closest('a[href]') : null;
      cleanAnchor(anchor);
    } catch (_error) {}
  }, true);

  cleanAddressBar();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', cleanDocumentLinks, {once:true});
  else cleanDocumentLinks();
  win.addEventListener('pageshow', cleanAddressBar);
  win.addEventListener('popstate', cleanAddressBar);
})(window, document);
