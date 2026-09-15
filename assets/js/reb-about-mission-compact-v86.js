(function () {
  "use strict";

  var titles = [
    "Risk First",
    "Automation With Control",
    "Market Focused",
    "Live Monitoring"
  ];

  function textOf(element) {
    return (element && element.textContent ? element.textContent : "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findCard(heading) {
    var node = heading;
    var fallback = heading.parentElement;

    for (var level = 0; node && level < 7; level += 1, node = node.parentElement) {
      if (node.matches && node.matches("article, li, [class*='card'], [class*='feature'], [class*='value']")) {
        return node;
      }

      if (node !== heading && node.querySelector && node.querySelector("p")) {
        fallback = node;
      }
    }

    return fallback;
  }

  function findCommonParent(cards) {
    var parent = cards[0] && cards[0].parentElement;

    while (parent && !cards.every(function (card) { return parent.contains(card); })) {
      parent = parent.parentElement;
    }

    return parent;
  }

  function markIcon(card, heading) {
    var candidates = Array.prototype.slice.call(
      card.querySelectorAll("[class*='icon'], i, svg")
    );

    var icon = candidates.find(function (candidate) {
      return !candidate.contains(heading) && !heading.contains(candidate);
    });

    if (!icon) return;

    if (icon.tagName && (icon.tagName.toLowerCase() === "svg" || icon.tagName.toLowerCase() === "i")) {
      var wrapper = icon.parentElement;
      if (wrapper && wrapper !== card && wrapper.children.length <= 2) {
        icon = wrapper;
      }
    }

    icon.classList.add("reb-about-v86-icon");
  }

  function applyCompactMissionCards() {
    if (!/about/i.test(window.location.pathname)) return;

    var headings = Array.prototype.slice.call(document.querySelectorAll("h2, h3, h4, h5"));
    var cards = [];

    titles.forEach(function (title) {
      var heading = headings.find(function (candidate) {
        return textOf(candidate).toLowerCase() === title.toLowerCase();
      });

      if (!heading) return;

      var card = findCard(heading);
      if (!card || cards.indexOf(card) !== -1) return;

      card.classList.add("reb-about-v86-card");
      heading.classList.add("reb-about-v86-title");

      Array.prototype.slice.call(card.querySelectorAll("p")).forEach(function (paragraph) {
        paragraph.classList.add("reb-about-v86-copy");
      });

      markIcon(card, heading);
      cards.push(card);
    });

    if (cards.length < 2) return;

    var grid = findCommonParent(cards);
    if (grid) {
      grid.classList.add("reb-about-v86-grid");
      var section = grid.closest("section");
      if (section) section.classList.add("reb-about-v86-section");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCompactMissionCards);
  } else {
    applyCompactMissionCards();
  }
})();
