/* ReachEmpireBot Mobile Phase 1D — footer runtime fallback.
   Keeps the old mobile inline behavior, but now restores the original styles
   when the viewport leaves the mobile breakpoint. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var originals = new WeakMap();

  function remember(el) {
    if (el && !originals.has(el)) originals.set(el, el.getAttribute('style'));
  }

  function restore(el) {
    if (!el || !originals.has(el)) return;
    var old = originals.get(el);
    if (old === null) el.removeAttribute('style');
    else el.setAttribute('style', old);
  }

  function setImportant(el, prop, value) {
    if (!el) return;
    remember(el);
    el.style.setProperty(prop, value, 'important');
  }

  function targets() {
    return {
      grids: document.querySelectorAll('.reb-clean-footer .reb-clean-footer-grid'),
      emails: document.querySelectorAll('.reb-clean-footer .reb-contact-row.email span'),
      groups: document.querySelectorAll('.reb-clean-footer .reb-follow-social')
    };
  }

  function applyMobile(t) {
    for (var g = 0; g < t.grids.length; g++) {
      setImportant(t.grids[g], 'grid-template-columns', 'minmax(0,1.25fr) minmax(131px,.75fr)');
    }
    for (var e = 0; e < t.emails.length; e++) {
      setImportant(t.emails[e], 'white-space', 'nowrap');
      setImportant(t.emails[e], 'word-break', 'normal');
      setImportant(t.emails[e], 'overflow-wrap', 'normal');
      setImportant(t.emails[e], 'font-size', '10px');
    }
    for (var i = 0; i < t.groups.length; i++) {
      var group = t.groups[i];
      setImportant(group, 'display', 'flex');
      setImportant(group, 'flex-direction', 'row');
      setImportant(group, 'flex-wrap', 'nowrap');
      setImportant(group, 'gap', '5px');
      setImportant(group, 'grid-template-columns', 'none');
      var buttons = group.querySelectorAll('a');
      for (var j = 0; j < buttons.length; j++) {
        var b = buttons[j];
        setImportant(b, 'display', 'inline-flex');
        setImportant(b, 'flex', '0 0 29px');
        setImportant(b, 'width', '29px');
        setImportant(b, 'height', '29px');
        setImportant(b, 'min-width', '29px');
        setImportant(b, 'min-height', '29px');
        setImportant(b, 'max-width', '29px');
        setImportant(b, 'max-height', '29px');
        setImportant(b, 'font-size', '12px');
        setImportant(b, 'border-radius', '8px');
        setImportant(b, 'align-items', 'center');
        setImportant(b, 'justify-content', 'center');
      }
    }
  }

  function restoreDesktop(t) {
    for (var g = 0; g < t.grids.length; g++) restore(t.grids[g]);
    for (var e = 0; e < t.emails.length; e++) restore(t.emails[e]);
    for (var i = 0; i < t.groups.length; i++) {
      var group = t.groups[i];
      var buttons = group.querySelectorAll('a');
      restore(group);
      for (var j = 0; j < buttons.length; j++) restore(buttons[j]);
    }
  }

  function sync() {
    var mobile = mq ? mq.matches : ((window.innerWidth || document.documentElement.clientWidth || 9999) <= 767);
    var t = targets();
    if (mobile) applyMobile(t); else restoreDesktop(t);
  }

  function ready() {
    sync();
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', sync);
      else if (mq.addListener) mq.addListener(sync);
    }
    window.addEventListener('orientationchange', sync, {passive:true});
    window.addEventListener('resize', sync, {passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true});
  else ready();
})();
