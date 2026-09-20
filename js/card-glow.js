// Mystic Finance — pointer-reactive feature cards (second fold)
// Tracks the cursor per-card to drive a spotlight, a gold/jade/pearl gradient
// seam and a gentle 3D tilt, all read by css/landing.css via CSS variables.
(function () {
  var cards = document.querySelectorAll(".feature-grid--on-dark .feature-card");
  if (!cards.length) return;

  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canHover || reduceMotion) return;

  var MAX_TILT = 7; // degrees
  var queued = null;
  var raf = null;

  function apply() {
    raf = null;
    if (!queued) return;
    var card = queued.card;
    var rect = card.getBoundingClientRect();
    var relX = queued.x - rect.left;
    var relY = queued.y - rect.top;
    var px = relX / rect.width;
    var py = relY / rect.height;

    card.style.setProperty("--mx", relX + "px");
    card.style.setProperty("--my", relY + "px");
    card.style.setProperty("--card-rx", ((0.5 - py) * MAX_TILT).toFixed(2) + "deg");
    card.style.setProperty("--card-ry", ((px - 0.5) * MAX_TILT).toFixed(2) + "deg");
    queued = null;
  }

  cards.forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      queued = { card: card, x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener("pointerenter", function () {
      card.style.setProperty("--card-lift", "-8px");
    });
    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--card-lift", "0px");
      card.style.setProperty("--card-rx", "0deg");
      card.style.setProperty("--card-ry", "0deg");
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    });
  });
})();
