/* ReachEmpireBot R137: mobile browser-level zoom mitigation.
 * Scoped to handset/mobile-width viewports. Does NOT disable native WebView/OS zoom.
 * Does not touch application state, input, post, comment, bot, EA, or API logic.
 */
(function () {
  'use strict';
  if (window.__REBMobileZoomLockR137) return;
  window.__REBMobileZoomLockR137 = true;
  var mobileMedia = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var ua = String(navigator.userAgent || '');
  var handset = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var meta = document.querySelector('meta[name="viewport"]');
  var before = meta ? meta.getAttribute('content') || '' : '';
  var created = !meta;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    (document.head || document.documentElement).appendChild(meta);
  }
  var lock = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  var pending = false;
  function active() {
    return handset || !!(mobileMedia && mobileMedia.matches) ||
      (!mobileMedia && window.innerWidth <= 767);
  }
  function sync() {
    pending = false;
    var isMobile = active();
    document.documentElement.classList.toggle('reb-mobile-zoom-locked', isMobile);
    var target = isMobile ? lock : (created ? 'width=device-width, initial-scale=1' : before);
    if (meta.getAttribute('content') !== target) meta.setAttribute('content', target);
  }
  function later() {
    if (pending) return;
    pending = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(sync);
    else sync();
  }
  sync();
  if (mobileMedia) {
    if (mobileMedia.addEventListener) mobileMedia.addEventListener('change', later);
    else if (mobileMedia.addListener) mobileMedia.addListener(later);
  }
  window.addEventListener('pageshow', later);
  // If any late script rewrites the viewport, restore the lock on mobile.
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () {
      if (active() && meta.getAttribute('content') !== lock) later();
    }).observe(meta, {attributes:true, attributeFilter:['content']});
  }
  var options = {passive:false, capture:true};
  function cancel(e) { if (active() && e.cancelable) e.preventDefault(); }
  function fingers(e) {
    if (active() && e.touches && e.touches.length > 1 && e.cancelable) e.preventDefault();
  }
  window.addEventListener('touchstart', fingers, options);
  window.addEventListener('touchmove', fingers, options);
  window.addEventListener('gesturestart', cancel, options);
  window.addEventListener('gesturechange', cancel, options);
  window.addEventListener('gestureend', cancel, options);
  window.addEventListener('dblclick', cancel, true);
  // Some desktop-hosted mobile previews translate pinch into Ctrl+wheel.
  window.addEventListener('wheel', function (e) { if (e.ctrlKey) cancel(e); }, options);
})();
