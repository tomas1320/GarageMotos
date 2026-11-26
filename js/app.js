// ============================================================
//  GARAGE MOTOS — App principal
// ============================================================
import { BUSINESS, MOTOS, CATEGORIES, PLANS, FEATURED, ACCESSORIES, PRICE_SHEET_CSV, parseCSV, num, cuota, fmt, findMoto } from './data.js';
import { createEngine } from './sound.js';
import { createSpinner } from './spin.js';

// ------------------------------------------------------------
//  Precios desde Google Sheets (si está configurado en data.js)
// ------------------------------------------------------------
async function loadSheetPrices() {
  if (!PRICE_SHEET_CSV) return;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(PRICE_SHEET_CSV, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(to);
    parseCSV(await res.text()).forEach((row) => {
      const m = findMoto(row.id);
      if (!m) return;
      const price = num(row.precio);
      if (price > 0) m.price = price;
      if (row.stock !== undefined && row.stock !== '') m.sold = Number(row.stock) === 0;
    });
  } catch (err) {
    console.warn('No se pudieron leer los precios de la planilla; se usan los de data.js', err);
  }
}
await loadSheetPrices();
const accPrice = (ids) => ids.reduce((s, id) => s + (ACCESSORIES.find((a) => a.id === id)?.price || 0), 0);
function accHTML(selected, name) {
  return ACCESSORIES.map((a) => `<label class="acc__item"><input type="checkbox" name="${name}" value="${a.id}" ${selected.includes(a.id) ? 'checked' : ''}/><span><b>${a.name}</b><small>+${fmt(a.price)}${a.show3d ? ' · 3D' : ''}</small></span></label>`).join('');
}

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const hasGSAP = typeof window.gsap !== 'undefined';
const finePointer = window.matchMedia('(pointer: fine)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;
const plan12 = PLANS.find((p) => p.n === 12);
const waLink = (text) => `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;

if (!hasGSAP) document.documentElement.classList.add('no-gsap');
$('#year').textContent = new Date().getFullYear();

// ------------------------------------------------------------
//  Toast
// ------------------------------------------------------------
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('is-show'), 3200);
}

// ------------------------------------------------------------
//  Scroll suave (Lenis) + GSAP
// ------------------------------------------------------------
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  if (hasGSAP) {
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}
if (hasGSAP) gsap.registerPlugin(window.ScrollTrigger);

function scrollToEl(target, immediate = false) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  const navH = el.id === 'inicio' ? 0 : $('#nav').offsetHeight - 1;
  if (lenis) lenis.scrollTo(el, { offset: -navH, duration: immediate ? 0 : 1.4, immediate });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - navH, behavior: immediate ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  e.preventDefault();
  closeMenu();
  scrollToEl(id);
});

function lockScroll(on) {
  document.body.classList.toggle('no-scroll', on);
  if (lenis) on ? lenis.stop() : lenis.start();
}

// ------------------------------------------------------------
//  Loader
// ------------------------------------------------------------
let loadP = 0;
const loaderBar = $('#loaderBar');
const loaderTick = setInterval(() => {
  loadP = Math.min(90, loadP + Math.random() * 18);
  loaderBar.style.width = loadP + '%';
}, 160);
function finishLoader() {
  clearInterval(loaderTick);
  loaderBar.style.width = '100%';
  setTimeout(() => {
    $('#loader').classList.add('is-done');
    document.body.classList.remove('is-loading');
    onScroll();
    if (hasGSAP) window.ScrollTrigger.refresh();
  }, 350);
}

// ------------------------------------------------------------
//  INTRO 3D
// ------------------------------------------------------------
function splitWord(el, text) {
  el.innerHTML = [...text].map((ch) => `<span>${ch}</span>`).join('');
  return $$('span', el);
}
const lettersG = splitWord($('#wGarage'), 'GARAGE');
const lettersM = splitWord($('#wMotos'), 'MOTOS');
const claim = $('#introClaim');
const tachoFill = $('#tachoFill');
const tachoNeedle = $('#tachoNeedle');
const rpmEl = $('#rpm');
const steps = $$('.intro__steps span');
const hint = $('#introHint');
const flash = $('#introFlash');
const nav = $('#nav');
let inIntro = true;
const ride = { el: $('#rideBike'), beam: $('#introBeam'), lines: $('#introLines'), revved: false };
let engine = null;
let lastP = 0, throttle = 0;
const soundBtn = $('#soundBtn');
soundBtn.addEventListener('click', async () => {
  if (!engine) engine = createEngine();
  if (!engine) { toast('Tu navegador no soporta audio'); return; }
  if (engine.on) engine.disable(); else await engine.enable();
  soundBtn.setAttribute('aria-pressed', String(engine.on));
  soundBtn.classList.toggle('is-on', engine.on);
  $('span', soundBtn).textContent = engine.on ? 'Sonido activado' : 'Activar sonido';
});

function onIntroProgress(p) {
  // Letras GARAGE (0.28-0.5) y MOTOS (0.42-0.64)
  lettersG.forEach((s, i) => {
    const k = seg(p, 0.26 + i * 0.03, 0.36 + i * 0.03);
    const out = seg(p, 0.79, 0.86);
    s.style.transform = `translateY(${(1 - k) * 110 - out * 110}%)`;
  });
  lettersM.forEach((s, i) => {
    const k = seg(p, 0.42 + i * 0.03, 0.52 + i * 0.03);
    const out = seg(p, 0.8, 0.87);
    s.style.transform = `translateY(${(1 - k) * 110 + out * 110}%)`;
  });
  const c = seg(p, 0.62, 0.72) * (1 - seg(p, 0.79, 0.85));
  claim.style.opacity = c;
  claim.style.transform = `translateY(${(1 - c) * 20}px)`;
  // Tacómetro
  const r = Math.pow(seg(p, 0.05, 0.92), 1.2);
  const rpm = Math.round(r * 12000 / 50) * 50;
  rpmEl.textContent = rpm.toLocaleString('es-AR');
  tachoFill.style.strokeDashoffset = 252 * (1 - r);
  tachoNeedle.style.transform = `rotate(${-90 + r * 180}deg)`;
  // Pasos
  const st = p < 0.2 ? 0 : p < 0.45 ? 1 : p < 0.82 ? 2 : 3;
  steps.forEach((s, i) => s.classList.toggle('on', i === st));
  hint.style.opacity = 1 - seg(p, 0.02, 0.1);
  flash.style.opacity = seg(p, 0.975, 1);
  // Faro + moto que cruza la pantalla
  const beam = seg(p, 0.83, 0.9) * (1 - seg(p, 0.96, 0.995));
  ride.beam.style.opacity = beam;
  ride.beam.style.transform = `translate(-50%, -50%) scale(${0.3 + beam * 0.9})`;
  const rp = seg(p, 0.875, 0.98);
  const e = rp < 0.5 ? 2 * rp * rp : 1 - Math.pow(-2 * rp + 2, 2) / 2;
  ride.el.style.transform = `translate(${-90 + e * 240}vw, -50%) skewX(${-8 * Math.sin(rp * Math.PI)}deg)`;
  ride.el.style.opacity = rp > 0 && rp < 1 ? 1 : 0;
  ride.el.style.filter = `blur(${Math.sin(rp * Math.PI) * 2.5}px) drop-shadow(0 30px 30px rgba(0,0,0,.7))`;
  ride.lines.style.opacity = Math.sin(rp * Math.PI);
  if (rp > 0.05 && !ride.revved) { ride.revved = true; engine && engine.rev(); }
  if (rp === 0) ride.revved = false;
  // Motor
  throttle += (clamp(Math.abs(p - lastP) * 90) - throttle) * 0.15;
  lastP = p;
  if (engine && engine.on) engine.set(900 + r * 11100, throttle, 1 - seg(p, 0.97, 1));
  const was = inIntro;
  inIntro = p < 0.985;
  if (was !== inIntro) nav.classList.toggle('in-intro', inIntro);
}
nav.classList.add('in-intro');

async function startIntro() {
  try {
    const { initIntro } = await import('./intro.js');
    initIntro({ canvas: $('#introCanvas'), section: $('#intro'), onProgress: onIntroProgress });
  } catch (err) {
    console.warn('Intro 3D no disponible', err);
    // Fallback: igual mostramos el texto con scroll
    const sec = $('#intro');
    const upd = () => {
      const r = sec.getBoundingClientRect();
      onIntroProgress(clamp(-r.top / (r.height - innerHeight)));
    };
    addEventListener('scroll', upd, { passive: true });
    upd();
  }
  finishLoader();
}
startIntro();
$('#skipIntro').addEventListener('click', () => scrollToEl('#inicio'));

// ------------------------------------------------------------
//  NAV
// ------------------------------------------------------------
let lastY = 0;
const prog = $('#scrollProgress');
function onScroll() {
  const y = scrollY;
  const introEnd = $('#intro').offsetHeight - innerHeight;
  nav.classList.toggle('is-solid', y > introEnd + 20);
  nav.classList.toggle('is-hidden', y > lastY && y > introEnd + 400 && !$('#mmenu').classList.contains('is-open'));
  lastY = y;
  const max = document.documentElement.scrollHeight - innerHeight;
  prog.style.transform = `scaleX(${clamp(y / max)})`;
  $('.wa-float').classList.toggle('is-hidden', y < introEnd - 50);
  if (engine && engine.on && y > introEnd + 50) engine.set(900, 0, 0);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const burger = $('#burger');
const mmenu = $('#mmenu');
function closeMenu() {
  mmenu.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  if (!$('#modal').hidden || !$('#drawer').hidden) return;
  lockScroll(false);
}
burger.addEventListener('click', () => {
  const open = !mmenu.classList.contains('is-open');
  mmenu.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  lockScroll(open);
});

// Link activo
const sections = ['inicio', 'catalogo', 'reservar', 'financiacion', 'servicios', 'sucursales'];
const navLinks = $$('.nav__links a');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
sections.forEach((id) => $('#' + id) && io.observe($('#' + id)));

// ------------------------------------------------------------
//  HERO
// ------------------------------------------------------------
$$('.hero__title .split').forEach((s) => (s.innerHTML = `<span>${s.innerHTML}</span>`));
$('#heroFrom').textContent = fmt(Math.min(...MOTOS.map((m) => m.price)));
$('#heroCount').textContent = MOTOS.length;

if (hasGSAP) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top 75%' } });
  tl.from('.hero__title .split > span', { yPercent: 115, duration: 1.1, stagger: 0.1, ease: 'power4.out' })
    .from('.hero__bike', { x: 260, opacity: 0, duration: 1.4, ease: 'power3.out' }, 0.1)
    .from('.hero__ghost', { opacity: 0, letterSpacing: '0.3em', duration: 1.4, ease: 'power3.out' }, 0.1)
    .from('.hero__chip', { y: 30, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'back.out(1.6)' }, 0.6)
    .from('.hero__slash', { scaleY: 0, transformOrigin: 'top', duration: 1.2, stagger: 0.1, ease: 'power3.inOut' }, 0);
  gsap.to('.hero__bike', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__ghost', { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.hero__chip', { y: (i) => [-12, 10, -8][i], duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.3 });
}
if (finePointer) {
  const hv = $('#heroVisual');
  const bike = $('#heroBike');
  hv.addEventListener('pointermove', (e) => {
    const r = hv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    bike.style.translate = `${x * 24}px ${y * 14}px`;
    bike.style.rotate = `${x * 3}deg`;
  });
  hv.addEventListener('pointerleave', () => { bike.style.translate = '0 0'; bike.style.rotate = '0deg'; });
  bike.style.transition = 'translate .6s cubic-bezier(.22,1,.36,1), rotate .6s cubic-bezier(.22,1,.36,1)';
}
// El hero rota entre motos destacadas
const heroCycle = ['dominar250-blanca', 'ktm-duke250', 'skua250-adv', 'cfmoto-250nk', 'tx250gs', 'corven-triax150'];
let heroI = 0;
setInterval(() => {
  if (document.hidden) return;
  const img = $('#heroBike');
  const r = img.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  heroI = (heroI + 1) % heroCycle.length;
  const next = `img/motos/${heroCycle[heroI]}.webp`;
  const pre = new Image();
  pre.src = next;
  pre.onload = () => {
    if (hasGSAP) {
      gsap.to(img, { x: -120, opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: () => {
        img.src = next;
        gsap.fromTo(img, { x: 160, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out' });
      } });
    } else img.src = next;
  };
}, 4800);

// ------------------------------------------------------------
//  MARQUEE
// ------------------------------------------------------------
const brands = [...new Set(MOTOS.map((m) => m.brand))];
const mq = $('#marquee');
const items = [...brands, ...brands].map((b) => `<span>${b}</span>`).join('');
mq.innerHTML = items + items;

// ------------------------------------------------------------
//  DESTACADAS (scroll horizontal)
// ------------------------------------------------------------
const featTrack = $('#featuredTrack');
featTrack.innerHTML = FEATURED.map((id, i) => {
  const m = findMoto(id);
  const c = m.colors[0];
  const chips = Object.values(m.specs).slice(0, 3).map((v) => `<span>${v}</span>`).join('');
  return `
  <article class="feat" data-id="${m.id}" data-big="${m.cc}CC" tabindex="0" aria-label="${m.brand} ${m.model}">
    <div class="feat__info">
      <span class="feat__num">0${i + 1} / 0${FEATURED.length}</span>
      <span class="feat__brand">${m.brand}</span>
      <h3 class="feat__name">${m.model}</h3>
      <div class="feat__chips">${chips}</div>
      <div class="feat__price"><small>Precio contado</small><b>${fmt(m.price)}</b></div>
      <div class="feat__cta">
        <button class="btn btn--red btn--sm" data-open="${m.id}" data-view="3d">Ver en 360°</button>
        <button class="btn btn--ghost btn--sm" data-reserve="${m.id}">Reservar</button>
      </div>
    </div>
    <div class="feat__glow"></div>
    <img class="feat__img" src="${c.img}" alt="${m.brand} ${m.model}" loading="lazy" />
  </article>`;
}).join('');

if (hasGSAP) {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const dist = () => featTrack.scrollWidth - innerWidth;
    const tw = gsap.to(featTrack, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.featured', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (st) => ($('#featProg').style.transform = `scaleX(${st.progress})`),
      },
    });
    $$('.feat__img').forEach((img) => {
      gsap.fromTo(img, { xPercent: 12 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: img.closest('.feat'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  });
  mm.add('(max-width: 760px)', () => {
    $$('.feat').forEach((f) => gsap.from(f, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 88%' } }));
  });
}

// ------------------------------------------------------------
//  CATÁLOGO
// ------------------------------------------------------------
const state = { cat: 'all', q: '', sort: 'feat' };
const chipsEl = $('#catChips');
chipsEl.innerHTML = CATEGORIES.map((c) => {
  const n = c.id === 'all' ? MOTOS.length : MOTOS.filter((m) => m.cat === c.id).length;
  return `<button class="chip ${c.id === 'all' ? 'is-active' : ''}" role="tab" data-cat="${c.id}" aria-selected="${c.id === 'all'}">${c.label}<small>${n}</small></button>`;
}).join('');
chipsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.cat = b.dataset.cat;
  $$('.chip', chipsEl).forEach((c) => { c.classList.toggle('is-active', c === b); c.setAttribute('aria-selected', String(c === b)); });
  renderGrid();
});
let qT;
$('#search').addEventListener('input', (e) => {
  clearTimeout(qT);
  qT = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); renderGrid(); }, 160);
});
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

const ICON_360 = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2v20"/></svg>`;
const ICON_ARROW = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M8 7h9v9"/></svg>`;

function cardHTML(m) {
  const c = m.colors[0];
  const cuota12 = cuota(m.price, 12, plan12.tna);
  const dots = m.colors.length > 1
    ? `<div class="card__colors">${m.colors.map((col, i) => `<button class="${i === 0 ? 'is-active' : ''}" style="background:${col.hex}" data-ci="${i}" aria-label="Color ${col.name}"></button>`).join('')}</div>`
    : `<div class="card__colors"><button class="is-active" style="background:${c.hex}" aria-label="Color ${c.name}" tabindex="-1"></button></div>`;
  return `
  <article class="card" data-id="${m.id}">
    <div class="card__stage" data-open="${m.id}" role="button" tabindex="0" aria-label="Ver ${m.brand} ${m.model}">
      ${m.sold ? '<span class="card__badge">Vendida · consultá</span>' : m.badge ? `<span class="card__badge ${/Mejor|Top|Más/.test(m.badge) ? 'card__badge--red' : ''}">${m.badge}</span>` : ''}
      <button class="card__360" data-open="${m.id}" data-view="3d" aria-label="Ver ${m.model} en 360 grados">${ICON_360} ${m.colors.some((c) => c.spin) ? '360° real' : '360°'}</button>
      <img src="${c.img}" alt="${m.brand} ${m.model} ${c.name}" loading="lazy" />
      <span class="card__sweep"></span>
    </div>
    <div class="card__body">
      <div class="card__top"><span class="card__brand">${m.brand}</span><span class="card__cat">${catLabel(m.cat)} · ${m.cc}cc</span></div>
      <h3 class="card__name">${m.model}</h3>
      ${dots}
      <div class="card__price">
        <div><b>${fmt(m.price)}</b><small>12 cuotas de ${fmt(cuota12)}</small></div>
        ${m.sold ? `<a class="card__go" href="${waLink(`Hola! ¿Les va a entrar la ${m.brand} ${m.model}?`)}" target="_blank" rel="noopener" aria-label="Consultar ${m.model}">${ICON_ARROW}</a>` : `<button class="card__go" data-reserve="${m.id}" aria-label="Reservar ${m.model}">${ICON_ARROW}</button>`}
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  let list = MOTOS.filter((m) => state.cat === 'all' || m.cat === state.cat);
  if (state.q) list = list.filter((m) => `${m.brand} ${m.model} ${m.cc} ${catLabel(m.cat)}`.toLowerCase().includes(state.q));
  if (state.sort === 'asc') list = [...list].sort((a, b) => a.price - b.price);
  if (state.sort === 'desc') list = [...list].sort((a, b) => b.price - a.price);
  if (state.sort === 'cc') list = [...list].sort((a, b) => b.cc - a.cc || a.price - b.price);
  const grid = $('#grid');
  grid.innerHTML = list.map(cardHTML).join('');
  $('#empty').hidden = list.length > 0;
  if (hasGSAP) gsap.from($$('.card', grid), { y: 50, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' });
  bindTilt($$('.card', grid), 5);
}
renderGrid();

// cambiar color en tarjeta
$('#grid').addEventListener('click', (e) => {
  const dot = e.target.closest('.card__colors button[data-ci]');
  if (!dot) return;
  const card = dot.closest('.card');
  const m = findMoto(card.dataset.id);
  const col = m.colors[+dot.dataset.ci];
  $$('.card__colors button', card).forEach((b) => b.classList.toggle('is-active', b === dot));
  const img = $('.card__stage img', card);
  img.style.opacity = 0;
  setTimeout(() => { img.src = col.img; img.alt = `${m.brand} ${m.model} ${col.name}`; img.onload = () => (img.style.opacity = 1); }, 200);
  card.dataset.ci = dot.dataset.ci;
});

// Delegación global: abrir modal / reservar
document.addEventListener('click', (e) => {
  const op = e.target.closest('[data-open]');
  const rs = e.target.closest('[data-reserve]');
  if (rs) {
    e.stopPropagation();
    const card = rs.closest('.card');
    selectForReserve(rs.dataset.reserve, card ? +(card.dataset.ci || 0) : 0);
    scrollToEl('#reservar');
    return;
  }
  if (op) {
    const card = op.closest('.card');
    openModal(op.dataset.open, card ? +(card.dataset.ci || 0) : 0, op.dataset.view || 'photo');
    return;
  }
  const feat = e.target.closest('.feat');
  if (feat && !e.target.closest('button')) openModal(feat.dataset.id, 0, 'photo');
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card__stage, .feat')) {
    e.preventDefault();
    const id = e.target.dataset.open || e.target.dataset.id;
    openModal(id, 0, 'photo');
  }
});

// ------------------------------------------------------------
//  Tilt 3D + botones magnéticos
// ------------------------------------------------------------
function bindTilt(els, max = 6) {
  if (!finePointer || reduceMotion) return;
  els.forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateY(-4px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}
bindTilt($$('.tilt'), 4);

if (finePointer && !reduceMotion) {
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });
}

// ------------------------------------------------------------
//  MODAL + VISOR 3D 360°
// ------------------------------------------------------------
const modal = $('#modal');
const mView = $('.modal__view');
let cur = { moto: null, ci: 0, acc: [] };
let viewer = null;
let viewerLoading = null;
let lastFocus = null;

function setModalColor(ci) {
  const m = cur.moto;
  cur.ci = ci;
  const c = m.colors[ci];
  const img = $('#mImg');
  img.src = c.img;
  img.alt = `${m.brand} ${m.model} ${c.name}`;
  img.style.animation = 'none';
  void img.offsetWidth;
  img.style.animation = '';
  $('#mColorName').textContent = c.name;
  $$('#mColors .swatch').forEach((s, i) => s.classList.toggle('is-active', i === ci));
  if (viewer && !$('#m3d').hidden) viewer.setBike(m, c);
  // pestaña "360° real" solo si este color tiene fotos
  $('#tabSpin').hidden = !c.spin;
  $('#tab3d').innerHTML = `<span class="dot-live"></span> ${c.spin ? '3D' : '3D 360°'}`;
  if (!$('#mSpin').hidden) setView(c.spin ? 'spin' : 'photo');
}

function openModal(id, ci = 0, view = 'photo') {
  const m = findMoto(id);
  if (!m) return;
  cur = { moto: m, ci, acc: [] };
  $('#mAcc').innerHTML = accHTML(cur.acc, 'macc');
  updateModalTotal();
  $('#mReserve').disabled = !!m.sold;
  $('#mReserve').textContent = m.sold ? 'Vendida — consultá' : 'Reservar con seña';
  lastFocus = document.activeElement;
  $('#mBrand').textContent = `${m.brand} · ${catLabel(m.cat)} · ${m.cc}cc`;
  $('#mTitle').textContent = m.model;
  $('#mDesc').textContent = m.desc;
  $('#mPrice').textContent = fmt(m.price);
  $('#mCuota').textContent = fmt(cuota(m.price, 12, plan12.tna));
  $('#mSpecs').innerHTML = Object.entries(m.specs).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#mColors').innerHTML = m.colors.map((c, i) => `<button class="swatch" data-ci="${i}"><i style="background:${c.hex}"></i>${c.name}</button>`).join('');
  $('#mWa').href = waLink(`Hola Garage Motos! Quiero consultar por la ${m.brand} ${m.model}.`);
  setModalColor(ci);
  modal.hidden = false;
  lockScroll(true);
  // el botón "360°" abre las fotos reales si existen; si no, el 3D
  setView(view === '3d' && m.colors[ci].spin ? 'spin' : view);
  setTimeout(() => $('.modal__close', modal).focus(), 50);
}
function closeModal() {
  modal.hidden = true;
  if (viewer) viewer.pause();
  if (mmenu.classList.contains('is-open')) return;
  lockScroll(false);
  lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
}
modal.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeModal();
  const sw = e.target.closest('#mColors .swatch');
  if (sw) setModalColor(+sw.dataset.ci);
});
function updateModalTotal() {
  if (!cur.moto) return;
  $('#mTotal').textContent = fmt(cur.moto.price + accPrice(cur.acc));
}
$('#mAcc').addEventListener('change', async (e) => {
  cur.acc = $$('#mAcc input:checked').map((i) => i.value);
  updateModalTotal();
  const acc = ACCESSORIES.find((a) => a.id === e.target.value);
  if (acc && acc.show3d && e.target.checked && $('#m3d').hidden) await setView('3d');
  viewer && viewer.setAccessories(cur.acc);
});
$('#mReserve').addEventListener('click', () => {
  const { moto, ci, acc } = cur;
  closeModal();
  selectForReserve(moto.id, ci, acc);
  setTimeout(() => scrollToEl('#reservar'), 60);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modal.hidden) closeModal();
  if (!$('#drawer').hidden) closeDrawer();
  if (mmenu.classList.contains('is-open')) closeMenu();
});

$$('.vtab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

// ---------- 360° con fotos reales ----------
const spinOf = () => cur.moto && cur.moto.colors[cur.ci].spin;
let spinner = null;
let spinLoaded = null;
function ensureSpinner() {
  if (spinner) return spinner;
  spinner = createSpinner({
    stage: $('#spinStage'), img: $('#spinImg'), range: $('#spinRange'),
    loadBar: $('#spinLoadBar'), loadTxt: $('#spinLoadTxt'),
    onFrame: (i, n) => ($('#spinDeg').textContent = Math.round((i / n) * 360) + '°'),
  });
  return spinner;
}
$('#spinAuto').addEventListener('click', (e) => {
  const s = ensureSpinner();
  s.setAuto(!s.auto);
  e.currentTarget.classList.toggle('is-on', s.auto);
  e.currentTarget.setAttribute('aria-pressed', String(s.auto));
});

async function setView(v) {
  if (v === 'spin' && !spinOf()) v = 'photo';
  $$('.vtab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === v));
  const is3d = v === '3d';
  $('#mPhoto').hidden = v !== 'photo';
  $('#mSpin').hidden = v !== 'spin';
  $('#m3d').hidden = !is3d;
  mView.classList.toggle('is-3d', is3d);
  mView.classList.toggle('is-spin', v === 'spin');
  if (v === 'spin') {
    const spin = spinOf();
    if (spinLoaded !== spin.dir) {
      spinLoaded = spin.dir;
      $('#spinImg').alt = `${cur.moto.brand} ${cur.moto.model} en 360°`;
      ensureSpinner().load(spin);
    }
  }
  if (!is3d) { viewer && viewer.pause(); return; }
  await ensureViewer();
  if (!viewer) return;
  viewer.resume();
  viewer.setBike(cur.moto, cur.moto.colors[cur.ci]);
  viewer.setAccessories(cur.acc);
  viewer.goTo('tres4');
  markCam('tres4');
}

async function ensureViewer() {
  if (viewer) return;
  if (!viewerLoading) {
    viewerLoading = import('./viewer.js').then(({ createViewer }) => {
      const hAz = $('#hAz'), hEl = $('#hEl'), hMode = $('#hMode');
      viewer = createViewer($('#sat'), (az, el) => {
        hAz.textContent = String(Math.round(az)).padStart(3, '0') + '°';
        hEl.textContent = String(Math.round(el)).padStart(2, '0') + '°';
        hMode.textContent = el > 55 ? 'SATÉLITE' : viewer && viewer.auto ? 'ÓRBITA 360°' : 'MANUAL';
      });
      $('#satLoading').remove();
    }).catch((err) => {
      console.warn(err);
      $('#satLoading').textContent = 'No se pudo cargar la vista 3D. Revisá tu conexión.';
    });
  }
  await viewerLoading;
}
function markCam(name) {
  $$('.sat__ctrls [data-cam]').forEach((b) => b.classList.toggle('is-current', b.dataset.cam === name));
}
$$('.sat__ctrls [data-cam]').forEach((b) =>
  b.addEventListener('click', () => {
    if (!viewer) return;
    viewer.goTo(b.dataset.cam);
    markCam(b.dataset.cam);
  })
);
$('#autoRot').addEventListener('click', (e) => {
  if (!viewer) return;
  const on = !viewer.auto;
  viewer.setAuto(on);
  e.currentTarget.classList.toggle('is-on', on);
  e.currentTarget.setAttribute('aria-pressed', String(on));
});

// ------------------------------------------------------------
//  RESERVAS
// ------------------------------------------------------------
const STORE = 'gm_reservas_v1';
const loadRes = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const saveRes = (l) => localStorage.setItem(STORE, JSON.stringify(l));
const R = { moto: findMoto('motomel-skua-150'), ci: 0, branch: 0, pct: BUSINESS.reserve.minPct, step: 0, extras: [] };
const rTotal = () => R.moto.price + accPrice(R.extras);

const fMoto = $('#fMoto');
fMoto.innerHTML = CATEGORIES.filter((c) => c.id !== 'all').map((c) =>
  `<optgroup label="${c.label}">${MOTOS.filter((m) => m.cat === c.id).map((m) => `<option value="${m.id}">${m.brand} ${m.model} — ${fmt(m.price)}</option>`).join('')}</optgroup>`
).join('');
$('#fBranch').innerHTML = BUSINESS.branches.map((b, i) =>
  `<label><input type="radio" name="branch" value="${i}" ${i === 0 ? 'checked' : ''}/><span><b>${b.address}</b><small>${b.name} · ${b.city}</small></span></label>`
).join('');

function renderColorsR() {
  $('#fColors').innerHTML = R.moto.colors.map((c, i) => `<button type="button" class="swatch ${i === R.ci ? 'is-active' : ''}" data-ci="${i}"><i style="background:${c.hex}"></i>${c.name}</button>`).join('');
}
function updatePreview() {
  const m = R.moto, c = m.colors[R.ci];
  const img = $('#resImg');
  if (!img.src.endsWith(c.img)) {
    img.style.opacity = 0;
    img.style.transform = 'translateX(30px)';
    setTimeout(() => { img.src = c.img; img.alt = `${m.brand} ${m.model}`; }, 180);
    img.onload = () => { img.style.opacity = 1; img.style.transform = 'none'; };
  }
  $('#resBrand').textContent = m.brand;
  $('#resModel').textContent = m.model + ' · ' + c.name;
  $('#resPrice').textContent = fmt(rTotal()) + (R.extras.length ? ` · ${R.extras.length} accesorio${R.extras.length > 1 ? 's' : ''}` : '');
  $('#fAcc').innerHTML = accHTML(R.extras, 'racc');
  updateSena();
}
function updateSena() {
  const price = rTotal();
  const sena = Math.round((price * R.pct) / 100 / 1000) * 1000;
  $('#senaPct').textContent = R.pct + '%';
  animateNumber($('#senaAmount'), sena);
  $('#sumPrice').textContent = fmt(price);
  $('#sumSena').textContent = fmt(sena);
  $('#sumRest').textContent = fmt(price - sena);
  const range = $('#fPct');
  range.style.setProperty('--fill', ((R.pct - range.min) / (range.max - range.min)) * 100 + '%');
  return sena;
}
function selectForReserve(id, ci = 0, extras = []) {
  const m = findMoto(id);
  if (m && m.sold) { toast(`La ${m.model} está vendida. Consultanos por WhatsApp.`); return; }
  R.moto = m || R.moto;
  R.extras = [...extras];
  R.ci = Math.min(ci, R.moto.colors.length - 1);
  fMoto.value = R.moto.id;
  renderColorsR();
  updatePreview();
  if (R.step === 3) goStep(0);
  toast(`${R.moto.brand} ${R.moto.model} seleccionada para reservar`);
}
fMoto.addEventListener('change', () => { R.moto = findMoto(fMoto.value); R.ci = 0; renderColorsR(); updatePreview(); });
$('#fColors').addEventListener('click', (e) => {
  const s = e.target.closest('.swatch');
  if (!s) return;
  R.ci = +s.dataset.ci;
  renderColorsR();
  updatePreview();
});
$('#fBranch').addEventListener('change', (e) => (R.branch = +e.target.value));
$('#fAcc').addEventListener('change', () => { R.extras = $$('#fAcc input:checked').map((i) => i.value); $('#resPrice').textContent = fmt(rTotal()); updateSena(); });
$('#fPct').addEventListener('input', (e) => { R.pct = +e.target.value; updateSena(); });
fMoto.value = R.moto.id;
renderColorsR();
updatePreview();

function animateNumber(el, to) {
  const from = +(el.dataset.v || 0);
  el.dataset.v = to;
  if (!hasGSAP) { el.textContent = fmt(to); return; }
  const o = { v: from };
  gsap.to(o, { v: to, duration: 0.6, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v)) });
}

const panels = $$('.wizard__panel');
const stepLis = $$('#wSteps li');
function goStep(n) {
  R.step = n;
  panels.forEach((p, i) => p.classList.toggle('is-active', i === n));
  stepLis.forEach((li, i) => { li.classList.toggle('is-active', i === n); li.classList.toggle('is-done', i < n); });
  const top = $('#wizard').getBoundingClientRect().top;
  if (top < 0) scrollToEl('#wizard');
}
function invalid(el, msg) {
  el.classList.add('is-invalid');
  el.focus();
  toast(msg);
  setTimeout(() => el.classList.remove('is-invalid'), 1200);
  return false;
}
function validate(step) {
  if (step === 1) {
    const name = $('#fName'), dni = $('#fDni'), ph = $('#fPhone'), em = $('#fEmail');
    if (name.value.trim().length < 3) return invalid(name, 'Ingresá tu nombre y apellido');
    if (!/^\d{7,9}$/.test(dni.value.replace(/\D/g, ''))) return invalid(dni, 'Ingresá un DNI válido (solo números)');
    if (ph.value.replace(/\D/g, '').length < 8) return invalid(ph, 'Ingresá un celular válido');
    if (em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) return invalid(em, 'Revisá el email');
  }
  return true;
}
$('#wizard').addEventListener('click', (e) => {
  if (e.target.closest('[data-next]')) { if (validate(R.step)) goStep(R.step + 1); }
  if (e.target.closest('[data-prev]')) goStep(R.step - 1);
});
$('#fDni').addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '')));

$('#wizard').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('#fTerms').checked) { toast('Aceptá las condiciones de la reserva'); $('#fTerms').focus(); return; }
  const m = R.moto, c = m.colors[R.ci], b = BUSINESS.branches[R.branch];
  const total = rTotal();
  const sena = Math.round((total * R.pct) / 100 / 1000) * 1000;
  const extras = R.extras.map((id) => ACCESSORIES.find((a) => a.id === id).name);
  const res = {
    code: 'GM-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    motoId: m.id, moto: `${m.brand} ${m.model}`, color: c.name, img: c.img,
    price: total, extras, pct: R.pct, sena, rest: total - sena,
    pay: $('input[name="pay"]:checked').value,
    branch: `${b.name} — ${b.address}, ${b.city}`,
    name: $('#fName').value.trim(), dni: $('#fDni').value.trim(), phone: $('#fPhone').value.trim(), email: $('#fEmail').value.trim(),
    notes: $('#fNotes').value.trim(),
    created: Date.now(), expires: Date.now() + BUSINESS.reserve.holdHours * 3600e3,
  };
  const list = loadRes();
  list.unshift(res);
  saveRes(list);
  renderTicket(res);
  goStep(3);
  updateBadge();
  burst();
  toast('¡Reserva generada! Envianos el comprobante por WhatsApp');
});

function resMessage(r) {
  return [
    `Hola Garage Motos! Quiero confirmar mi reserva *${r.code}*`,
    ``,
    `🏍️ Moto: ${r.moto} (${r.color})`,
    r.extras && r.extras.length ? `🧰 Accesorios: ${r.extras.join(', ')}` : '',
    `💲 Total contado: ${fmt(r.price)}`,
    `✅ Seña (${r.pct}%): ${fmt(r.sena)}`,
    `💳 Medio de pago: ${r.pay}`,
    `📍 Retiro: ${r.branch}`,
    ``,
    `Nombre: ${r.name}`,
    `DNI: ${r.dni}`,
    `Celular: ${r.phone}`,
    r.email ? `Email: ${r.email}` : '',
    r.notes ? `Comentarios: ${r.notes}` : '',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}

let ticketTimer;
function remaining(r) {
  const ms = r.expires - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600e3), mnt = Math.floor((ms % 3600e3) / 60e3), s = Math.floor((ms % 60e3) / 1e3);
  return `${String(h).padStart(2, '0')}:${String(mnt).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function renderTicket(r) {
  $('#ticket').innerHTML = `
    <div class="ticket__main">
      <div class="ticket__head"><img src="img/logo.png" alt="" /><div><b>GARAGE MOTOS</b><small>Comprobante de reserva</small></div></div>
      <span class="ticket__ok">● Reserva generada · pendiente de seña</span>
      <div class="ticket__model">${r.moto}</div>
      <div class="ticket__rows">
        <div><small>Color</small>${r.color}${r.extras && r.extras.length ? ' + ' + r.extras.length + ' acc.' : ''}</div>
        <div><small>Precio contado</small>${fmt(r.price)}</div>
        <div><small>Seña (${r.pct}%)</small><b>${fmt(r.sena)}</b></div>
        <div><small>Saldo al retirar</small>${fmt(r.rest)}</div>
        <div><small>Medio de pago</small>${r.pay}</div>
        <div><small>Titular</small>${escapeHTML(r.name)}</div>
      </div>
      <div class="ticket__next"><b>Próximo paso:</b> tocá <b>“Enviar por WhatsApp”</b>. Te respondemos con los datos para abonar la seña y, una vez acreditada, tu moto queda reservada a tu nombre.</div>
    </div>
    <div class="ticket__side">
      <div class="ticket__code">${r.code}</div>
      <div class="ticket__timer">Precio congelado<b id="tTimer">${remaining(r) || '00:00:00'}</b></div>
      <div class="ticket__bar"></div>
    </div>`;
  $('#sendWa').href = waLink(resMessage(r));
  clearInterval(ticketTimer);
  ticketTimer = setInterval(() => { const el = $('#tTimer'); if (el) el.textContent = remaining(r) || 'Vencida'; }, 1000);
}
function escapeHTML(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

$('#newRes').addEventListener('click', () => {
  $('#wizard').reset();
  R.extras = [];
  R.pct = BUSINESS.reserve.minPct;
  fMoto.value = R.moto.id;
  R.branch = 0;
  updateSena();
  goStep(0);
});

// Confetti de chispas al confirmar
function burst() {
  if (reduceMotion) return;
  const host = $('#wizard');
  const r = host.getBoundingClientRect();
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    const size = 4 + Math.random() * 6;
    Object.assign(s.style, {
      position: 'fixed', left: r.left + r.width / 2 + 'px', top: r.top + 120 + 'px', width: size + 'px', height: size + 'px',
      background: ['#e3121b', '#ffffff', '#8c8c95', '#ff2a32'][i % 4], zIndex: 400, pointerEvents: 'none', borderRadius: i % 3 ? '2px' : '50%',
    });
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
    s.animate(
      [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 160}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
      { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.22,1,.36,1)' }
    ).onfinish = () => s.remove();
  }
}

// ---------- Drawer "Mis reservas" ----------
const drawer = $('#drawer');
let drawerTimer;
function updateBadge() {
  const n = loadRes().filter((r) => r.expires > Date.now()).length;
  const b = $('#resBadge');
  b.hidden = n === 0;
  b.textContent = n;
}
function renderDrawer() {
  const list = loadRes();
  const host = $('#resList');
  if (!list.length) {
    host.innerHTML = `<div class="drawer__empty"><p>Todavía no tenés reservas.</p><br><a href="#catalogo" class="btn btn--red btn--sm" data-dclose>Ver motos</a></div>`;
    return;
  }
  host.innerHTML = list.map((r, i) => {
    const rem = remaining(r);
    return `<div class="res">
      <div class="res__img"><img src="${r.img}" alt="" /></div>
      <div>
        <b>${r.moto}</b>
        <small>${r.code} · ${r.color}</small>
        <small>Seña ${fmt(r.sena)} · ${r.pay}</small>
        <span class="res__st ${rem ? '' : 'exp'}" data-exp="${r.expires}">${rem ? 'Vence en ' + rem : 'Vencida'}</span>
      </div>
      <div class="res__act">
        <a href="${waLink(resMessage(r))}" target="_blank" rel="noopener">Enviar WhatsApp</a>
        <button data-del="${i}">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}
function openDrawer() {
  renderDrawer();
  drawer.hidden = false;
  lockScroll(true);
  clearInterval(drawerTimer);
  drawerTimer = setInterval(() => {
    $$('.res__st[data-exp]').forEach((el) => {
      const rem = remaining({ expires: +el.dataset.exp });
      el.textContent = rem ? 'Vence en ' + rem : 'Vencida';
      el.classList.toggle('exp', !rem);
    });
  }, 1000);
}
function closeDrawer() {
  drawer.hidden = true;
  clearInterval(drawerTimer);
  lockScroll(false);
}
$('#openReservas').addEventListener('click', openDrawer);
drawer.addEventListener('click', (e) => {
  if (e.target.closest('[data-dclose]')) closeDrawer();
  const del = e.target.closest('[data-del]');
  if (del) {
    const list = loadRes();
    const r = list[+del.dataset.del];
    if (!confirm(`¿Eliminar la reserva ${r.code} de este dispositivo? No se puede deshacer.`)) return;
    list.splice(+del.dataset.del, 1);
    saveRes(list);
    renderDrawer();
    updateBadge();
  }
});
updateBadge();

// ------------------------------------------------------------
//  FINANCIACIÓN
// ------------------------------------------------------------
const C = { moto: findMoto('motomel-skua-150'), ant: 20, plan: PLANS.find((p) => p.n === 12) };
const cMoto = $('#cMoto');
cMoto.innerHTML = fMoto.innerHTML;
cMoto.value = C.moto.id;
$('#cPlans').innerHTML = PLANS.map((p) => `<button type="button" data-n="${p.n}" class="${p.n === 12 ? 'is-active' : ''}">${p.n}</button>`).join('');
function calc() {
  const ant = Math.round((C.moto.price * C.ant) / 100);
  const fin = C.moto.price - ant;
  const q = cuota(fin, C.plan.n, C.plan.tna);
  $('#cAntLbl').textContent = C.ant + '%';
  $('#cAntV').textContent = fmt(ant);
  $('#cFin').textContent = fmt(fin);
  $('#cPlanLbl').textContent = C.plan.tna ? `${C.plan.n} cuotas fijas de` : `${C.plan.n} cuotas sin interés de`;
  animateNumber($('#cCuota'), q);
  const r = $('#cAnt');
  r.style.setProperty('--fill', (C.ant / r.max) * 100 + '%');
}
cMoto.addEventListener('change', () => { C.moto = findMoto(cMoto.value); calc(); });
$('#cAnt').addEventListener('input', (e) => { C.ant = +e.target.value; calc(); });
$('#cPlans').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  C.plan = PLANS.find((p) => p.n === +b.dataset.n);
  $$('#cPlans button').forEach((x) => x.classList.toggle('is-active', x === b));
  calc();
});
calc();

// ------------------------------------------------------------
//  SUCURSALES
// ------------------------------------------------------------
const mapSrc = (b) => `https://www.google.com/maps?q=${encodeURIComponent(`${b.address}, ${b.city}, Argentina`)}&output=embed`;
const mapLink = (b) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.address}, ${b.city}, Argentina`)}`;
$('#branchList').innerHTML =
  BUSINESS.branches.map((b, i) => `
    <button class="branch reveal ${i === 0 ? 'is-active' : ''}" data-b="${i}">
      <small>${b.name}</small>
      <b>${b.address}</b>
      <span>${b.city}</span>
      <span class="branch__links"><a href="${mapLink(b)}" target="_blank" rel="noopener">Cómo llegar</a></span>
    </button>`).join('') +
  `<div class="contact-card reveal">
     <small>WhatsApp y teléfono</small>
     <a href="https://wa.me/${BUSINESS.whatsapp}" target="_blank" rel="noopener">${BUSINESS.phoneDisplay}</a>
     <small style="margin-top:8px">Instagram</small>
     <a href="${BUSINESS.instagram}" target="_blank" rel="noopener">${BUSINESS.instagramUser}</a>
   </div>`;
$('#branchList').addEventListener('click', (e) => {
  const b = e.target.closest('.branch');
  if (!b || e.target.closest('a')) return;
  $$('.branch').forEach((x) => x.classList.toggle('is-active', x === b));
  $('#mapFrame').src = mapSrc(BUSINESS.branches[+b.dataset.b]);
});

// ------------------------------------------------------------
//  Animaciones de aparición
// ------------------------------------------------------------
if (hasGSAP) {
  $$('.reveal').forEach((el) => {
    gsap.from(el, { y: 46, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  gsap.to('.how__line span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.how__steps', start: 'top 75%', end: 'bottom 55%', scrub: true } });
  gsap.from('.featured__head', { y: 40, opacity: 0, duration: 1, scrollTrigger: { trigger: '.featured', start: 'top 80%' } });
  gsap.fromTo('.cta__marquee', { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
  addEventListener('load', () => window.ScrollTrigger.refresh());
}


// ------------------------------------------------------------
//  Cursor tuerca
// ------------------------------------------------------------
if (finePointer && !reduceMotion) {
  const cur = document.createElement('div');
  cur.className = 'nut-cursor';
  cur.innerHTML = `<svg viewBox="0 0 40 40"><polygon points="20,2 35.6,11 35.6,29 20,38 4.4,29 4.4,11" /><circle cx="20" cy="20" r="7" /></svg>`;
  document.body.appendChild(cur);
  const dot = document.createElement('div');
  dot.className = 'nut-dot';
  document.body.appendChild(dot);
  let mx = -100, my = -100, cx = -100, cy = -100, rot = 0;
  addEventListener('pointermove', (e) => {
    rot += Math.hypot(e.clientX - mx, e.clientY - my) * 0.6;
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
  });
  document.addEventListener('pointerover', (e) => {
    cur.classList.toggle('is-hover', !!e.target.closest('a, button, select, input, label, [data-open], .card__stage'));
  });
  document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
  document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => { cur.style.opacity = 0; dot.style.opacity = 0; });
  document.addEventListener('pointerenter', () => { cur.style.opacity = ''; dot.style.opacity = ''; });
  (function tick() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    cur.style.transform = `translate(${cx}px, ${cy}px) rotate(${rot}deg)`;
    requestAnimationFrame(tick);
  })();
}

// ------------------------------------------------------------
//  Efecto faro (la luz sigue al cursor)
// ------------------------------------------------------------
{
  const stage = $('#nightStage');
  if (!finePointer) $('.night__sub').textContent = 'La luz recorre la moto sola';
  let tx = 0.7, ty = 0.5, x = 0.7, y = 0.5, auto = !finePointer, active = false, t0 = performance.now();
  const set = () => {
    stage.style.setProperty('--x', (x * 100).toFixed(2) + '%');
    stage.style.setProperty('--y', (y * 100).toFixed(2) + '%');
  };
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = (e.clientY - r.top) / r.height;
    auto = false;
    stage.classList.add('is-lit');
  });
  stage.addEventListener('pointerleave', () => { auto = true; });
  new IntersectionObserver(([en]) => { active = en.isIntersecting; }).observe(stage);
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!active) return;
    if (auto) {
      const k = (now - t0) / 1000;
      tx = 0.62 + Math.sin(k * 0.7) * 0.22;
      ty = 0.55 + Math.sin(k * 1.1) * 0.15;
    }
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    set();
  })(t0);
  set();
}

// ------------------------------------------------------------
//  Comparador
// ------------------------------------------------------------
{
  const A = $('#vsA'), B = $('#vsB');
  A.innerHTML = fMoto.innerHTML;
  B.innerHTML = fMoto.innerHTML;
  A.value = 'bajaj-dominar-250';
  B.value = 'cfmoto-250nk';
  const metrics = [
    { k: 'Cilindrada', get: (m) => m.cc, f: (v) => v + ' cc', best: 'max' },
    { k: 'Potencia', get: (m) => num(m.specs.Potencia), f: (v) => String(v).replace('.', ',') + ' HP', best: 'max' },
    { k: 'Tanque', get: (m) => num(m.specs.Tanque), f: (v) => String(v).replace('.', ',') + ' L', best: 'max' },
    { k: 'Precio contado', get: (m) => m.price, f: fmt, best: 'min' },
    { k: '12 cuotas de', get: (m) => cuota(m.price, 12, plan12.tna), f: fmt, best: 'min' },
  ];
  const rows = $('#vsRows');
  rows.innerHTML = metrics.map((mt, i) => `
    <div class="vs__row" data-i="${i}">
      <div class="vs__val vs__val--a"><b></b><span class="vs__bar"><i></i></span></div>
      <div class="vs__label">${mt.k}</div>
      <div class="vs__val vs__val--b"><span class="vs__bar"><i></i></span><b></b></div>
    </div>`).join('');
  function swapImg(img, src, alt, dir) {
    if (img.getAttribute('src') === src) return;
    if (hasGSAP && img.getAttribute('src')) {
      gsap.to(img, { x: -60 * dir, opacity: 0, duration: 0.3, onComplete: () => {
        img.src = src; img.alt = alt;
        gsap.fromTo(img, { x: 80 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
      } });
    } else { img.src = src; img.alt = alt; }
  }
  function render() {
    const a = findMoto(A.value), b = findMoto(B.value);
    swapImg($('#vsImgA'), a.colors[0].img, `${a.brand} ${a.model}`, 1);
    swapImg($('#vsImgB'), b.colors[0].img, `${b.brand} ${b.model}`, -1);
    metrics.forEach((mt, i) => {
      const va = mt.get(a), vb = mt.get(b), mx = Math.max(va, vb) || 1;
      const row = $(`.vs__row[data-i="${i}"]`, rows);
      const [ea, eb] = $$('.vs__val', row);
      $('b', ea).textContent = va ? mt.f(va) : '—';
      $('b', eb).textContent = vb ? mt.f(vb) : '—';
      $('i', ea).style.width = (va / mx) * 100 + '%';
      $('i', eb).style.width = (vb / mx) * 100 + '%';
      const winA = va !== vb && (mt.best === 'max' ? va > vb : va < vb);
      const winB = va !== vb && !winA;
      ea.classList.toggle('is-win', winA);
      eb.classList.toggle('is-win', winB);
    });
  }
  A.addEventListener('change', render);
  B.addEventListener('change', render);
  render();
  new IntersectionObserver(([en], obs) => {
    if (en.isIntersecting) { $('#vs').classList.add('is-in'); obs.disconnect(); }
  }, { threshold: 0.25 }).observe($('#vs'));
}
