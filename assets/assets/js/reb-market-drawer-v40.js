(function () {
  "use strict";

  var openClass = "reb-market-drawer-open";

  function getNav(toggle) {
    var id = toggle.getAttribute("aria-controls");
    return (id && document.getElementById(id)) || document.querySelector(".reb-market-nav");
  }

  function closeDrawer() {
    document.body.classList.remove(openClass);
    document.querySelectorAll(".reb-market-menu-toggle").forEach(function (button) {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function prepare(nav) {
    if (!nav || nav.dataset.drawerReady === "true") return;
    nav.dataset.drawerReady = "true";
    nav.classList.remove("is-open");

    var head = document.createElement("div");
    head.className = "reb-market-drawer-head";
    head.innerHTML =
      '<div class="reb-market-drawer-brand">' +
        '<img src="/assets/images/logo-2.png" alt="ReachEmpireBot">' +
        '<span>Reach <b style="color:#ffb321">EmpireBot</b><small>Auto Trading Software</small></span>' +
      '</div>' +
      '<button class="reb-market-drawer-close" type="button" aria-label="Close menu">&times;</button>';
    nav.insertBefore(head, nav.firstChild);

    var backdrop = document.querySelector(".reb-market-drawer-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "reb-market-drawer-backdrop";
      backdrop.setAttribute("aria-label", "Close menu");
      document.body.appendChild(backdrop);
    }

    head.querySelector(".reb-market-drawer-close").addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeDrawer);
    });
  }

  function init() {
    document.querySelectorAll(".reb-market-menu-toggle").forEach(function (toggle) {
      prepare(getNav(toggle));
    });

    document.addEventListener("click", function (event) {
      var toggle = event.target.closest(".reb-market-menu-toggle");
      if (!toggle) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var nav = getNav(toggle);
      prepare(nav);
      var willOpen = !document.body.classList.contains(openClass);
      document.body.classList.toggle(openClass, willOpen);
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen && nav) nav.scrollTop = 0;
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeDrawer();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
