/* ============================================================
   Atlas Audit & Conseil — comportements partagés FR / AR
   JavaScript natif, aucune dépendance.
   ============================================================ */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isArabic = (document.documentElement.lang || '').indexOf('ar') === 0;
  var numberFormat = new Intl.NumberFormat(isArabic ? 'ar-MA' : 'fr-FR');

  /* ----------------------------------------------------------
     Header : filet à partir du premier défilement
  ---------------------------------------------------------- */
  var header = document.querySelector('.site-header');

  if (header) {
    var syncHeader = function () {
      header.classList.toggle('is-stuck', window.scrollY > 6);
    };
    window.addEventListener('scroll', syncHeader, { passive: true });
    syncHeader();
  }

  /* ----------------------------------------------------------
     Navigation mobile
  ---------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  if (nav && toggle) {
    // Libellés du bouton selon la langue de la page (FR / AR)
    var labelOpen = isArabic ? 'إغلاق القائمة' : 'Fermer le menu';
    var labelClose = isArabic ? 'فتح القائمة' : 'Ouvrir le menu';

    /* Verrou de défilement du menu mobile.
       `body { overflow: hidden }` seul laisse la page continuer à rebondir sous
       le panneau sur iOS, et la position peut se perdre à la fermeture. On fige
       donc le body en position: fixed, décalé de la position courante, puis on
       la restaure à l'identique au déverrouillage. */
    var LOCKED_CLASS = 'is-scroll-locked';
    var locked = false;
    var lockedY = 0;
    var lockedPadding = '';

    var lockScroll = function () {
      if (locked) return;
      lockedY = window.pageYOffset || document.documentElement.scrollTop || 0;

      // Sur les navigateurs à barre de défilement classique, le body figé la fait
      // disparaître : on compense pour éviter un saut horizontal de 15 px.
      var scrollbar = window.innerWidth - document.documentElement.clientWidth;
      lockedPadding = document.body.style.paddingInlineEnd;
      if (scrollbar > 0) document.body.style.paddingInlineEnd = scrollbar + 'px';

      document.body.style.top = -lockedY + 'px';
      document.body.classList.add(LOCKED_CLASS);
      locked = true;
    };

    var unlockScroll = function () {
      if (!locked) return;
      document.body.classList.remove(LOCKED_CLASS);
      document.body.style.top = '';
      document.body.style.paddingInlineEnd = lockedPadding;

      // `scroll-behavior: smooth` animerait le retour : on le neutralise le temps
      // de replacer la page exactement où elle était.
      var html = document.documentElement;
      var previous = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockedY);
      html.style.scrollBehavior = previous;

      locked = false;
    };

    var setNav = function (open) {
      var shouldLock = open && window.innerWidth < 960;
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? labelOpen : labelClose);
      if (shouldLock) lockScroll();
      else unlockScroll();
    };

    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('is-open'));
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setNav(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setNav(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960) setNav(false);
    });

    // Retour par le cache de navigation (bfcache) : le DOM revient verrouillé
    // alors que le panneau est fermé — sans cela la page resterait figée en haut.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted && locked) setNav(false);
    });
  }

  /* ----------------------------------------------------------
     Apparition au défilement
  ---------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');

  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) {
      el.classList.add('is-in');
    });
  } else {
    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     Chiffres clés
  ---------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) {
    var target = Number(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';

    var render = function (value) {
      el.textContent = numberFormat.format(value) + suffix;
    };

    if (reduce || !('IntersectionObserver' in window)) {
      render(target);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();

        var start = performance.now();
        var duration = 1400;

        var tick = function (now) {
          var progress = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          render(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
  });

  /* ----------------------------------------------------------
     Simulateur d'honoraires (page Ressources)
  ---------------------------------------------------------- */
  var simulator = document.getElementById('simForm');

  if (simulator) {
    var profileEl = document.getElementById('simProfile');
    var volumeEl = document.getElementById('simVolume');
    var volumeOut = document.getElementById('simVolumeOut');
    var staffEl = document.getElementById('simStaff');
    var staffOut = document.getElementById('simStaffOut');
    var taxEl = document.getElementById('simTax');
    var legalEl = document.getElementById('simLegal');
    var reportEl = document.getElementById('simReport');
    var minEl = document.getElementById('simMin');
    var maxEl = document.getElementById('simMax');
    var yearEl = document.getElementById('simYear');

    // Base mensuelle par profil (MAD HT)
    var BASE = { independant: 700, startup: 1100, pme: 1500, grande: 3200 };

    var round50 = function (n) { return Math.round(n / 50) * 50; };

    var compute = function () {
      var profile = profileEl.value;
      var volume = Number(volumeEl.value);
      var staff = Number(staffEl.value);

      volumeOut.textContent = numberFormat.format(volume);
      staffOut.textContent = numberFormat.format(staff);

      var monthly = BASE[profile] || 1200;

      // Volume de pièces : au-delà de 50 inclues
      monthly += Math.max(0, volume - 50) * 2.5;

      // Paie : 90 MAD par salarié, dégressif au-delà de 20
      monthly += staff <= 20 ? staff * 90 : 1800 + (staff - 20) * 70;

      if (taxEl.checked) monthly += 450;
      if (legalEl.checked) monthly += 300;
      if (reportEl.checked) monthly += 900;

      var min = round50(monthly * 0.95);
      var max = round50(monthly * 1.25);

      minEl.textContent = numberFormat.format(min);
      maxEl.textContent = numberFormat.format(max);
      yearEl.textContent =
        numberFormat.format(min * 12) + ' — ' + numberFormat.format(max * 12) + ' MAD';
    };

    simulator.addEventListener('input', compute);
    simulator.addEventListener('change', compute);
    compute();
  }

  /* ----------------------------------------------------------
     Formulaire de contact
     Validation native complétée : messages en français/arabe,
     puis confirmation. Brancher un endpoint dans le bloc API.
  ---------------------------------------------------------- */
  var form = document.getElementById('contactForm');

  if (form) {
    var success = document.getElementById('formSuccess');
    var isAr = document.documentElement.lang.indexOf('ar') === 0;

    var messages = isAr
      ? {
          name: 'المرجو إدخال الاسم الكامل.',
          email: 'المرجو إدخال بريد إلكتروني صحيح.',
          need: 'المرجو اختيار نوع الطلب.',
          message: 'المرجو وصف حاجتكم في بضعة أسطر.',
          consent: 'المرجو الموافقة على سياسة الخصوصية.'
        }
      : {
          name: 'Merci d’indiquer votre nom complet.',
          email: 'Merci de saisir une adresse email valide.',
          need: 'Merci de sélectionner votre besoin.',
          message: 'Décrivez votre besoin en quelques mots.',
          consent: 'Merci d’accepter la politique de confidentialité.'
        };

    /* Anti-robots, sans CAPTCHA et sans friction pour le visiteur :
       1. honeypot _honey (champ déjà présent dans le HTML) ;
       2. délai minimal de remplissage : un message complet envoyé en moins
          de 4 s vient d'un script, jamais d'une personne ;
       3. un seul envoi réussi par 90 s et par navigateur (double clic inclus) ;
       4. _blacklist, filtré en amont par FormSubmit — liste volontairement étroite,
          car un envoi qui contient une de ces phrases est perdu sans trace (voir le
          commentaire du champ caché dans contact.html).
       Un envoi bloqué ne vide pas le formulaire : le visiteur peut réessayer. */
    var MIN_FILL_MS = 4000;
    var COOLDOWN_MS = 90000;
    var SENT_KEY = 'atlas:lastEnquiry';
    var formReadyAt = Date.now();
    var errorBox = document.getElementById('formError');
    var errorMarkup = errorBox ? errorBox.innerHTML : '';

    var notices = isAr
      ? {
          tooFast: 'وصل الطلب بسرعة أكبر من المعتاد. تحققوا من معلوماتكم ثم أعيدوا الإرسال.',
          tooSoon: 'تم إرسال طلبكم السابق للتو. المرجو الانتظار لحظات قبل إرسال طلب جديد.'
        }
      : {
          tooFast:
            'Votre demande est partie trop vite pour être traitée. Vérifiez vos informations, puis renvoyez-la.',
          tooSoon:
            'Votre demande précédente vient d’être envoyée. Merci de patienter un instant avant un nouvel envoi.'
        };

    var lastSent = function () {
      try {
        return Number(window.localStorage.getItem(SENT_KEY)) || 0;
      } catch (err) {
        return 0;
      }
    };

    var markSent = function () {
      try {
        window.localStorage.setItem(SENT_KEY, String(Date.now()));
      } catch (err) {
        /* Navigation privée ou stockage refusé : le contrôle reste inactif. */
      }
    };

    var showNotice = function (text) {
      if (success) success.hidden = true;
      if (!errorBox) return;
      errorBox.textContent = text;
      errorBox.hidden = false;
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    var checks = {
      fullName: function (field) {
        return field.value.trim().length >= 2 ? '' : messages.name;
      },
      email: function (field) {
        return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(field.value.trim()) ? '' : messages.email;
      },
      need: function (field) {
        return field.value ? '' : messages.need;
      },
      message: function (field) {
        return field.value.trim().length >= 15 ? '' : messages.message;
      },
      consent: function (field) {
        return field.checked ? '' : messages.consent;
      }
    };

    var showError = function (name, message) {
      var slot = form.querySelector('[data-error-for="' + name + '"]');
      var field = form.elements[name];
      if (slot) slot.textContent = message;
      if (field && field.type !== 'checkbox') {
        field.setAttribute('aria-invalid', message ? 'true' : 'false');
      }
    };

    var validate = function (name) {
      var field = form.elements[name];
      if (!field || !checks[name]) return true;
      var message = checks[name](field);
      showError(name, message);
      return !message;
    };

    Object.keys(checks).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      field.addEventListener('blur', function () { validate(name); });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validate(name);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      // On valide tous les champs (map) et non jusqu'au premier échec (every),
      // afin que le visiteur voie l'ensemble des erreurs d'un seul coup.
      var results = Object.keys(checks).map(function (name) { return validate(name); });
      var valid = results.every(Boolean);

      if (!valid) {
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }

      // Champ piège rempli : c'est un robot. On affiche la confirmation
      // sans rien envoyer, comme le ferait le service lui-même.
      var honey = form.elements['_honey'];
      if (honey && honey.value) {
        form.reset();
        if (errorBox) errorBox.hidden = true;
        if (success) success.hidden = false;
        return;
      }

      var now = Date.now();
      if (now - formReadyAt < MIN_FILL_MS) {
        showNotice(notices.tooFast);
        return;
      }
      if (now - lastSent() < COOLDOWN_MS) {
        showNotice(notices.tooSoon);
        return;
      }

      var button = form.querySelector('button[type="submit"]');
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      var idleMarkup = button.innerHTML;
      var busyLabel = button.getAttribute('data-busy');

      if (!endpoint) {
        if (errorBox) errorBox.hidden = false;
        return;
      }

      if (success) success.hidden = true;
      // Une consigne anti-robots a pu remplacer le texte du bloc d'erreur :
      // on restaure celui qui contient le lien mailto avant un nouvel envoi.
      if (errorBox) {
        errorBox.innerHTML = errorMarkup;
        errorBox.hidden = true;
      }

      button.disabled = true;
      if (busyLabel) button.textContent = busyLabel;

      // Toutes les valeurs du formulaire, y compris les champs techniques
      // d'envoi : _subject, _template, _captcha, _honey (anti-robots).
      var payload = {};
      new FormData(form).forEach(function (value, key) {
        payload[key] = typeof value === 'string' ? value : '';
      });

      // Abandon au-delà de 12 s : le visiteur reçoit un message explicite
      // plutôt qu'un formulaire figé.
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 12000);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () { return {}; })
            .then(function (data) { return { ok: response.ok, data: data }; });
        })
        .then(function (result) {
          // Le service répond `success` sous forme de chaîne : "true" / "false"
          var succeeded =
            result.ok && result.data &&
            (result.data.success === true || result.data.success === 'true');

          if (!succeeded) throw new Error('Envoi refusé par le service');

          markSent();
          form.reset();
          Object.keys(checks).forEach(function (name) { showError(name, ''); });
          if (success) {
            success.hidden = false;
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })
        .catch(function () {
          if (errorBox) {
            errorBox.hidden = false;
            errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })
        .finally(function () {
          window.clearTimeout(timeout);
          button.disabled = false;
          button.innerHTML = idleMarkup;
        });
    });
  }

  /* ----------------------------------------------------------
     Année du pied de page
  ---------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
