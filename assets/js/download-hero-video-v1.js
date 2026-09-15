(function () {
  'use strict';

  function installViewportAudio(video) {
    var isInView = false;
    var audioUnlocked = false;

    function stopOutsideView() {
      video.muted = true;
      video.pause();
    }

    function playInsideView() {
      if (!isInView || document.hidden) return;
      video.volume = 1;
      video.muted = !audioUnlocked;
      var attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () {
          video.muted = true;
          if (isInView) video.play().catch(function () {});
        });
      }
    }

    function unlockAudioFromGesture() {
      if (audioUnlocked) {
        if (isInView) playInsideView();
        return;
      }
      video.volume = 1;
      video.muted = false;
      var attempt = video.play();
      if (attempt && typeof attempt.then === 'function') {
        attempt.then(function () {
          audioUnlocked = true;
          if (!isInView || document.hidden) {
            video.muted = true;
            video.pause();
          }
        }).catch(function () {
          video.muted = true;
          if (isInView) video.play().catch(function () {});
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
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'].forEach(function (eventName) {
      document.addEventListener(eventName, unlockAudioFromGesture, { passive: true, capture: true });
    });
  }

  function init() {
    var video = document.querySelector('.reb-download-hero-video');
    if (!video) return;
    video.muted = true;
    video.volume = 1;
    installViewportAudio(video);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
