// Mystic Finance — hero & second-fold polish: stat count-up + magnetic buttons
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- hero stats count-up ----
  var counters = document.querySelectorAll('.hero__stat b[data-count]');
  function format(el, value) {
    var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
    return value.toFixed(d) + (el.getAttribute('data-suffix') || '');
  }
  counters.forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (reduceMotion) { el.textContent = format(el, target); return; }
    var start = null, delay = 650, dur = 1600;
    el.textContent = format(el, 0);
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(Math.max((ts - start - delay) / dur, 0), 1);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = format(el, target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  // ---- magnetic buttons (hero) ----
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover || reduceMotion) return;
  document.querySelectorAll('.hero .btn').forEach(function (btn) {
    btn.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / r.width;
      var y = (e.clientY - (r.top + r.height / 2)) / r.height;
      btn.style.setProperty('--bx', (x * 8).toFixed(1) + 'px');
      btn.style.setProperty('--by', (y * 6).toFixed(1) + 'px');
    });
    btn.addEventListener('pointerleave', function () {
      btn.style.setProperty('--bx', '0px');
      btn.style.setProperty('--by', '0px');
    });
  });
})();
