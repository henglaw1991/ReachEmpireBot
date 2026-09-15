(function () {
  'use strict';

  var AREA_SELECTOR =
    '.main-header .header-top .option-block.reb-auth-logged-in,' +
    '.reb-top .reb-actions.reb-auth-logged-in,' +
    '.reb-top .reb-login.reb-auth-logged-in';

  var ACCOUNT_SELECTOR = '.reb-session-account';
  var LOGOUT_SELECTOR = '.reb-session-logout';
  var MOBILE = window.matchMedia('(max-width: 767px)');
  var applying = false;

  function set(node, prop, value) {
    if (node) node.style.setProperty(prop, value, 'important');
  }

  function clear(node, prop) {
    if (node) node.style.removeProperty(prop);
  }

  var areaProps = [
    'box-sizing','position','inset','transform','display','grid-template-columns',
    'align-items','width','min-width','max-width','height','min-height','max-height',
    'margin','padding','gap','background','background-image','border','border-radius',
    'box-shadow','overflow'
  ];

  var linkProps = [
    'box-sizing','display','align-items','justify-content','width','min-width','max-width',
    'height','min-height','max-height','margin','padding','border','border-radius',
    'font-size','font-weight','line-height','letter-spacing','text-align','white-space',
    'overflow','text-overflow','box-shadow','transform','background','background-image','color'
  ];

  function resetInlineStandard() {
    document.querySelectorAll(AREA_SELECTOR).forEach(function (area) {
      areaProps.forEach(function (p) { clear(area, p); });
      var account = area.querySelector(ACCOUNT_SELECTOR);
      var logout = area.querySelector(LOGOUT_SELECTOR);
      [account, logout].forEach(function (link) {
        if (!link) return;
        linkProps.forEach(function (p) { clear(link, p); });
      });
    });
  }

  function styleLink(link, isLogout) {
    if (!link) return;
    set(link,'box-sizing','border-box');
    set(link,'display','flex');
    set(link,'align-items','center');
    set(link,'justify-content','center');
    set(link,'width','100%');
    set(link,'min-width','0');
    set(link,'max-width','none');
    set(link,'height','34px');
    set(link,'min-height','34px');
    set(link,'max-height','34px');
    set(link,'margin','0');
    set(link,'padding', MOBILE.matches && window.innerWidth <= 374 ? '0 4px' : '0 6px');
    set(link,'border-radius','7px');
    set(link,'font-size', MOBILE.matches && window.innerWidth <= 374 ? '9.5px' : '10px');
    set(link,'font-weight','800');
    set(link,'line-height','1');
    set(link,'letter-spacing','0');
    set(link,'text-align','center');
    set(link,'white-space','nowrap');
    set(link,'overflow','hidden');
    set(link,'text-overflow','ellipsis');
    set(link,'box-shadow','none');
    set(link,'transform','none');
    set(link,'background-image','none');
    set(link,'color','#fff');

    if (isLogout) {
      set(link,'background','#321919');
      set(link,'border','1px solid #8b3b3b');
    } else {
      set(link,'background','#181b18');
      set(link,'border','1px solid #a27618');
    }
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      if (!MOBILE.matches) {
        resetInlineStandard();
        return;
      }

      document.querySelectorAll(AREA_SELECTOR).forEach(function (area) {
        var narrow = window.innerWidth <= 374;
        set(area,'box-sizing','border-box');
        set(area,'position','static');
        set(area,'inset','auto');
        set(area,'transform','none');
        set(area,'display','grid');
        set(area,'grid-template-columns','1fr 1fr');
        set(area,'align-items','center');
        set(area,'width', narrow ? '248px' : '264px');
        set(area,'min-width', narrow ? '248px' : '264px');
        set(area,'max-width', narrow ? '248px' : '264px');
        set(area,'height','42px');
        set(area,'min-height','42px');
        set(area,'max-height','42px');
        set(area,'margin', narrow ? '0 10px 0 auto' : '0 12px 0 auto');
        set(area,'padding','3px');
        set(area,'gap','5px');
        set(area,'background','#111514');
        set(area,'background-image','none');
        set(area,'border','1px solid rgba(245,176,38,.38)');
        set(area,'border-radius','10px');
        set(area,'box-shadow','none');
        set(area,'overflow','hidden');

        var lang = area.querySelector('.language-picker');
        if (lang) set(lang,'display','none');

        styleLink(area.querySelector(ACCOUNT_SELECTOR), false);
        styleLink(area.querySelector(LOGOUT_SELECTOR), true);

        var top = area.closest('.reb-top');
        if (top) {
          set(top,'display','flex');
          set(top,'align-items','center');
          set(top,'justify-content','flex-end');
          var phone = top.querySelector('.reb-phone');
          if (phone) set(phone,'display','none');
        }
      });
    } finally {
      applying = false;
    }
  }

  function schedule() {
    requestAnimationFrame(apply);
    setTimeout(apply, 40);
    setTimeout(apply, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('reb:auth-changed', schedule);

  new MutationObserver(function (mutations) {
    var shouldApply = mutations.some(function (m) {
      return m.type === 'childList' || m.type === 'attributes';
    });
    if (shouldApply) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
})();
