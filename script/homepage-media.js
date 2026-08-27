(function () {
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isNarrowViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function attachSource(video, src) {
    if (!video || !src || video.dataset.loaded === '1') {
      return;
    }

    var source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.dataset.loaded = '1';
    video.load();
  }

  function playMuted(video) {
    if (!video) {
      return;
    }

    video.muted = true;
    var playback = video.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(function () {});
    }
  }

  function setupHeroVideo() {
    var video = document.querySelector('.hero-video');
    if (!video) {
      return;
    }

    var src = video.getAttribute('data-src');
    if (!src) {
      return;
    }

    if (prefersReducedMotion() || isNarrowViewport()) {
      video.pause();
      video.removeAttribute('autoplay');
      return;
    }

    attachSource(video, src);
    if (video.readyState >= 2) {
      playMuted(video);
      return;
    }

    video.addEventListener('canplay', function onCanPlay() {
      video.removeEventListener('canplay', onCanPlay);
      playMuted(video);
    });
  }

  function setupInViewVideos() {
    var videos = document.querySelectorAll('video[data-inview-src]');
    if (!videos.length) {
      return;
    }

    function activate(video) {
      attachSource(video, video.getAttribute('data-inview-src'));
      if (!prefersReducedMotion()) {
        playMuted(video);
      }
    }

    if (!('IntersectionObserver' in window)) {
      videos.forEach(activate);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activate(entry.target);
          return;
        }

        if (!entry.target.paused) {
          entry.target.pause();
        }
      });
    }, { rootMargin: '80px 0px', threshold: 0.2 });

    videos.forEach(function (video) {
      observer.observe(video);
    });
  }

  function init() {
    setupHeroVideo();
    setupInViewVideos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', setupHeroVideo);
})();
