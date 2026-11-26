// ============================================================
//  360° con fotos reales
//  Muestra una secuencia de fotos tomadas alrededor de la moto.
//  Arrastrar = girar · flechas del teclado = girar · inercia al soltar.
// ============================================================

// Ruta de cada foto: carpeta + número con 2 dígitos (01.webp, 02.webp…)
export const frameSrc = (spin, i) => `${spin.dir.replace(/\/?$/, '/')}${String(i + 1).padStart(2, '0')}.${spin.ext || 'webp'}`;

export function createSpinner({ stage, img, range, loadBar, loadTxt, onFrame }) {
  let frames = [];
  let n = 0;
  let pos = 0;            // posición continua (en fotos)
  let vel = 0;            // fotos por segundo (inercia)
  let auto = true;
  let dragging = false;
  let lastX = 0, lastT = 0;
  let token = 0;
  let raf = 0, prev = performance.now();
  let idleSince = 0;

  const AUTO_SPEED = 9;   // fotos por segundo en giro automático

  function show() {
    if (!n) return;
    const i = ((Math.round(pos) % n) + n) % n;
    const f = frames[i];
    if (f && f.complete && f.naturalWidth && img.src !== f.src) img.src = f.src;
    range.value = i;
    onFrame && onFrame(i, n);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;
    if (!n || dragging) return;
    if (Math.abs(vel) > 0.2) {
      pos += vel * dt;
      vel *= Math.pow(0.08, dt); // frena suave
      show();
    } else if (auto && now - idleSince > 1200) {
      pos += AUTO_SPEED * dt;
      show();
    }
  }
  raf = requestAnimationFrame(loop);

  // --- Arrastre ---
  const pxPerFrame = () => Math.max(4, stage.clientWidth / (n * 1.1));
  stage.addEventListener('pointerdown', (e) => {
    if (!n) return;
    dragging = true;
    vel = 0;
    lastX = e.clientX;
    lastT = performance.now();
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dFrames = -(e.clientX - lastX) / pxPerFrame();
    pos += dFrames;
    const dt = Math.max((now - lastT) / 1000, 0.001);
    vel = vel * 0.6 + (dFrames / dt) * 0.4;
    lastX = e.clientX;
    lastT = now;
    show();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    idleSince = performance.now();
    stage.classList.remove('is-dragging');
    if (performance.now() - lastT > 80) vel = 0;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // --- Teclado y barra ---
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      pos += e.key === 'ArrowRight' ? 1 : -1;
      vel = 0;
      idleSince = performance.now();
      show();
    }
  });
  range.addEventListener('input', () => {
    pos = +range.value;
    vel = 0;
    idleSince = performance.now();
    show();
  });

  // --- Carga de fotos con progreso ---
  async function load(spin) {
    const my = ++token;
    n = 0;
    frames = [];
    pos = 0;
    vel = 0;
    stage.classList.add('is-loading');
    range.max = spin.frames - 1;
    let done = 0;
    const list = Array.from({ length: spin.frames }, (_, i) => {
      const im = new Image();
      im.decoding = 'async';
      const p = new Promise((res) => {
        im.onload = im.onerror = () => {
          done++;
          if (my === token) {
            const pct = Math.round((done / spin.frames) * 100);
            loadBar.style.width = pct + '%';
            loadTxt.textContent = `Cargando fotos ${pct}%`;
          }
          res();
        };
      });
      im.src = frameSrc(spin, i);
      return { im, p };
    });
    // Mostramos la primera apenas carga
    await list[0].p;
    if (my !== token) return false;
    img.src = list[0].im.src;
    await Promise.all(list.map((x) => x.p));
    if (my !== token) return false;
    frames = list.map((x) => x.im);
    const ok = frames.filter((f) => f.naturalWidth).length;
    if (ok < 2) {
      loadTxt.textContent = 'No se encontraron las fotos 360° de esta moto';
      return false;
    }
    n = frames.length;
    stage.classList.remove('is-loading');
    idleSince = performance.now();
    show();
    return true;
  }

  return {
    load,
    setAuto(v) { auto = v; idleSince = 0; },
    get auto() { return auto; },
    destroy() { cancelAnimationFrame(raf); },
  };
}
