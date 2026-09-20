(function () {
  var topbar = document.getElementById('topbar');
  if (topbar) {
    window.addEventListener('scroll', function () {
      topbar.classList.toggle('is-scrolled', window.scrollY > 12);
    }, { passive: true });
  }

  var menuBtn = document.getElementById('topbarMenuBtn');
  var mobileMenu = document.getElementById('topbarMobileMenu');
  if (menuBtn && mobileMenu) {
    function closeMenu() {
      mobileMenu.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeMenu();
    });
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
