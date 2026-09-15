(function () {
  "use strict";
  var bodyClass = "reb-unified-drawer-open";
  var toggleSelector = ".reb-mobile-menu-toggle, .reb-market-menu-toggle";

  function navFor(toggle) {
    if (toggle._rebUnifiedNav) return toggle._rebUnifiedNav;
    var controlled = toggle.getAttribute("aria-controls");
    if (controlled && document.getElementById(controlled)) return document.getElementById(controlled);
    var sibling = toggle.nextElementSibling;
    if (sibling && sibling.matches("nav, .reb-nav, .reb-market-nav")) return sibling;
    return toggle.closest("header") && toggle.closest("header").querySelector("nav");
  }

  function closeAll() {
    document.body.classList.remove(bodyClass);
    document.querySelectorAll(toggleSelector).forEach(function (button) {
      button.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function prepare(toggle, nav) {
    if (!nav || nav.dataset.unifiedDrawer === "true") return;
    toggle._rebUnifiedNav = nav;
    if (!nav.id) nav.id = "reb-unified-drawer-" + Math.random().toString(36).slice(2, 9);
    toggle.setAttribute("aria-controls", nav.id);
    nav.dataset.unifiedDrawer = "true";
    /* Detach the drawer from page-specific .reb-nav/.reb-market-nav rules.
       Those legacy classes use strong mobile !important declarations and
       otherwise turn the drawer back into a horizontal header menu. */
    nav.dataset.unifiedDrawerOriginalClass = nav.className || "";
    nav.className = "reb-unified-drawer";

    var head = document.createElement("div");
    head.className = "reb-unified-drawer-head";
    head.innerHTML = '<button class="reb-unified-drawer-close" type="button" aria-label="Close navigation">&times;</button>';
    nav.insertBefore(head, nav.firstChild);
    head.querySelector("button").addEventListener("click", closeAll);
    nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeAll); });
    document.body.appendChild(nav);
  }

  function init() {
    /* This component is a mobile drawer.  On desktop the navigation must stay
       inside its header; detaching it creates an unstyled duplicate below the
       footer.  Keep the existing mobile behaviour unchanged. */
    if (window.innerWidth > 860) return;
    document.querySelectorAll(toggleSelector).forEach(function (toggle) { prepare(toggle, navFor(toggle)); });
    var backdrop = document.querySelector(".reb-unified-drawer-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "reb-unified-drawer-backdrop";
      backdrop.setAttribute("aria-label", "Close navigation");
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", closeAll);
    }

    document.addEventListener("click", function (event) {
      var toggle = event.target.closest(toggleSelector);
      if (!toggle) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var nav = navFor(toggle);
      prepare(toggle, nav);
      var open = !document.body.classList.contains(bodyClass);
      document.body.classList.toggle(bodyClass, open);
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && nav) nav.scrollTop = 0;
    }, true);

    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeAll(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 860) closeAll(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
