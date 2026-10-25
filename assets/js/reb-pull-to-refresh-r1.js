/* REB Global Pull-to-Refresh R1. Standalone, opt-in shared page asset.
 * Mobile touch only; no changes to API/data logic.
 */
(function () {
  'use strict';
  if (window.__REB_PULL_REFRESH_R1__) return;
  window.__REB_PULL_REFRESH_R1__ = true;
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;

  var startY = 0, startX = 0, distance = 0, tracking = false, refreshing = false;
  var THRESHOLD = 86, MAX_PULL = 134, indicator = null, label = null;

  function makeIndicator() {
    if (indicator || !document.body) return;
    indicator = document.createElement('div');
    indicator.id = 'reb-global-pull-refresh';
    indicator.setAttribute('aria-live', 'polite');
    indicator.setAttribute('role', 'status');
    indicator.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 10px);transform:translate(-50%,-120px);z-index:2147483000;background:rgba(20,24,28,.93);color:#fff;border-radius:30px;padding:10px 16px;box-shadow:0 6px 24px rgba(0,0,0,.18);font:600 13px system-ui,-apple-system,sans-serif;white-space:nowrap;pointer-events:none;transition:transform .17s ease;';
    label = document.createElement('span');
    label.textContent = '↓ Pull to refresh';
    indicator.appendChild(label);
    document.body.appendChild(indicator);
  }

  function show(pixels, text) {
    makeIndicator();
    if (!indicator) return;
    label.textContent = text;
    indicator.style.transform = 'translate(-50%,' + (Math.min(MAX_PULL, pixels) / 2 - 42) + 'px)';
  }
  function hide() {
    if (indicator) indicator.style.transform = 'translate(-50%,-120px)';
  }
  function isEditableTarget(node) {
    return !!(node && node.closest && node.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"],.CodeMirror,.monaco-editor'));
  }
  function isAtTop() {
    var root = document.scrollingElement || document.documentElement;
    return window.scrollY <= 1 && (!root || root.scrollTop <= 1);
  }
  function scrollableAncestorAtTop(node) {
    for (var el = node && node.nodeType === 1 ? node : null; el && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 3) {
        var style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollTop > 1) return false;
      }
    }
    return true;
  }
  function hasUnsavedWork() {
    if (window.REBPullRefresh && typeof window.REBPullRefresh.isBusy === 'function') {
      try { if (window.REBPullRefresh.isBusy()) return true; } catch (_) { return true; }
    }
    if (document.querySelector('[data-reb-uploading="true"],[data-uploading="true"],[aria-busy="true"],.is-uploading')) return true;
    var fields = document.querySelectorAll('textarea,input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="file"]),[contenteditable="true"],input[type="file"]');
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.disabled || field.closest('[hidden]')) continue;
      if (field.type === 'file' && field.files && field.files.length) return true;
      if (field.matches('[contenteditable="true"]') && field.textContent.trim()) return true;
      if (field.matches('textarea') && field.value.trim()) return true;
      if (field.matches('input')) {
        var t = (field.type || 'text').toLowerCase();
        if (['search','password','email','text','number','tel','url','date','time','datetime-local'].indexOf(t) >= 0 && field.value !== field.defaultValue && field.value.trim()) return true;
      }
    }
    return false;
  }
  function reset() { tracking = false; distance = 0; hide(); }

  document.addEventListener('touchstart', function (event) {
    if (refreshing || event.touches.length !== 1 || !isAtTop() || isEditableTarget(event.target) || !scrollableAncestorAtTop(event.target)) { tracking = false; return; }
    tracking = true; startY = event.touches[0].clientY; startX = event.touches[0].clientX; distance = 0;
  }, { passive: true });

  document.addEventListener('touchmove', function (event) {
    if (!tracking || refreshing || event.touches.length !== 1 || !isAtTop()) return;
    var dx = event.touches[0].clientX - startX;
    var dy = event.touches[0].clientY - startY;
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy) * .75) { reset(); return; }
    distance = Math.min(MAX_PULL, dy);
    if (event.cancelable) event.preventDefault();
    show(distance, distance >= THRESHOLD ? '↻ Release to refresh' : '↓ Pull to refresh');
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (!tracking) return;
    var shouldRefresh = distance >= THRESHOLD;
    reset();
    if (!shouldRefresh || refreshing) return;
    if (hasUnsavedWork()) {
      show(90, 'Unsaved changes — refresh blocked');
      window.setTimeout(hide, 1800);
      return;
    }
    refreshing = true;
    show(95, '↻ Refreshing…');
    // Native reload preserves the original page routing/auth and fetches fresh content.
    window.location.reload();
  }, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
})();
