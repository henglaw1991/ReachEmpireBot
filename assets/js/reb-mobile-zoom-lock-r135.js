/* ReachEmpireBot R136 — Mobile viewport zoom lock (incl. narrow desktop-UA preview).
 * Only touch/gesture zoom and Ctrl+wheel on narrow mobile preview are intercepted.
 * Does not change navigation, post/comment handlers, scrolling or dashboard logic.
 * Native WebView/OS zoom, browser accessibility overrides cannot be disabled by webpage JS.
 */
(function () {
  'use strict';
  if (window.__REBMobileZoomLockR136) return;
  window.__REBMobileZoomLockR136 = true;

  var ua = String(navigator.userAgent || '');
  var handset = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var narrowQuery = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var viewport = document.querySelector('meta[name="viewport"]');
  var createdViewport = false;
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    (document.head || document.documentElement).appendChild(viewport);
    createdViewport = true;
  }
  var originalViewport = viewport.getAttribute('content') || '';
  function mobileContext() {
    // Desktop Chromium/Qt "Redmi preview" may expose a desktop UA/pointer.
    // Use actual narrow CSS viewport independently of the user agent.
    return handset || (narrowQuery ? narrowQuery.matches : (window.innerWidth || 10000) <= 767);
  }
  function lockedViewport() {
    var extras = originalViewport.split(',').map(function (p) {return p.trim();}).filter(function (p) {
      var key = (p.split('=')[0] || '').trim().toLowerCase();
      return !!key && !/^(width|initial-scale|minimum-scale|maximum-scale|user-scalable)$/.test(key);
    });
    return ['width=device-width', 'initial-scale=1', 'minimum-scale=1', 'maximum-scale=1', 'user-scalable=no'].concat(extras).join(', ');
  }
  function sync() {
    var yes = mobileContext();
    document.documentElement.classList.toggle('reb-mobile-zoom-locked', yes);
    if (yes) {
      var next = lockedViewport();
      if (viewport.getAttribute('content') !== next) viewport.setAttribute('content', next);
    } else if (createdViewport) {
      // Preserve normal desktop scaling if this was a no-viewport page.
      if (viewport.getAttribute('content') !== 'width=device-width, initial-scale=1') {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      }
    } else if (viewport.getAttribute('content') !== originalViewport) {
      viewport.setAttribute('content', originalViewport);
    }
  }
  sync();
  if (narrowQuery) {
    if (narrowQuery.addEventListener) narrowQuery.addEventListener('change', sync);
    else if (narrowQuery.addListener) narrowQuery.addListener(sync);
  }

  function cancelIfMobile(event) {
    if (mobileContext() && event.cancelable) event.preventDefault();
  }
  function cancelMultitouch(event) {
    if (mobileContext() && event.touches && event.touches.length > 1 && event.cancelable) {
      event.preventDefault();
    }
  }
  var opts = {passive: false, capture: true};
  document.addEventListener('gesturestart', cancelIfMobile, opts);
  document.addEventListener('gesturechange', cancelIfMobile, opts);
  document.addEventListener('gestureend', cancelIfMobile, opts);
  document.addEventListener('touchstart', cancelMultitouch, opts);
  document.addEventListener('touchmove', cancelMultitouch, opts);
  // Desktop-hosted narrow Mobile Preview may translate trackpad pinch to Ctrl+wheel.
  document.addEventListener('wheel', function (event) {
    if (event.ctrlKey) cancelIfMobile(event);
  }, opts);
  // Double-tap gesture without interfering with single-tap or mouse clicks.
  document.addEventListener('dblclick', cancelIfMobile, true);
})();
