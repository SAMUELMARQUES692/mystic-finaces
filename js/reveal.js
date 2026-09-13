(function () {
  var topbar = document.getElementById('topbar');
  if (topbar) {
    window.addEventListener('scroll', function () {
      topbar.classList.toggle('is-scrolled', window.scrollY > 12);
    }, { passive: true });
  }

  var targets = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!('IntersectionObserver' in window) || targets.length === 0) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(function (el) { observer.observe(el); });
})();
