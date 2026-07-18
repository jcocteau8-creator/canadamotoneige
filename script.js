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
