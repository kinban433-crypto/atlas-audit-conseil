/* ============================================================
   Atlas Audit & Conseil — parallaxe & révélation (modèle 612)
   Léger, sans dépendance, désactivé si l'utilisateur préfère
   réduire les animations.
   ============================================================ */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bands = Array.prototype.slice.call(document.querySelectorAll('.band'));

  /* Parallaxe douce sur les bandes photo (bureau uniquement) */
  if (!reduce && bands.length) {
    var ticking = false;

    var update = function () {
      var vh = window.innerHeight;

      bands.forEach(function (band) {
        var img = band.querySelector('img');
        if (!img) return;

        var rect = band.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;

        var center = rect.top + rect.height / 2;
        var offset = (center - vh / 2) / ((vh + rect.height) / 2);
        offset = Math.max(-1, Math.min(1, offset));

        var shift = offset * vh * 0.1;
        img.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0) scale(1.12)';
      });

      ticking = false;
    };

    var onScroll = function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    if (window.innerWidth >= 960) {
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
    }

    window.addEventListener('resize', function () {
      if (window.innerWidth < 960) {
        bands.forEach(function (band) {
          var img = band.querySelector('img');
          if (img) img.style.transform = 'none';
        });
      } else {
        update();
      }
    });
  }

  /* Révélation au défilement des grands blocs */
  var targets = document.querySelectorAll(
    '.page-head > .wrap, .section > .wrap, .band, .cta-band > .wrap, .editorial'
  );

  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  Array.prototype.forEach.call(targets, function (el) {
    el.classList.add('reveal');
    io.observe(el);
  });
})();
