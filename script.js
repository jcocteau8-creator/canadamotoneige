const burger = document.getElementById('burger');
const mainNav = document.getElementById('mainNav');
const header = document.getElementById('header');

burger.addEventListener('click', () => {
  mainNav.classList.toggle('open');
  burger.classList.toggle('active');
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    burger.classList.remove('active');
  });
});

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

document.querySelector('.contact-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Merci pour votre demande ! Notre équipe vous recontactera rapidement.');
  e.target.reset();
});

// Itinéraire interactif (timeline jour par jour)
document.querySelectorAll('.itinerary-layout').forEach(layout => {
  const steps = layout.querySelectorAll('.itinerary-step');
  const panels = layout.querySelectorAll('.itinerary-panel');
  steps.forEach(step => {
    step.addEventListener('click', () => {
      steps.forEach(s => s.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      step.classList.add('active');
      const day = step.dataset.day;
      layout.querySelector(`.itinerary-panel[data-day="${day}"]`)?.classList.add('active');
    });
  });
});

// Pré-sélectionne le forfait depuis l'URL (ex: contact.html?forfait=Mix%20Express)
const forfaitParam = new URLSearchParams(location.search).get('forfait');
if (forfaitParam) {
  const missionSelect = document.querySelector('select[name="mission"]');
  const match = missionSelect && Array.from(missionSelect.options).find(o => o.textContent.trim() === forfaitParam);
  if (match) missionSelect.value = match.value;
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

// Animated counters
const counters = document.querySelectorAll('[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.count, 10);
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(progress * target) + '+';
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });
counters.forEach(el => counterObserver.observe(el));

// Carrousel d'avis : défilement continu seulement s'il y a assez de cartes
const reviewRail = document.getElementById('reviewRail');
if (reviewRail) {
  const cards = Array.from(reviewRail.children);
  if (cards.length >= 4) {
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      reviewRail.appendChild(clone);
    });
    reviewRail.style.animationDuration = (cards.length * 9) + 's';
    reviewRail.classList.add('is-marquee');
  } else {
    reviewRail.classList.add('is-centered');
  }
}

// Testimonial slider
const track = document.getElementById('testimonialTrack');
const dotsWrap = document.getElementById('testimonialDots');
if (track && dotsWrap) {
  const slides = Array.from(track.children);
  let current = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Témoignage ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo((current + 1) % slides.length), 6000);
  }

  goTo(0);
}

// Un lien tel: ou mailto: ouvre une fenetre systeme ("Ouvrir Selectionner une
// application ?") des qu'aucun logiciel n'est associe au protocole.
// Plutot que d'intercepter le clic, on retire le href au chargement : sans href,
// le navigateur ne peut plus proposer d'ouvrir une application. Le clic copie
// la valeur a la place.
// Exception : un vrai telephone (tactile ET sans souris), ou l'appel doit marcher.
(function () {
  // Deux tests independants : il suffit qu'un seul reconnaisse un mobile pour
  // que le lien tel: reste intact et que l'appel se declenche au toucher.
  function isPhoneOrTablet() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile|Tablet|Silk/i.test(ua)) return true;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }
  if (isPhoneOrTablet()) return;

  var toast;
  function showToast(message) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'copy-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(function () { toast.classList.add('is-on'); });
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('is-on'); }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {});
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function disarm(link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var isTel = href.indexOf('tel:') === 0;
    link.removeAttribute('href');
    link.setAttribute('data-copy', href.replace(/^(tel:|mailto:)/, '').trim());
    link.setAttribute('data-copy-tel', isTel ? '1' : '0');
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.setAttribute('title', isTel ? 'Cliquer pour copier le numero' : 'Cliquer pour copier l\'adresse');
  }

  function disarmAll() {
    var links = document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]');
    Array.prototype.forEach.call(links, disarm);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disarmAll);
  } else {
    disarmAll();
  }

  function activate(el) {
    var value = el.getAttribute('data-copy');
    var isTel = el.getAttribute('data-copy-tel') === '1';
    copyText(value).then(function () {
      showToast((isTel ? 'Numero copie : ' : 'Adresse copiee : ') + value);
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var el = e.target.closest('[data-copy]');
    if (!el) return;
    e.preventDefault();
    activate(el);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target || !e.target.matches || !e.target.matches('[data-copy]')) return;
    e.preventDefault();
    activate(e.target);
  });
})();

// ===== Boutique : choix couleur / taille / quantite =====
// Fonctionne sur n'importe quelle fiche produit, y compris celles sans taille
// (bonnet, cache-cou) ou sans choix de couleur.
(function () {
  var form = document.getElementById('productForm');
  var stage = document.getElementById('teeStage');
  if (!form || !stage) return;

  var logo = document.getElementById('teeLogo');
  var orderBtn = document.getElementById('orderBtn');
  var qtyValue = document.getElementById('qtyValue');
  var pdPrice = document.getElementById('pdPrice');
  var colorName = document.getElementById('pdColorName');
  var sizeName = document.getElementById('pdSizeName');

  var unitPrice = parseFloat(form.getAttribute('data-prix')) || 0;
  var produit = form.getAttribute('data-produit') || 'Article';

  var swatches = Array.prototype.slice.call(form.querySelectorAll('.pd-swatch'));
  var sizes = Array.prototype.slice.call(form.querySelectorAll('.pd-size'));

  var first = swatches[0];
  var firstSize = form.querySelector('.pd-size.is-on');
  var state = {
    color: first ? first.getAttribute('data-color') : '',
    colorName: first ? first.getAttribute('data-name') : '',
    size: firstSize ? firstSize.getAttribute('data-size') : '',
    qty: 1
  };

  function refresh() {
    if (state.color) {
      stage.setAttribute('data-color', state.color);
      // un logo sombre serait illisible sur un article noir
      logo.setAttribute('src', state.color === 'noir' ? 'assets/logo-blanc.png' : 'assets/logo.png');
    }
    if (colorName) colorName.textContent = state.colorName;
    if (sizeName) sizeName.textContent = state.size;
    qtyValue.textContent = state.qty;
    if (pdPrice && unitPrice) pdPrice.textContent = (unitPrice * state.qty).toString();

    var params = 'produit=' + encodeURIComponent(produit) + '&qte=' + state.qty;
    if (state.colorName) params += '&couleur=' + encodeURIComponent(state.colorName);
    if (state.size) params += '&taille=' + encodeURIComponent(state.size);
    orderBtn.setAttribute('href', 'contact.html?' + params);
  }

  function selectIn(group, chosen) {
    group.forEach(function (b) {
      var on = b === chosen;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  swatches.forEach(function (b) {
    b.addEventListener('click', function () {
      state.color = b.getAttribute('data-color');
      state.colorName = b.getAttribute('data-name');
      selectIn(swatches, b);
      refresh();
    });
  });

  sizes.forEach(function (b) {
    b.addEventListener('click', function () {
      state.size = b.getAttribute('data-size');
      selectIn(sizes, b);
      refresh();
    });
  });

  document.getElementById('qtyMinus').addEventListener('click', function () {
    if (state.qty > 1) { state.qty--; refresh(); }
  });
  document.getElementById('qtyPlus').addEventListener('click', function () {
    if (state.qty < 20) { state.qty++; refresh(); }
  });

  refresh();
})();

// ===== Contact : pre-remplit le message quand on arrive depuis la boutique =====
(function () {
  var params = new URLSearchParams(location.search);
  var produit = params.get('produit');
  if (!produit) return;
  var message = document.querySelector('.contact-form textarea[name="message"]');
  if (!message || message.value.trim()) return;

  var lignes = ['Bonjour,', '', 'Je souhaite commander :', '- ' + produit];
  if (params.get('couleur')) lignes.push('- Couleur : ' + params.get('couleur'));
  if (params.get('taille')) lignes.push('- Taille : ' + params.get('taille'));
  if (params.get('qte')) lignes.push('- Quantité : ' + params.get('qte'));
  lignes.push('', 'Merci de me confirmer la disponibilité et les modalités.');
  message.value = lignes.join('\n');
})();


// ===== Tarifs lus depuis data/forfaits.json =====
// Le HTML garde les prix en dur : ils servent de repli si le fichier est
// absent ou si le script ne s'execute pas. Le fichier, lui, fait foi.
(function () {
  var blocs = document.querySelectorAll('.price-block[data-tarif]');
  var cartes = document.querySelectorAll('.package-card[href]');
  if (!blocs.length && !cartes.length) return;

  var base = location.pathname.replace(/\/$/, '/index.html');
  var page = base.slice(base.lastIndexOf('/') + 1) || 'index.html';

  function eur(n) {
    return n.toLocaleString('fr-FR').replace(/ |,/g, ' ') + ' €';
  }

  fetch('data/forfaits.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.forfaits) return;
      var par = {};
      d.forfaits.forEach(function (f) { par[f.page] = f; });

      // page de detail : les deux formules
      var moi = par[page];
      if (moi) {
        blocs.forEach(function (b) {
          var fort = b.querySelector('strong'), sub = b.querySelector('.price-sub');
          if (b.getAttribute('data-tarif') === 'duo') {
            if (!moi.prixDuo) return;
            fort.textContent = eur(moi.prixDuo * 2);
            if (sub) sub.textContent = 'soit ' + eur(moi.prixDuo) + ' par personne';
          } else if (moi.prixSolo) {
            fort.textContent = eur(moi.prixSolo);
          }
        });
      }

      // cartes de liste : prix « a partir de », par personne
      cartes.forEach(function (c) {
        var href = c.getAttribute('href');
        var f = par[href.slice(href.lastIndexOf('/') + 1)];
        if (!f) return;
        var v = c.querySelector('.price-value');
        if (!v || !v.firstChild) return;
        var mini = f.prixDuo || f.prixSolo;
        if (mini) v.firstChild.textContent = mini.toLocaleString('fr-FR').replace(/ |,/g, ' ') + ' ';
      });
    })
    .catch(function () { /* repli : les prix du HTML restent affiches */ });
})();
