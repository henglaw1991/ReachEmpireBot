(function () {
  'use strict';

  function textOf(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function findTradeHero() {
    var headings = Array.prototype.slice.call(document.querySelectorAll('h1, h2'));
    var heading = headings.find(function (el) {
      return textOf(el) === 'trade account';
    });
    if (!heading) return null;

    var section = heading.closest('section') || heading.parentElement;
    if (!section) return null;

    var images = Array.prototype.slice.call(section.querySelectorAll('img'));
    var robot = images.find(function (img) {
      var value = ((img.getAttribute('src') || '') + ' ' + (img.getAttribute('alt') || '') + ' ' + (img.className || '')).toLowerCase();
      return /(robot|hero|bot)/.test(value) && !/(logo|brand)/.test(value);
    });

    if (!robot) {
      robot = images.sort(function (a, b) {
        return (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight);
      })[0];
    }
    return robot || null;
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
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function () {
          if (!isInView) return;
          video.muted = true;
          var mutedAttempt = video.play();
          if (mutedAttempt && typeof mutedAttempt.catch === 'function') {
            mutedAttempt.catch(function () {});
          }
        });
      }
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isInView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
          if (isInView) playInsideView();
          else stopOutsideView();
        });
      }, { threshold: [0, 0.2, 0.35, 0.6, 0.8] });
      observer.observe(video);
    } else {
      isInView = true;
      playInsideView();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopOutsideView();
      else if (isInView) playInsideView();
    });
    document.addEventListener('pointerdown', function () {
      if (isInView) playInsideView();
    }, { passive: true });
    document.addEventListener('pointerup', function () {
      if (isInView) playInsideView();
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (isInView) playInsideView();
    }, { passive: true });
  }

  function installVideo() {
    if (document.querySelector('.trade-account-hero-video')) return;
    var robot = findTradeHero();
    if (!robot || !robot.parentElement) return;

    var wrapper = robot.parentElement;
    wrapper.classList.add('trade-account-hero-media');

    var video = document.createElement('video');
    video.className = 'trade-account-hero-video';
    video.src = '/assets/videos/trading-account.mp4?v=20260808-brokers1';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-label', 'ReachEmpireBot trading account introduction video');
    video.preload = 'metadata';
    video.controls = false;

    robot.replaceWith(video);
    installViewportAudio(video);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installVideo);
  } else {
    installVideo();
  }
})();
