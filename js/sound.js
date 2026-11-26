// ============================================================
//  Sonido de motor sintetizado (Web Audio) — sin archivos externos
//  Monocilíndrico 4T: explosiones a rpm/120 por segundo.
// ============================================================
export function createEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();

  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);

  // Distorsión suave para el "gruñido"
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    curve[i] = Math.tanh(x * 2.6);
  }
  shaper.curve = curve;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  lp.Q.value = 4;
  shaper.connect(lp).connect(master);

  // Dos osciladores (fundamental + subarmónico)
  const o1 = ctx.createOscillator();
  o1.type = 'sawtooth';
  const o2 = ctx.createOscillator();
  o2.type = 'square';
  const g1 = ctx.createGain(); g1.gain.value = 0.55;
  const g2 = ctx.createGain(); g2.gain.value = 0.35;
  o1.connect(g1).connect(shaper);
  o2.connect(g2).connect(shaper);

  // Pulso de explosión: modulación de amplitud a la frecuencia de encendido
  const pulse = ctx.createGain();
  pulse.gain.value = 0.6;
  shaper.disconnect();
  shaper.connect(pulse).connect(lp);
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.4;
  lfo.connect(lfoGain).connect(pulse.gain);

  // Ruido de escape
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = nb;
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.value = 0.05;
  noise.connect(bp).connect(ng).connect(lp);

  [o1, o2, lfo, noise].forEach((n) => n.start());

  let on = false;
  const api = {
    get on() { return on; },
    async enable() {
      if (ctx.state !== 'running') await ctx.resume();
      on = true;
      master.gain.setTargetAtTime(0.32, ctx.currentTime, 0.2);
    },
    disable() {
      on = false;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    },
    // rpm: 900–12000 · throttle: 0–1 (qué tan rápido se scrollea)
    set(rpm, throttle = 0, volume = 1) {
      if (!on) return;
      const t = ctx.currentTime;
      const fire = Math.max(7, rpm / 120);
      const f = fire * 2;
      o1.frequency.setTargetAtTime(f, t, 0.06);
      o2.frequency.setTargetAtTime(f / 2, t, 0.06);
      lfo.frequency.setTargetAtTime(fire, t, 0.06);
      lp.frequency.setTargetAtTime(380 + rpm * 0.12 + throttle * 1400, t, 0.08);
      ng.gain.setTargetAtTime(0.03 + throttle * 0.08, t, 0.08);
      master.gain.setTargetAtTime((0.22 + throttle * 0.2) * volume, t, 0.1);
    },
    // Acelerón corto (al terminar la intro)
    rev() {
      if (!on) return;
      const t = ctx.currentTime;
      lp.frequency.cancelScheduledValues(t);
      lp.frequency.setValueAtTime(lp.frequency.value, t);
      lp.frequency.linearRampToValueAtTime(3200, t + 0.25);
      lp.frequency.linearRampToValueAtTime(700, t + 1.2);
      [o1, o2, lfo].forEach((o, i) => {
        const base = o.frequency.value;
        o.frequency.cancelScheduledValues(t);
        o.frequency.setValueAtTime(base, t);
        o.frequency.linearRampToValueAtTime(base * 1.8, t + 0.3);
        o.frequency.linearRampToValueAtTime(base * 0.9, t + 1.3);
      });
    },
  };
  return api;
}
