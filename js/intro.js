// ============================================================
//  INTRO 3D — Engranaje del logo + tuerca + llave que gira con el scroll
// ============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// --- Engranaje en "C" (como el logo: abierto a la derecha) -------------
function gearShape({ rIn = 2.25, rOut = 3.0, rTooth = 3.55, teeth = 12, start = 0.72, end = Math.PI * 2 - 0.72 }) {
  const shape = new THREE.Shape();
  const pitch = (Math.PI * 2) / teeth;
  const N = 520;
  const prof = (a) => {
    const ph = (((a - start) / pitch) % 1 + 1) % 1;
    // trapecio: subida 0.12-0.22, meseta 0.22-0.58, bajada 0.58-0.68
    if (ph < 0.12 || ph > 0.68) return 0;
    if (ph < 0.22) return (ph - 0.12) / 0.1;
    if (ph > 0.58) return 1 - (ph - 0.58) / 0.1;
    return 1;
  };
  for (let i = 0; i <= N; i++) {
    const a = start + ((end - start) * i) / N;
    const r = rOut + (rTooth - rOut) * prof(a);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  for (let i = 0; i <= 160; i++) {
    const a = end - ((end - start) * i) / 160;
    shape.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  shape.closePath();
  return shape;
}

function hexShape(R, holeR) {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    i ? s.lineTo(Math.cos(a) * R, Math.sin(a) * R) : s.moveTo(Math.cos(a) * R, Math.sin(a) * R);
  }
  s.closePath();
  if (holeR) {
    const h = new THREE.Path();
    h.absarc(0, 0, holeR, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

function extrude(shape, depth, bevel = 0.05, seg = 3) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 48,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

// --- Llave combinada (estrella + boca) ---------------------------------
function buildWrench(chrome, red) {
  const g = new THREE.Group();
  // Estrella (anillo con agujero hexagonal que calza en la tuerca)
  const ring = new THREE.Shape();
  ring.absarc(0, 0, 1.12, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const R = 0.84;
    i ? hole.lineTo(Math.cos(a) * R, Math.sin(a) * R) : hole.moveTo(Math.cos(a) * R, Math.sin(a) * R);
  }
  hole.closePath();
  ring.holes.push(hole);
  g.add(new THREE.Mesh(extrude(ring, 0.26, 0.05), chrome));

  // Mango
  const h = new THREE.Shape();
  h.moveTo(0.9, -0.36);
  h.lineTo(5.0, -0.27);
  h.quadraticCurveTo(5.25, 0, 5.0, 0.27);
  h.lineTo(0.9, 0.36);
  h.closePath();
  g.add(new THREE.Mesh(extrude(h, 0.16, 0.05), chrome));

  // Boca (extremo abierto)
  const o = new THREE.Shape();
  const cx = 5.6, R = 0.78, a0 = 0.72;
  o.moveTo(cx + Math.cos(a0) * R, Math.sin(a0) * R);
  o.absarc(cx, 0, R, a0, Math.PI * 2 - a0, false);
  o.lineTo(cx + Math.cos(a0) * R, -0.32);
  o.lineTo(cx - 0.12, -0.32);
  o.lineTo(cx - 0.12, 0.32);
  o.lineTo(cx + Math.cos(a0) * R, 0.32);
  o.closePath();
  g.add(new THREE.Mesh(extrude(o, 0.22, 0.05), chrome));

  // Grip rojo de marca
  const grip = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.62, 0.3, 4, 0.12), red);
  grip.position.set(3.0, 0, 0);
  g.add(grip);
  g.traverse((m) => m.isMesh && (m.castShadow = true));
  return g;
}

export function initIntro({ canvas, section, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070708');
  scene.fog = new THREE.Fog('#070708', 14, 34);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  // Luces
  scene.add(new THREE.HemisphereLight('#ffffff', '#220000', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(-5, 6, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const redRim = new THREE.PointLight('#ff1a1a', 0, 30, 1.6);
  redRim.position.set(4.5, -2, -3);
  scene.add(redRim);
  const redFront = new THREE.PointLight('#ff2222', 0, 18, 2);
  redFront.position.set(0, -3.5, 4);
  scene.add(redFront);

  // Materiales
  const gearMat = new THREE.MeshStandardMaterial({ color: '#a3a3a8', metalness: 0.92, roughness: 0.32 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.85, roughness: 0.42 });
  const nutMat = new THREE.MeshStandardMaterial({ color: '#c9c9cf', metalness: 1, roughness: 0.22 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e7e7ea', metalness: 1, roughness: 0.14 });
  const red = new THREE.MeshStandardMaterial({ color: '#e3121b', metalness: 0.25, roughness: 0.45 });

  // Conjunto engranaje
  const assembly = new THREE.Group();
  scene.add(assembly);

  const gear = new THREE.Mesh(extrude(gearShape({}), 0.7, 0.07, 4), gearMat);
  gear.castShadow = gear.receiveShadow = true;
  assembly.add(gear);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.42, 64), darkMat);
  hub.rotation.x = Math.PI / 2;
  assembly.add(hub);
  [Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((a) => {
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.38, 0.34, 3, 0.08), darkMat);
    spoke.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0);
    spoke.rotation.z = a;
    assembly.add(spoke);
  });

  // Tuerca + bulón roscado
  const nut = new THREE.Group();
  const nutMesh = new THREE.Mesh(extrude(hexShape(0.8, 0.36), 0.42, 0.06, 3), nutMat);
  nutMesh.castShadow = true;
  nut.add(nutMesh);
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 32), chrome);
  bolt.rotation.x = Math.PI / 2;
  bolt.position.z = 0.15;
  nut.add(bolt);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.018, 6, 32), darkMat);
    t.position.z = 0.3 + i * 0.065;
    nut.add(t);
  }
  nut.position.z = 0.55;
  assembly.add(nut);

  // Llave
  const wrench = buildWrench(chrome, red);
  const wrenchPivot = new THREE.Group();
  wrenchPivot.add(wrench);
  scene.add(wrenchPivot);

  // Piso reflectivo sutil y anillo
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#0c0c0d', metalness: 0.6, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.6;
  floor.receiveShadow = true;
  scene.add(floor);
  const ringGlow = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.66, 128), new THREE.MeshBasicMaterial({ color: '#e3121b', transparent: true, opacity: 0 }));
  ringGlow.position.z = -1.4;
  scene.add(ringGlow);

  // Chispas
  const SP = 260;
  const spGeo = new THREE.BufferGeometry();
  const spPos = new Float32Array(SP * 3);
  const spVel = new Float32Array(SP * 3);
  const spLife = new Float32Array(SP);
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: '#ff5a1f', size: 0.07, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(sparks);
  let spIdx = 0;
  function emitSpark(x, y, z) {
    const i = spIdx++ % SP;
    spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z;
    const a = Math.random() * Math.PI * 2;
    const s = 0.04 + Math.random() * 0.09;
    spVel[i * 3] = Math.cos(a) * s; spVel[i * 3 + 1] = Math.abs(Math.sin(a)) * s + 0.03; spVel[i * 3 + 2] = (Math.random() - 0.3) * s;
    spLife[i] = 1;
  }
  for (let i = 0; i < SP; i++) spPos[i * 3 + 1] = -999;

  // Polvo flotante (profundidad)
  const DN = 400;
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 40;
    dPos[i * 3 + 1] = (Math.random() - 0.5) * 22;
    dPos[i * 3 + 2] = -Math.random() * 25 + 6;
  }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#8a8a90', size: 0.035, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(dust);

  // --- Estado de scroll ---
  let target = 0, p = 0, visible = true, raf = 0;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function readScroll() {
    const r = section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    target = clamp(-r.top / total);
    visible = r.bottom > 0;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // en pantallas angostas alejamos la cámara
    camera.userData.base = w / h < 0.8 ? 24 : w / h < 1.2 ? 19 : 16;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', readScroll, { passive: true });
  resize();
  readScroll();

  const clock = new THREE.Clock();
  let prevTurn = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    p += (target - p) * Math.min(1, dt * 6);
    mouse.sx += (mouse.x - mouse.sx) * dt * 3;
    mouse.sy += (mouse.y - mouse.sy) * dt * 3;

    // Fases
    const pIn = ease(seg(p, 0, 0.22));       // aparece el engranaje
    const pWr = easeIO(seg(p, 0.18, 0.46));  // entra la llave
    const pTurn = seg(p, 0.44, 0.86);        // la llave gira la tuerca
    const pOut = easeIO(seg(p, 0.84, 1));    // salida

    // Engranaje: entra desde el fondo girando
    const idle = t * 0.12;
    const turnAngle = -pTurn * Math.PI * 2.25;
    assembly.position.z = lerp(-6, 0, pIn) - easeIO(seg(p, 0.48, 0.7)) * 5;
    assembly.rotation.z = (1 - pIn) * 2.4 + turnAngle + idle * (1 - pWr);
    assembly.rotation.y = lerp(-0.9, 0, pIn) + mouse.sx * 0.18 + Math.sin(t * 0.6) * 0.04;
    assembly.rotation.x = mouse.sy * 0.12 + lerp(0.5, 0, pIn);

    // Llave: llega desde abajo-derecha y se acopla a la tuerca
    const base = -Math.PI / 3; // múltiplo de 60° para que el hexágono calce
    wrenchPivot.position.set(
      lerp(7.5, 0, pWr) + assembly.position.x,
      lerp(-6, 0, pWr),
      lerp(9, 0.55, pWr) + assembly.position.z
    );
    wrenchPivot.rotation.set(assembly.rotation.x, assembly.rotation.y, 0);
    wrench.rotation.z = lerp(-2.2, base, pWr) + turnAngle;
    wrench.rotation.x = lerp(1.1, 0, pWr);
    wrench.position.z = 0;

    // Luces rojas que se encienden al girar
    redRim.intensity = lerp(0, 90, seg(p, 0.3, 0.7));
    redFront.intensity = lerp(0, 25, seg(p, 0.45, 0.85)) * (0.85 + Math.sin(t * 9) * 0.15 * pTurn);
    ringGlow.material.opacity = seg(p, 0.5, 0.8) * 0.8 * (1 - pOut);
    ringGlow.scale.setScalar(1 + Math.sin(t * 2) * 0.01);

    // Chispas en el contacto llave-tuerca mientras gira
    const turnSpeed = Math.abs(turnAngle - prevTurn) / Math.max(dt, 1e-3);
    prevTurn = turnAngle;
    if (pWr > 0.98 && turnSpeed > 0.15) {
      const n = Math.min(8, Math.floor(turnSpeed * 3));
      for (let i = 0; i < n; i++) {
        const a = wrench.rotation.z + Math.PI + (Math.random() - 0.5) * 0.6;
        emitSpark(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.7);
      }
    }
    for (let i = 0; i < SP; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= dt * 1.4;
      spVel[i * 3 + 1] -= dt * 0.25;
      spPos[i * 3] += spVel[i * 3];
      spPos[i * 3 + 1] += spVel[i * 3 + 1];
      spPos[i * 3 + 2] += spVel[i * 3 + 2];
      if (spLife[i] <= 0) spPos[i * 3 + 1] = -999;
    }
    spGeo.attributes.position.needsUpdate = true;

    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.2) * 0.2;

    // Cámara
    const baseZ = camera.userData.base || 16;
    camera.position.x = mouse.sx * 0.6 + lerp(0, -1.2, pTurn) * (1 - pOut);
    camera.position.y = -mouse.sy * 0.4 + lerp(1.2, 0.2, pIn);
    camera.position.z = baseZ - pOut * baseZ * 0.55;
    camera.lookAt(0, lerp(-0.4, 0, pIn), 0);

    renderer.render(scene, camera);
    onProgress && onProgress(p, t);
  }
  frame();

  return {
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
    get progress() { return p; },
  };
}
