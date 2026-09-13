(function () {
  var heroPin = document.getElementById('heroPin');
  var tigerPin = document.getElementById('tigerPin');
  var hero = document.getElementById('hero');
  var tigerBand = document.getElementById('tigerBand');
  if (!heroPin || !tigerPin || !hero || !tigerBand) return;

  var heroVideo = document.getElementById('heroVideo');
  var tigerVideo = document.getElementById('tigerVideo');
  var mist = document.querySelector('.fold-bridge__mist');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* fraction of the tiger pin's own scroll range spent crossfading over the dragon.
     Tuned so the veil reaches 1 right as the hero's own dark fade finishes, so the
     two effects dissolve into each other with no gap and no hard cut. */
  var CROSSFADE = 0.35;
  /* hero text clears out early in its own scroll, well before the tiger crossfade */
  var TEXT_EXIT_START = 0.06;
  var TEXT_EXIT_END = 0.32;
  /* the tiger video/content stays fully lit while its scrolling content (recursos)
     is on screen; it only dims in the last stretch, right before the mist bridge */
  var TIGER_DIM_START = 0.82;

  function watchDuration(video, onReady) {
    if (!video) return;
    video.pause();
    if (video.readyState >= 1 && video.duration) {
      onReady(video.duration);
    } else {
      video.addEventListener('loadedmetadata', function () {
        onReady(video.duration);
      }, { once: true });
    }
  }

  var heroDuration = 0, tigerDuration = 0;
  watchDuration(heroVideo, function (d) { heroDuration = d; });
  watchDuration(tigerVideo, function (d) { tigerDuration = d; });

  function scrubTo(video, duration, time) {
    if (!video || !duration || video.seeking) return;
    try { video.currentTime = Math.min(Math.max(time, 0), duration); } catch (e) {}
  }

  function pinProgress(pinEl) {
    var rect = pinEl.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return rect.top <= 0 ? 1 : 0;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  var ticking = false;

  function update() {
    ticking = false;

    var heroProgress = pinProgress(heroPin);
    hero.style.setProperty('--hero-scrim', heroProgress.toFixed(3));
    if (!reduceMotion) {
      hero.style.setProperty('--hero-scale', (1 + heroProgress * 0.16).toFixed(4));
      hero.style.setProperty('--hero-shift', (heroProgress * 50).toFixed(1) + 'px');
    }
    scrubTo(heroVideo, heroDuration, heroProgress * heroDuration);

    var textProgress = Math.min(Math.max((heroProgress - TEXT_EXIT_START) / (TEXT_EXIT_END - TEXT_EXIT_START), 0), 1);
    hero.style.setProperty('--hero-text-opacity', (1 - textProgress).toFixed(3));
    if (!reduceMotion) {
      hero.style.setProperty('--hero-text-shift', (-textProgress * 110).toFixed(1) + 'px');
    }

    var tigerProgress = pinProgress(tigerPin);
    var veil = Math.min(tigerProgress / CROSSFADE, 1);
    var tigerDim = Math.min(Math.max((tigerProgress - TIGER_DIM_START) / (1 - TIGER_DIM_START), 0), 1);
    tigerBand.style.setProperty('--tiger-veil', veil.toFixed(3));
    tigerBand.style.setProperty('--tiger-scrim', tigerDim.toFixed(3));
    if (!reduceMotion) {
      tigerBand.style.setProperty('--tiger-scale', (1.06 - tigerProgress * 0.1).toFixed(4));
      tigerBand.style.setProperty('--tiger-shift', (tigerProgress * -40).toFixed(1) + 'px');
      if (mist) mist.style.setProperty('--mist-shift', (-40 + tigerDim * 40).toFixed(1) + 'px');
    }
    scrubTo(tigerVideo, tigerDuration, tigerProgress * tigerDuration);
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
