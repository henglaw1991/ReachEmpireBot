(function () {
  "use strict";

  function textOf(node) {
    return (node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function findHeading(fragment) {
    var wanted = fragment.toLowerCase();
    return Array.from(document.querySelectorAll("h1, h2, h3, h4")).find(function (node) {
      return textOf(node).toLowerCase().indexOf(wanted) !== -1;
    });
  }

  function sectionFor(node) {
    if (!node) return null;
    return node.closest("section, article, main > div, .container, .wrapper") || node.parentElement;
  }

  function addClassByHeading(fragment, className) {
    var heading = findHeading(fragment);
    var section = sectionFor(heading);
    if (section) section.classList.add(className);
    return section;
  }

  function addCardClass(fragment, className) {
    var heading = findHeading(fragment);
    if (!heading) return null;
    var card = heading.closest("article, li, .card, [class*='card'], [class*='item'], div") || heading.parentElement;
    if (card) card.classList.add(className);
    return card;
  }

  function installViewportAudio(video) {
    var isInView = false;

    function stopOutsideView() {
      video.muted = true;
      video.pause();
    }

    function playInsideView() {
      if (!isInView || document.hidden) return;
      video.volume = 1;
      video.muted = false;
      var playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(function () {
          if (!isInView) return;
          video.muted = true;
          var mutedAttempt = video.play();
          if (mutedAttempt && typeof mutedAttempt.catch === "function") {
            mutedAttempt.catch(function () {});
          }
        });
      }
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isInView = entry.isIntersecting && entry.intersectionRatio >= 0.55;
          if (isInView) playInsideView();
          else stopOutsideView();
        });
      }, { threshold: [0, 0.25, 0.55, 0.8] });
      observer.observe(video);
    } else {
      isInView = true;
      playInsideView();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopOutsideView();
      else if (isInView) playInsideView();
    });
    document.addEventListener("pointerdown", function () {
      if (isInView) playInsideView();
    }, { passive: true });
  }

  function installVideo(hero) {
    if (!hero) return;

    var existing = hero.querySelector("video.reb-about-video");
    if (existing) return;

    var images = Array.from(hero.querySelectorAll("img")).filter(function (img) {
      var identity = ((img.getAttribute("src") || "") + " " + (img.getAttribute("alt") || "") + " " + img.className).toLowerCase();
      return identity.indexOf("logo") === -1 && identity.indexOf("brand") === -1;
    });

    var target = images.find(function (img) {
      var identity = ((img.getAttribute("src") || "") + " " + (img.getAttribute("alt") || "") + " " + img.className).toLowerCase();
      return /robot|mascot|hero|about/.test(identity);
    }) || images.sort(function (a, b) {
      return (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight);
    })[0];

    if (!target) return;

    var replaceTarget = target.closest("picture") || target;
    var media = replaceTarget.parentElement;
    if (media) media.classList.add("reb-about-hero-media");

    var video = document.createElement("video");
    video.className = "reb-about-video";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", "ReachEmpireBot About Us video");

    var source = document.createElement("source");
    source.src = "/assets/videos/about-us.mp4?v=20260727v85";
    source.type = "video/mp4";
    video.appendChild(source);

    replaceTarget.replaceWith(video);
    installViewportAudio(video);

    if (media) {
      Array.from(media.querySelectorAll("div, span, p")).forEach(function (node) {
        if (/24\s*\/\s*7|automation monitoring/i.test(textOf(node))) {
          node.classList.add("reb-about-hide-badge");
        }
      });
    }
  }

  function init() {
    var pageText = textOf(document.body).toLowerCase();
    var isAbout = /(^|\/)about(?:-us)?(?:\/|\.html|$)/i.test(location.pathname) ||
      pageText.indexOf("built for disciplined auto trading") !== -1;
    if (!isAbout) return;

    document.body.classList.add("reb-about-v85");

    var hero = addClassByHeading("Built for Disciplined Auto Trading", "reb-about-hero");
    installVideo(hero);

    var mission = addClassByHeading("Make automated trading clearer", "reb-about-mission");
    ["Risk First", "Automation With Control", "Market Focused", "Live Monitoring"].forEach(function (title) {
      var card = addCardClass(title, "reb-about-mission-card");
      if (card && mission && !mission.contains(card)) mission.appendChild(card);
    });

    var stats = [
      addCardClass("Main bot markets", "reb-about-stat"),
      addCardClass("Built around MetaTrader", "reb-about-stat"),
      addCardClass("Signal-assisted automation logic", "reb-about-stat")
    ].filter(Boolean);
    if (stats.length) {
      var statsSection = sectionFor(stats[0]);
      if (statsSection) statsSection.classList.add("reb-about-stats");
    }

    addClassByHeading("How We Prepare a Bot Setup", "reb-about-workflow");
    ["Understand Strategy", "Set Risk Rules", "Connect Platform", "Launch and Monitor"].forEach(function (title) {
      addCardClass(title, "reb-about-workflow-card");
    });

    addClassByHeading("Simple design. Serious control", "reb-about-cta");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
