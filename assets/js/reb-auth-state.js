(function () {
  'use strict';

  var API_BASE = 'https://admin.reachempirebot.com';
  var TOKEN_KEY = 'REB_CLIENT_TOKEN';
  var USER_KEY = 'REB_CLIENT_USER';
  var rendering = false;

  function storedToken() {
    return (localStorage.getItem(TOKEN_KEY) || '').trim();
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
    return String(profile.name || profile.username || data.username || 'Account').trim() || 'Account';
  }

  function authAreas() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '.main-header .header-top .option-block, .reb-top .reb-actions, .reb-top .reb-login'
    ));
  }

  function makeLink(text, href, className, action) {
    var link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.className = className;
    link.setAttribute('data-auth-action', action);
    return link;
  }

  function clearArea(area) {
    Array.prototype.slice.call(area.querySelectorAll(
      '[data-auth-action], .reb-session-account, .reb-session-logout, ' +
      'a[href="/signup/"], a[href$="/signup"], a[href*="signup.html"], ' +
      'a[href="/login/"], a[href$="/login"], a[href*="login.html"]'
    )).forEach(function (node) { node.remove(); });
  }

  function renderArea(area, signedIn) {
    clearArea(area);
    area.classList.toggle('reb-auth-logged-in', signedIn);
    if (signedIn) {
      area.appendChild(makeLink(userName(), '/dashboard/',
        'theme-btn btn-one mr_10 reb-session-account', 'dashboard'));
      area.appendChild(makeLink('Log Out', '/login/',
        'theme-btn btn-two reb-session-logout', 'logout'));
      return;
    }
    area.appendChild(makeLink('Sign Up', '/signup/',
      'theme-btn btn-one mr_10 reb-auth-signup', 'signup'));
    area.appendChild(makeLink('Log In', '/login/',
      'theme-btn btn-two reb-auth-login', 'login'));
  }

  function render() {
    if (rendering) return;
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

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('REB_CLIENT_LAST_STATUS');
  }

  function logout(event) {
    var action = event.target.closest('[data-auth-action="logout"], .reb-session-logout');
    if (!action) return;
    event.preventDefault();
    var currentToken = storedToken();
    var finish = function () {
      clearSession();
      window.location.replace('/login/');
    };
    if (!currentToken) { finish(); return; }
    fetch(API_BASE + '/api/mobile/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + currentToken }
    }).catch(function () {}).then(finish);
  }

  function start() {
    render();
    window.addEventListener('load', render, { once: true });
    document.addEventListener('click', logout);
    window.addEventListener('storage', function (event) {
      if (event.key === TOKEN_KEY || event.key === USER_KEY) render();
    });
    window.addEventListener('reb:auth-changed', render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
