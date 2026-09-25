/* REB V79 — desktop auth + styled account/username dashboard button.
   Keeps the proven V70 logout flow and restores the legacy dashboard link.
   Mobile and all page/layout code are untouched. */
(function () {
  'use strict';

  if (window.__REB_DESKTOP_AUTH_V79__) return;
  window.__REB_DESKTOP_AUTH_V79__ = true;

  var API_BASE = 'https://admin.reachempirebot.com';
  var TOKEN_KEY = 'REB_CLIENT_TOKEN';
  var USER_KEY = 'REB_CLIENT_USER';
  var rendering = false;
  var loggingOut = false;

  function isDesktop() {
    return Math.min(window.innerWidth || 9999, document.documentElement.clientWidth || 9999) >= 901;
  }

  function storedToken() {
    try { return String(localStorage.getItem(TOKEN_KEY) || '').trim(); }
    catch (error) { return ''; }
  }

  function hasValidSession() {
    var value = storedToken();
    var normalized = value.toLowerCase();
    return Boolean(value && normalized !== 'null' && normalized !== 'undefined' &&
      normalized !== 'false' && normalized.indexOf('pending-') !== 0);
  }

  function userName() {
    var data = {};
    try { data = JSON.parse(localStorage.getItem(USER_KEY) || '{}') || {}; } catch (error) {}
    var profile = data.profile || {};
    return String(data.username || profile.username || profile.name || data.name || 'Account').trim() || 'Account';
  }

  function authAreas() {
    if (!isDesktop()) return [];
    return Array.prototype.slice.call(document.querySelectorAll('.reb-v62-header .reb-v62-auth'));
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('REB_CLIENT_LAST_STATUS');
      localStorage.removeItem('REB_CLIENT_PENDING_SIGNUP');
    } catch (error) {}
  }

  function finishLogout() {
    clearSession();
    try {
      document.documentElement.classList.remove('reb-client-logged-in');
      document.documentElement.classList.add('reb-client-logged-out');
      window.dispatchEvent(new CustomEvent('reb:auth-changed', { detail: { state: 'logged_out' } }));
    } catch (error) {}
    window.location.replace('/login/');
  }

  function logoutNow(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (loggingOut) return false;
    loggingOut = true;

    var currentToken = storedToken();

    /* Local logout must happen immediately; backend logout is best effort. */
    clearSession();
    try {
      if (currentToken) {
        fetch(API_BASE + '/api/mobile/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + currentToken },
          cache: 'no-store',
          keepalive: true
        }).catch(function () {});
      }
    } catch (error) {}

    finishLogout();
    return false;
  }

  function makeLink(text, href, className, action, iconClass) {
    var link = document.createElement('a');
    link.href = href;
    link.className = className;
    link.setAttribute('data-auth-action', action);
    if (iconClass) {
      var icon = document.createElement('i');
      icon.className = iconClass;
      icon.setAttribute('aria-hidden', 'true');
      link.appendChild(icon);
      var span = document.createElement('span');
      span.textContent = text;
      link.appendChild(span);
    } else {
      link.textContent = text;
    }
    if (action === 'logout') {
      /* Direct binding: no dependency on delegated/legacy click handlers. */
      link.addEventListener('click', logoutNow, false);
    }
    return link;
  }

  function renderArea(area, signedIn) {
    while (area.firstChild) area.removeChild(area.firstChild);
    area.classList.toggle('reb-auth-logged-in', signedIn);

    if (signedIn) {
      area.appendChild(makeLink(userName(), '/dashboard/',
        'reb-v62-account reb-session-account', 'dashboard', 'fas fa-user'));
      area.appendChild(makeLink('Log Out', '/login/',
        'reb-v62-logout reb-session-logout', 'logout', 'fas fa-sign-out-alt'));
      return;
    }

    area.appendChild(makeLink('Sign Up', '/signup/',
      'reb-v62-signup', 'signup', ''));
    area.appendChild(makeLink('Log In', '/login/',
      'reb-v62-login', 'login', 'fas fa-sign-in-alt'));
  }

  function render() {
    if (rendering || loggingOut || !isDesktop()) return;
    rendering = true;
    try {
      var signedIn = hasValidSession();
      authAreas().forEach(function (area) { renderArea(area, signedIn); });
      document.documentElement.classList.toggle('reb-client-logged-in', signedIn);
      document.documentElement.classList.toggle('reb-client-logged-out', !signedIn);
    } finally {
      rendering = false;
    }
  }

  /* Capture fallback for any logout node inserted by a legacy script later. */
  function captureLogout(event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
    if (!target || !target.closest) return;
    var action = target.closest('.reb-v62-header .reb-session-logout, .reb-v62-header [data-auth-action="logout"]');
    if (!action) return;
    if (event.defaultPrevented && loggingOut) return;
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    logoutNow(event);
  }

  function start() {
    render();
    window.addEventListener('load', render, { once: true });
    window.addEventListener('pageshow', render);
    window.addEventListener('focus', render);
    document.addEventListener('click', captureLogout, true);
    window.addEventListener('storage', function (event) {
      if (event.key === TOKEN_KEY || event.key === USER_KEY || event.key === 'REB_CLIENT_PENDING_SIGNUP') render();
    });
    window.addEventListener('reb:auth-changed', render);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
