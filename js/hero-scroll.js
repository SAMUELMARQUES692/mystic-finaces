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

  /* the dragon->tiger crossfade, timed against the HERO pin's own scroll (fixed,
     content-independent) rather than the tiger pin's (which grows with the
     recursos grid) — keeping it a fraction of the tiger pin's range would make
     the crossfade drag out as that content grows. Tuned to finish comfortably
     before heroProgress reaches 1, so the dissolve reads as quick and decisive. */
  var CROSSFADE_START = 0.58;
  var CROSSFADE_END = 0.80;
  /* hero text clears out early in its own scroll, well before the tiger crossfade */
  var TEXT_EXIT_START = 0.06;
  var TEXT_EXIT_END = 0.32;
  /* the tiger video/content stays fully lit while its scrolling content (recursos)
     is on screen; it only dims in the last stretch, right before the mist bridge */
  var TIGER_DIM_START = 0.82;

  /* how quickly the smoothed (rendered) progress catches up to the real scroll
     position each frame — lower = silkier but laggier, higher = snappier.
     Applied per-frame via an exponential approach so it stays frame-rate independent. */
  var SMOOTHING = 0.16;

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

  var heroSmooth = 0, tigerSmooth = 0;
  var initialized = false;
  var rafId = null;

  function render(heroProgress, tigerProgress) {
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

    var veil = Math.min(Math.max((heroProgress - CROSSFADE_START) / (CROSSFADE_END - CROSSFADE_START), 0), 1);
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

  function tick() {
    var heroTarget = pinProgress(heroPin);
    var tigerTarget = pinProgress(tigerPin);

    if (reduceMotion) {
      heroSmooth = heroTarget;
      tigerSmooth = tigerTarget;
    } else {
      if (!initialized) {
        heroSmooth = heroTarget;
        tigerSmooth = tigerTarget;
      } else {
        heroSmooth += (heroTarget - heroSmooth) * SMOOTHING;
        tigerSmooth += (tigerTarget - tigerSmooth) * SMOOTHING;
        /* snap once close enough so the loop can settle instead of chasing forever */
        if (Math.abs(heroTarget - heroSmooth) < 0.0004) heroSmooth = heroTarget;
        if (Math.abs(tigerTarget - tigerSmooth) < 0.0004) tigerSmooth = tigerTarget;
      }
    }
    initialized = true;

    render(heroSmooth, tigerSmooth);

    var settled = heroSmooth === heroTarget && tigerSmooth === tigerTarget;
    if (settled) {
      rafId = null;
    } else {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function requestTick() {
    if (rafId === null) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  requestTick();
})();
