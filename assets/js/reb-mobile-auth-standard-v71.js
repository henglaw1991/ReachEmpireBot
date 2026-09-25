(function () {
  'use strict';

  /* Phase 1B: one runtime authority for Mobile Header/Auth.
     The existing filename is preserved so no HTML route changes are required. */

  var AREA_SELECTOR =
    '.main-header .header-top .option-block,' +
    '.reb-top .reb-actions,' +
    '.reb-top .reb-login';

  var MOBILE = window.matchMedia('(max-width: 767px)');
  var originals = new WeakMap();
  var scheduled = false;
  var applying = false;

  function remember(node) {
    if (!node || originals.has(node)) return;
    originals.set(node, node.getAttribute('style'));
  }

  function restore(node) {
    if (!node || !originals.has(node)) return;
    var original = originals.get(node);
    if (original === null) node.removeAttribute('style');
    else node.setAttribute('style', original);
    originals.delete(node);
  }

  function set(node, prop, value) {
    if (!node) return;
    remember(node);
    node.style.setProperty(prop, value, 'important');
  }

  function setMany(node, map) {
    if (!node) return;
    Object.keys(map).forEach(function (key) { set(node, key, map[key]); });
  }

  function signedIn(area) {
    return area.classList.contains('reb-auth-logged-in') ||
      Boolean(area.querySelector('.reb-session-account, .reb-session-logout'));
  }

  function styleTop(area) {
    var top = area.closest('.reb-top');
    if (top) {
      setMany(top, {
        'box-sizing': 'border-box',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'flex-end',
        'width': '100%',
        'height': '56px',
        'min-height': '56px',
        'max-height': '56px',
        'margin': '0',
        'padding': '7px 14px',
        'overflow': 'hidden',
        'background': '#101312'
      });
      var phone = top.querySelector('.reb-phone');
      if (phone) set(phone, 'display', 'none');
    }

    var headerTop = area.closest('.header-top');
    if (headerTop) {
      setMany(headerTop, {
        'box-sizing': 'border-box',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'flex-end',
        'width': '100%',
        'height': '56px',
        'min-height': '56px',
        'max-height': '56px',
        'margin': '0',
        'padding': '7px 14px',
        'overflow': 'hidden',
        'background': '#101312'
      });

      var support = headerTop.querySelector('.support-box');
      if (support) set(support, 'display', 'none');
      var language = headerTop.querySelector('.language-picker');
      if (language) set(language, 'display', 'none');

      var large = headerTop.querySelector('.large-container');
      var inner = headerTop.querySelector('.top-inner');
      [large, inner].forEach(function (node) {
        if (!node) return;
        setMany(node, {
          'box-sizing': 'border-box',
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'flex-end',
          'width': '100%',
          'max-width': 'none',
          'height': '100%',
          'margin': '0',
          'padding': '0'
        });
      });
    }
  }

  function styleLink(link, kind, narrow) {
    if (!link) return;

    setMany(link, {
      'box-sizing': 'border-box',
      'display': 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'width': '100%',
      'min-width': '0',
      'max-width': 'none',
      'height': '34px',
      'min-height': '34px',
      'max-height': '34px',
      'margin': '0',
      'padding': narrow ? '0 6px' : '0 9px',
      'border-radius': '7px',
      'font-family': 'inherit',
      'font-size': narrow ? '12px' : '13px',
      'font-weight': '800',
      'line-height': '1',
      'letter-spacing': '0',
      'text-align': 'center',
      'white-space': 'nowrap',
      'overflow': 'hidden',
      'text-overflow': 'ellipsis',
      'box-shadow': 'none',
      'transform': 'none',
      'background-image': 'none',
      'text-decoration': 'none'
    });

    if (kind === 'signup') {
      set(link, 'color', '#080808');
      set(link, 'background', '#ffb11b');
      set(link, 'border', '1px solid #ffb11b');
    } else if (kind === 'login') {
      set(link, 'color', '#fff');
      set(link, 'background', '#101413');
      set(link, 'border', '1px solid #59605f');
    } else if (kind === 'account') {
      set(link, 'min-width', narrow ? '104px' : '112px');
      set(link, 'max-width', narrow ? '156px' : '174px');
      set(link, 'color', '#fff');
      set(link, 'background', '#181b18');
      set(link, 'border', '1px solid #a27618');
    } else if (kind === 'logout') {
      var w = narrow ? '78px' : '84px';
      set(link, 'width', w);
      set(link, 'min-width', w);
      set(link, 'max-width', w);
      set(link, 'color', '#fff');
      set(link, 'background', '#321919');
      set(link, 'border', '1px solid #8b3b3b');
    }
  }

  function styleArea(area) {
    var isSignedIn = signedIn(area);
    var narrow = window.innerWidth <= 359;

    styleTop(area);

    setMany(area, {
      'box-sizing': 'border-box',
      'position': 'static',
      'inset': 'auto',
      'transform': 'none',
      'display': 'grid',
      'align-items': 'center',
      'height': '42px',
      'min-height': '42px',
      'max-height': '42px',
      'margin': '0 0 0 auto',
      'padding': '3px',
      'gap': '4px',
      'overflow': 'hidden',
      'background': '#111514',
      'background-image': 'none',
      'border': '1px solid rgba(245,176,38,.40)',
      'border-radius': '10px',
      'box-shadow': 'none'
    });

    var lang = area.querySelector('.language-picker');
    if (lang) set(lang, 'display', 'none');

    if (isSignedIn) {
      set(area, 'grid-template-columns', narrow ? 'minmax(104px, auto) 78px' : 'minmax(112px, auto) 84px');
      set(area, 'width', 'max-content');
      set(area, 'min-width', narrow ? '210px' : '220px');
      set(area, 'max-width', narrow ? 'calc(100vw - 20px)' : 'calc(100vw - 28px)');

      styleLink(area.querySelector('.reb-session-account'), 'account', narrow);
      styleLink(area.querySelector('.reb-session-logout'), 'logout', narrow);
    } else {
      var frame = narrow ? '232px' : '244px';
      set(area, 'grid-template-columns', 'repeat(2, minmax(0, 1fr))');
      set(area, 'width', frame);
      set(area, 'min-width', frame);
      set(area, 'max-width', frame);

      styleLink(area.querySelector('.reb-auth-signup, a[href*="/signup/"]'), 'signup', narrow);
      styleLink(area.querySelector('.reb-auth-login, a[href*="/login/"]'), 'login', narrow);
    }
  }

  function restoreAll() {
    document.querySelectorAll(AREA_SELECTOR).forEach(function (area) {
      var related = [
        area,
        area.closest('.reb-top'),
        area.closest('.header-top'),
        area.querySelector('.language-picker'),
        area.querySelector('.reb-session-account'),
        area.querySelector('.reb-session-logout'),
        area.querySelector('.reb-auth-signup, a[href*="/signup/"]'),
        area.querySelector('.reb-auth-login, a[href*="/login/"]')
      ];
      var headerTop = area.closest('.header-top');
      if (headerTop) {
        related.push(headerTop.querySelector('.support-box'));
        related.push(headerTop.querySelector('.language-picker'));
        related.push(headerTop.querySelector('.large-container'));
        related.push(headerTop.querySelector('.top-inner'));
      }
      var top = area.closest('.reb-top');
      if (top) related.push(top.querySelector('.reb-phone'));
      related.forEach(restore);
    });
  }

  function apply() {
    scheduled = false;
    if (applying) return;
    applying = true;
    try {
      if (!MOBILE.matches) {
        restoreAll();
        return;
      }
      document.querySelectorAll(AREA_SELECTOR).forEach(styleArea);
    } finally {
      applying = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
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
  if (MOBILE.addEventListener) MOBILE.addEventListener('change', schedule);
  else if (MOBILE.addListener) MOBILE.addListener(schedule);

  new MutationObserver(function (mutations) {
    if (applying) return;
    var relevant = mutations.some(function (m) {
      return m.type === 'childList' ||
        (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'href'));
    });
    if (relevant) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'href']
  });
})();
