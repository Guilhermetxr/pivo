import { createHero, createBox } from './scenes.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
document.getElementById('year').textContent = new Date().getFullYear();
document.body.classList.add('is-loading');

/* ---------- scroll suave ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { offset: 0 }) : target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
});

/* ---------- 3D ---------- */
let hero = null, box = null;
try {
  hero = createHero(document.getElementById('hero-canvas'), { reduced });
  box = createBox(document.getElementById('box-canvas'), { reduced });
} catch (err) {
  console.warn('WebGL indisponível', err);
  document.documentElement.classList.add('no-webgl');
}

/* ---------- loader + intro ---------- */
const intro = gsap.timeline({ paused: true });
intro
  .to('.loader__mark span', { y: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' })
  .to('.loader__bar i', { scaleX: 1, duration: 1.1, ease: 'power2.inOut' }, 0.2)
  .to('.loader__mark span', { y: '-110%', duration: 0.7, stagger: 0.05, ease: 'expo.in' }, '+=0.15')
  .to('.loader', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.25')
  .from('.hero__word span', { yPercent: 110, opacity: 0, duration: 1.3, stagger: 0.09, ease: 'expo.out' }, '-=0.45')
  .to(hero?.state ?? {}, { intro: 1, duration: 2, ease: 'power3.out' }, '<0.1')
  .from('.hero__meta > *, .nav', { y: 24, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out' }, '<0.4')
  .add(() => {
    document.querySelector('.loader')?.remove();
    document.body.classList.remove('is-loading');
    lenis?.start();
  }, '-=1.2');

Promise.race([
  Promise.all([document.fonts.ready, new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)))]),
  new Promise((r) => setTimeout(r, 3500)),
]).then(() => (reduced || new URLSearchParams(location.search).has('skip') ? intro.progress(1) : intro.play()));

/* ---------- hero ao rolar ---------- */
ScrollTrigger.create({
  trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (self) => hero?.setScroll(self.progress),
});
gsap.to('.hero__word', {
  yPercent: -30, scale: 0.9, opacity: 0.35, ease: 'none',
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
});

/* ---------- nav ---------- */
const nav = document.querySelector('.nav');
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => {
    const y = self.scroll();
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.8);
    lastY = y;
  },
});

/* ---------- manifesto: palavra por palavra ---------- */
const split = document.querySelector('[data-split]');
split.innerHTML = split.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
if (!reduced) {
  gsap.to(split.querySelectorAll('.w'), {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: split, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
}
gsap.fromTo('.manifesto__img img', { yPercent: -10 }, {
  yPercent: 0, ease: 'none',
  scrollTrigger: { trigger: '.manifesto__img', start: 'top bottom', end: 'bottom top', scrub: true },
});
gsap.from('.manifesto__img', {
  clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out',
  scrollTrigger: { trigger: '.manifesto__img', start: 'top 85%' },
});

/* ---------- coleção horizontal ---------- */
const mm = gsap.matchMedia();
mm.add('(min-width: 801px)', () => {
  const track = document.querySelector('.colecao__track');
  const dist = () => track.scrollWidth - innerWidth;
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.colecao', start: 'top top', end: () => '+=' + dist(),
      pin: '.colecao__pin', scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
    },
  });
  // leve rotação dos cards enquanto passam
  gsap.utils.toArray('.card__img').forEach((el) => {
    gsap.fromTo(el, { rotate: 2.5, y: 30 }, {
      rotate: -2.5, y: -30, ease: 'none',
      scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
    });
  });
});

/* ---------- caixa 3D ---------- */
ScrollTrigger.create({
  trigger: '.caixa', start: 'top top', end: 'bottom bottom', scrub: true,
  onUpdate: (self) => {
    const p = self.progress;
    box?.setProgress(p);
    gsap.set('.caixa__progress i', { scaleX: p });
    gsap.set('.caixa__copy--a', { opacity: 1 - Math.min(1, Math.max(0, (p - 0.22) / 0.12)), y: -p * 60 });
    const b = Math.min(1, Math.max(0, (p - 0.62) / 0.15));
    gsap.set('.caixa__copy--b', { opacity: b, y: (1 - b) * 40 });
  },
});

/* ---------- loja ---------- */
gsap.fromTo('.loja__media img', { yPercent: -8 }, {
  yPercent: 8, ease: 'none',
  scrollTrigger: { trigger: '.loja', start: 'top bottom', end: 'bottom top', scrub: true },
});
gsap.fromTo('.loja__float', { y: 120, rotate: 4 }, {
  y: -60, rotate: -8, ease: 'none',
  scrollTrigger: { trigger: '.loja', start: 'top bottom', end: 'bottom top', scrub: true },
});
gsap.from('.loja__info > *', {
  y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out',
  scrollTrigger: { trigger: '.loja__info', start: 'top 70%' },
});

/* ---------- reveals genéricos ---------- */
gsap.utils.toArray('.h2, .colecao__head .eyebrow, .insta__head .eyebrow, .manifesto > .eyebrow').forEach((el) => {
  if (el.closest('.loja__info, .caixa')) return;
  gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
});
gsap.from('.tile', {
  y: 80, opacity: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out',
  scrollTrigger: { trigger: '.insta__grid', start: 'top 85%' },
});
gsap.from('.cta__line > *', {
  yPercent: 100, duration: 1.2, stagger: 0.12, ease: 'expo.out',
  scrollTrigger: { trigger: '.cta', start: 'top 75%' },
});
gsap.from('.footer__mark', {
  yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out',
  scrollTrigger: { trigger: '.footer', start: 'top 90%' },
});

/* ---------- cursor + magnético ---------- */
if (finePointer) {
  const cursor = document.querySelector('.cursor');
  const label = cursor.querySelector('.cursor__label');
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => { cursor.classList.add('is-on'); xTo(e.clientX); yTo(e.clientY); });
  document.addEventListener('pointerover', (e) => {
    const big = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button');
    cursor.classList.toggle('is-big', !!big);
    cursor.classList.toggle('is-link', !big && !!link);
    if (big) label.textContent = big.dataset.cursor;
  });

  document.querySelectorAll('[data-magnetic], .btn').forEach((el) => {
    const strength = el.matches('[data-magnetic]') ? 0.12 : 0.3;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: 0.5, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });

  // tilt 3D nos cards do feed
  document.querySelectorAll('.tile').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: px * 12, rotateX: -py * 12, transformPerspective: 700, duration: 0.5, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power3.out' }));
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
