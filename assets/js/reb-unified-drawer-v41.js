(function () {
  "use strict";

  var BREAKPOINT = 860;
  var bodyClass = "reb-unified-drawer-open";
  var toggleSelector = ".reb-mobile-menu-toggle, .reb-market-menu-toggle";
  var states = [];
  var lastFocused = null;
  var mq = window.matchMedia ? window.matchMedia("(max-width: " + BREAKPOINT + "px)") : null;

  function isMobile() {
    return mq ? mq.matches : window.innerWidth <= BREAKPOINT;
  }

  function normalizePath(path) {
    var p = String(path || "/").split("?")[0].split("#")[0];
    p = p.replace(/\/index\.html?$/i, "/");
    if (p.length > 1 && !p.endsWith("/")) p += "/";
    return p || "/";
  }

  function markActiveLink(nav) {
    if (!nav) return;
    var current = normalizePath(window.location.pathname);
    nav.querySelectorAll("a[href]").forEach(function (link) {
      var target;
      try { target = new URL(link.getAttribute("href"), window.location.origin); }
      catch (e) { return; }
      if (target.origin !== window.location.origin) return;
      var match = normalizePath(target.pathname) === current;
      link.classList.toggle("active", match);
      if (match) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function navFor(toggle) {
    var existing = stateForToggle(toggle);
    if (existing) return existing.nav;
    var controlled = toggle.getAttribute("aria-controls");
    if (controlled && document.getElementById(controlled)) return document.getElementById(controlled);
    var sibling = toggle.nextElementSibling;
    if (sibling && sibling.matches("nav, .reb-nav, .reb-market-nav")) return sibling;
    var header = toggle.closest("header");
    return header ? header.querySelector("nav") : null;
  }

  function stateForToggle(toggle) {
    for (var i = 0; i < states.length; i++) if (states[i].toggle === toggle) return states[i];
    return null;
  }

  function stateForNav(nav) {
    for (var i = 0; i < states.length; i++) if (states[i].nav === nav) return states[i];
    return null;
  }

  function createState(toggle, nav) {
    var st = {
      toggle: toggle,
      nav: nav,
      originalParent: nav.parentNode,
      originalNext: nav.nextSibling,
      originalClass: nav.className || "",
      originalId: nav.id || "",
      originalStyle: nav.getAttribute("style"),
      originalAriaControls: toggle.getAttribute("aria-controls"),
      generatedId: false,
      head: null,
      prepared: false,
      injectedSocial: null
    };
    states.push(st);
    return st;
  }

  function ensureBackdrop() {
    var backdrop = document.querySelector(".reb-unified-drawer-backdrop");
    if (backdrop) return backdrop;
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "reb-unified-drawer-backdrop";
    backdrop.setAttribute("aria-label", "Close navigation");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function ensureSocialLink(nav, st) {
    if (!nav || !st) return;
    var existing = nav.querySelector('a[href="/social/"], a[href="/social"]');
    if (existing) return;
    var link = document.createElement("a");
    link.href = "/social/";
    link.textContent = "Social Center";
    link.className = "reb-social-mobile-link";
    link.setAttribute("data-reb-social-mobile-link", "true");
    var market = nav.querySelector('a[href="/markets/"], a[href="/markets"]');
    if (market && market.parentNode === nav && market.nextSibling) nav.insertBefore(link, market.nextSibling);
    else if (market && market.parentNode === nav) nav.appendChild(link);
    else nav.appendChild(link);
    st.injectedSocial = link;
  }

  function prepare(toggle, nav) {
    if (!toggle || !nav || !isMobile()) return null;
    var st = stateForNav(nav) || createState(toggle, nav);
    st.toggle = toggle;
    if (st.prepared) return st;

    if (!nav.id) {
      nav.id = "reb-unified-drawer-" + Math.random().toString(36).slice(2, 9);
      st.generatedId = true;
    }
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");

    nav.dataset.unifiedDrawer = "true";
    nav.className = "reb-unified-drawer";
    nav.setAttribute("aria-hidden", "true");
    markActiveLink(nav);

    var head = document.createElement("div");
    head.className = "reb-unified-drawer-head";
    head.innerHTML = '<button class="reb-unified-drawer-close" type="button" aria-label="Close navigation">&times;</button>';
    nav.insertBefore(head, nav.firstChild);
    st.head = head;

    document.body.appendChild(nav);
    st.prepared = true;
    return st;
  }

  function closeAll(restoreFocus) {
    document.body.classList.remove(bodyClass);
    states.forEach(function (st) {
      if (!st.prepared) return;
      st.toggle.classList.remove("is-open");
      st.toggle.setAttribute("aria-expanded", "false");
      st.toggle.setAttribute("aria-label", "Open navigation");
      st.nav.setAttribute("aria-hidden", "true");
    });
    var backdrop = document.querySelector(".reb-unified-drawer-backdrop");
    if (backdrop) backdrop.setAttribute("aria-hidden", "true");
    if (restoreFocus && lastFocused && document.contains(lastFocused)) {
      try { lastFocused.focus({ preventScroll: true }); } catch (e) { try { lastFocused.focus(); } catch (_) {} }
    }
    lastFocused = null;
  }

  function openDrawer(st) {
    if (!st || !st.prepared || !isMobile()) return;
    closeAll(false);
    lastFocused = st.toggle;
    document.body.classList.add(bodyClass);
    st.toggle.classList.add("is-open");
    st.toggle.setAttribute("aria-expanded", "true");
    st.toggle.setAttribute("aria-label", "Close navigation");
    st.nav.setAttribute("aria-hidden", "false");
    st.nav.scrollTop = 0;
    var backdrop = ensureBackdrop();
    backdrop.setAttribute("aria-hidden", "false");
    var closeButton = st.nav.querySelector(".reb-unified-drawer-close");
    if (closeButton) {
      window.setTimeout(function () { try { closeButton.focus({ preventScroll: true }); } catch (e) { closeButton.focus(); } }, 0);
    }
  }

  function restoreState(st) {
    if (!st || !st.prepared) return;
    if (st.injectedSocial && st.injectedSocial.parentNode === st.nav) st.nav.removeChild(st.injectedSocial);
    st.injectedSocial = null;
    if (st.head && st.head.parentNode === st.nav) st.nav.removeChild(st.head);
    st.head = null;

    st.nav.className = st.originalClass;
    st.nav.removeAttribute("data-unified-drawer");
    st.nav.removeAttribute("aria-hidden");
    if (st.originalStyle === null) st.nav.removeAttribute("style");
    else st.nav.setAttribute("style", st.originalStyle);

    if (st.generatedId) st.nav.removeAttribute("id");
    else st.nav.id = st.originalId;

    if (st.originalAriaControls === null) st.toggle.removeAttribute("aria-controls");
    else st.toggle.setAttribute("aria-controls", st.originalAriaControls);
    st.toggle.classList.remove("is-open");
    st.toggle.setAttribute("aria-expanded", "false");
    st.toggle.setAttribute("aria-label", "Open navigation");

    if (st.originalParent) {
      if (st.originalNext && st.originalNext.parentNode === st.originalParent) st.originalParent.insertBefore(st.nav, st.originalNext);
      else st.originalParent.appendChild(st.nav);
    }
    st.prepared = false;
  }

  function mountMobile() {
    document.querySelectorAll(toggleSelector).forEach(function (toggle) {
      var nav = navFor(toggle);
      if (nav) prepare(toggle, nav);
    });
    ensureBackdrop();
  }

  function unmountMobile() {
    closeAll(false);
    states.forEach(restoreState);
    var backdrop = document.querySelector(".reb-unified-drawer-backdrop");
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  }

  function syncMode() {
    if (isMobile()) mountMobile();
    else unmountMobile();
  }

  function activeState() {
    for (var i = 0; i < states.length; i++) {
      if (states[i].prepared && states[i].toggle.getAttribute("aria-expanded") === "true") return states[i];
    }
    return null;
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    var st = activeState();
    if (!st) return;
    var focusable = st.nav.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function init() {
    syncMode();

    document.addEventListener("click", function (event) {
      var toggle = event.target.closest(toggleSelector);
      if (toggle && isMobile()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var st = stateForToggle(toggle) || prepare(toggle, navFor(toggle));
        if (!st) return;
        if (document.body.classList.contains(bodyClass) && toggle.getAttribute("aria-expanded") === "true") closeAll(true);
        else openDrawer(st);
        return;
      }

      var closeButton = event.target.closest(".reb-unified-drawer-close");
      var backdrop = event.target.closest(".reb-unified-drawer-backdrop");
      var drawerLink = event.target.closest("nav.reb-unified-drawer a[href]");
      if (closeButton || backdrop || drawerLink) closeAll(closeButton || backdrop ? true : false);
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && document.body.classList.contains(bodyClass)) {
        event.preventDefault();
        closeAll(true);
        return;
      }
      trapFocus(event);
    });

    if (mq && typeof mq.addEventListener === "function") mq.addEventListener("change", syncMode);
    else if (mq && typeof mq.addListener === "function") mq.addListener(syncMode);
    else window.addEventListener("resize", syncMode);

    window.addEventListener("pageshow", function () {
      if (isMobile()) {
        states.forEach(function (st) { if (st.prepared) markActiveLink(st.nav); });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
