// ============================================================
//  VISOR 3D / 360° — Moto 3D ilustrativa con vista satelital
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function cylBetween(a, b, r, mat, seg = 12) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return m;
}
function tube(points, r, mat) {
  const c = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(c, 48, r, 10, false), mat);
}
function rbox(w, h, d, r, mat) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat);
}

const PRESETS = {
  cub:       { rf: 0.30, rr: 0.30, tf: 0.045, tr: 0.05, wb: 1.22, spokes: 'wire', seatY: 0.80, headY: 0.98 },
  street:    { rf: 0.32, rr: 0.32, tf: 0.05, tr: 0.058, wb: 1.3, spokes: 'wire', seatY: 0.84, headY: 1.02 },
  enduro:    { rf: 0.37, rr: 0.34, tf: 0.055, tr: 0.065, wb: 1.38, spokes: 'wire', seatY: 0.95, headY: 1.12 },
  naked:     { rf: 0.31, rr: 0.31, tf: 0.06, tr: 0.08, wb: 1.36, spokes: 'alloy', seatY: 0.86, headY: 1.04 },
  adventure: { rf: 0.36, rr: 0.34, tf: 0.06, tr: 0.07, wb: 1.42, spokes: 'wire', seatY: 0.92, headY: 1.14 },
};

export function buildBike(cat, color) {
  const P = PRESETS[cat] || PRESETS.street;
  const bike = new THREE.Group();

  const body = new THREE.MeshPhysicalMaterial({ color: color.hex, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const accent = new THREE.MeshPhysicalMaterial({ color: color.accent || '#151517', metalness: 0.3, roughness: 0.35, clearcoat: 0.8 });
  const frameMat = new THREE.MeshStandardMaterial({ color: color.frame || '#1c1c1f', metalness: 0.6, roughness: 0.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.92 });
  const metal = new THREE.MeshStandardMaterial({ color: '#b8b8be', metalness: 1, roughness: 0.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e5e5e8', metalness: 1, roughness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#232326', metalness: 0.75, roughness: 0.45 });
  const seatMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.75 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#b9d3e6', metalness: 0, roughness: 0.05, transmission: 0.7, transparent: true, opacity: 0.45 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6dc', emissiveIntensity: 2.2 });
  const tail = new THREE.MeshStandardMaterial({ color: '#ff1a1a', emissive: '#ff0000', emissiveIntensity: 1.6 });
  const amber = new THREE.MeshStandardMaterial({ color: '#ff9a1a', emissive: '#ff7a00', emissiveIntensity: 0.8 });

  const fx = P.wb / 2, rx = -P.wb / 2;
  const H = V(fx - 0.3, P.headY); // pipa de dirección

  // ---------- Ruedas ----------
  function wheel(x, r, t, style, disc) {
    const w = new THREE.Group();
    w.position.set(x, r, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(r - t, t, 18, 64), rubber);
    w.add(tire);
    const rimR = r - t * 1.9;
    const rimMat = cat === 'naked' && color.frame ? new THREE.MeshStandardMaterial({ color: color.frame, metalness: 0.5, roughness: 0.35 }) : style === 'alloy' ? dark : metal;
    w.add(new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.014, 8, 64), rimMat));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.13, 20), metal);
    hub.rotation.x = Math.PI / 2;
    w.add(hub);
    if (style === 'alloy') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.BoxGeometry(rimR - 0.05, 0.028, 0.03), rimMat);
        s.position.set(Math.cos(a) * (rimR / 2 + 0.02), Math.sin(a) * (rimR / 2 + 0.02), 0);
        s.rotation.z = a;
        w.add(s);
      }
    } else {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const zs = i % 2 ? 0.05 : -0.05;
        w.add(cylBetween(V(Math.cos(a + 0.25) * 0.05, Math.sin(a + 0.25) * 0.05, zs), V(Math.cos(a) * rimR, Math.sin(a) * rimR, 0), 0.0028, metal, 4));
      }
    }
    if (disc) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.008, 40), metal);
      d.rotation.x = Math.PI / 2;
      d.position.z = 0.075;
      w.add(d);
      const cal = rbox(0.09, 0.12, 0.04, 0.015, cat === 'adventure' && color.accent ? accent : tail.clone());
      cal.material = new THREE.MeshStandardMaterial({ color: '#c01818', metalness: 0.4, roughness: 0.4 });
      cal.position.set(-r * 0.32, r * 0.38, 0.1);
      w.add(cal);
    }
    w.userData.spin = true;
    return w;
  }
  bike.add(wheel(fx, P.rf, P.tf, P.spokes, true));
  bike.add(wheel(rx, P.rr, P.tr, P.spokes, cat !== 'cub' && cat !== 'street'));

  // ---------- Horquilla ----------
  const forkMat = cat === 'adventure' && color.accent === '#e31b2a' ? new THREE.MeshStandardMaterial({ color: '#d6a23a', metalness: 1, roughness: 0.2 }) : chrome;
  [-0.085, 0.085].forEach((z) => {
    bike.add(cylBetween(V(fx, P.rf, z), V(H.x + 0.03, H.y - 0.05, z), cat === 'naked' || cat === 'adventure' ? 0.022 : 0.018, forkMat));
    bike.add(cylBetween(V(fx, P.rf, z), V(fx - 0.06, P.rf + 0.28, z), 0.028, dark));
  });
  const triple = rbox(0.12, 0.04, 0.26, 0.015, dark);
  triple.position.set(H.x + 0.02, H.y, 0);
  bike.add(triple);

  // Manubrio + puños + espejos
  const barY = H.y + (cat === 'enduro' || cat === 'adventure' ? 0.16 : 0.1);
  bike.add(tube([V(H.x - 0.08, barY, -0.36), V(H.x - 0.02, barY, -0.15), V(H.x + 0.0, barY - 0.02, 0), V(H.x - 0.02, barY, 0.15), V(H.x - 0.08, barY, 0.36)], 0.012, dark));
  [-0.36, 0.36].forEach((z) => {
    bike.add(cylBetween(V(H.x - 0.08, barY, z), V(H.x - 0.08, barY, z + Math.sign(z) * 0.1), 0.02, rubber));
    const stalk = cylBetween(V(H.x - 0.05, barY, z * 0.75), V(H.x - 0.08, barY + 0.2, z * 0.92), 0.006, dark, 6);
    bike.add(stalk);
    const mir = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), dark);
    mir.scale.set(0.35, 0.75, 1.25);
    mir.position.set(H.x - 0.08, barY + 0.22, z * 0.95);
    bike.add(mir);
  });

  // Faro
  const head = new THREE.Group();
  head.position.set(H.x + 0.1, H.y - 0.06, 0);
  if (cat === 'naked') {
    const cowl = rbox(0.12, 0.17, 0.2, 0.04, body);
    head.add(cowl);
    const l = rbox(0.02, 0.09, 0.14, 0.01, lamp);
    l.position.x = 0.06;
    head.add(l);
  } else {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.09, 24), cat === 'street' ? dark : body);
    shell.rotation.z = Math.PI / 2;
    head.add(shell);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.068, 24), lamp);
    lens.rotation.y = Math.PI / 2;
    lens.position.x = 0.047;
    head.add(lens);
  }
  bike.add(head);
  [-0.12, 0.12].forEach((z) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), amber);
    b.scale.x = 1.6;
    b.position.set(H.x + 0.06, H.y - 0.02, z);
    bike.add(b);
  });

  // ---------- Chasis ----------
  const pivot = V(-0.22, 0.42);
  const engC = V(0.02, 0.42);
  const seatX = cat === 'cub' ? -0.28 : -0.24;
  bike.add(tube([V(H.x, H.y - 0.02), V(H.x - 0.25, H.y - 0.2), V(0.12, 0.55), V(0.12, 0.28), V(-0.12, 0.26), pivot], 0.024, frameMat));
  bike.add(tube([V(H.x - 0.05, H.y - 0.05, 0), V(-0.05, P.seatY - 0.08, 0.06), V(-0.55, P.seatY - 0.02, 0.08)], 0.018, frameMat));
  bike.add(tube([V(H.x - 0.05, H.y - 0.05, 0), V(-0.05, P.seatY - 0.08, -0.06), V(-0.55, P.seatY - 0.02, -0.08)], 0.018, frameMat));
  if (cat === 'naked' && color.frame) {
    // chasis trellis
    for (let i = 0; i < 4; i++) {
      const x0 = H.x - 0.1 - i * 0.14;
      [-0.1, 0.1].forEach((z) => {
        bike.add(cylBetween(V(x0, H.y - 0.06 - i * 0.04, z), V(x0 - 0.14, 0.5, z), 0.012, frameMat, 6));
      });
    }
  }

  // Basculante + amortiguador
  [-0.09, 0.09].forEach((z) => bike.add(cylBetween(V(pivot.x, pivot.y, z), V(rx, P.rr, z), 0.022, cat === 'naked' || cat === 'adventure' ? metal : dark)));
  const shockTop = V(-0.42, P.seatY - 0.12);
  const shockColor = new THREE.MeshStandardMaterial({ color: cat === 'naked' || cat === 'adventure' ? '#e07b18' : '#c51b1b', metalness: 0.4, roughness: 0.35 });
  if (cat === 'enduro' || cat === 'naked' || cat === 'adventure') {
    bike.add(cylBetween(V(-0.15, 0.62), V(-0.25, 0.4), 0.032, shockColor));
  } else {
    [-0.11, 0.11].forEach((z) => bike.add(cylBetween(V(shockTop.x, shockTop.y, z), V(rx + 0.1, P.rr + 0.06, z), 0.024, shockColor)));
  }

  // ---------- Motor ----------
  const eng = new THREE.Group();
  eng.position.copy(engC);
  const crank = rbox(0.3, 0.22, 0.24, 0.05, dark);
  eng.add(crank);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 28), metal);
  cover.rotation.x = Math.PI / 2;
  cover.position.set(-0.02, -0.01, 0.13);
  eng.add(cover);
  const cyl = new THREE.Group();
  cyl.position.set(0.08, 0.15, 0);
  cyl.rotation.z = cat === 'cub' ? -1.25 : -0.35;
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.2), cat === 'naked' ? dark : metal);
    fin.position.y = i * 0.025;
    cyl.add(fin);
  }
  eng.add(cyl);
  bike.add(eng);
  if (cat === 'naked') {
    const rad = rbox(0.04, 0.2, 0.28, 0.01, dark);
    rad.position.set(H.x - 0.22, 0.62, 0);
    rad.rotation.z = 0.2;
    bike.add(rad);
  }

  // ---------- Escape ----------
  if (cat === 'naked') {
    const can = rbox(0.28, 0.12, 0.14, 0.04, dark);
    can.position.set(-0.12, 0.22, 0.09);
    bike.add(can);
    bike.add(cylBetween(V(0.12, 0.38, 0.08), V(-0.02, 0.24, 0.09), 0.025, metal));
  } else if (cat === 'enduro' || cat === 'adventure') {
    bike.add(tube([V(0.16, 0.42, 0.06), V(0.16, 0.26, 0.12), V(-0.12, 0.3, 0.15), V(-0.38, 0.58, 0.15)], 0.025, chrome));
    const muf = cylBetween(V(-0.36, 0.56, 0.15), V(-0.72, 0.78, 0.15), 0.055, dark, 20);
    bike.add(muf);
  } else {
    bike.add(tube([V(0.16, 0.42, 0.06), V(0.16, 0.24, 0.12), V(-0.1, 0.24, 0.15)], 0.022, chrome));
    bike.add(cylBetween(V(-0.1, 0.25, 0.15), V(-0.7, 0.38, 0.15), 0.05, cat === 'street' && color.hex === '#1240b8' ? dark : chrome, 20));
  }

  // ---------- Carrocería ----------
  if (cat === 'cub') {
    // escudo frontal + pisadera + carenado trasero
    const shield = rbox(0.1, 0.6, 0.34, 0.05, body);
    shield.position.set(H.x - 0.12, 0.66, 0);
    shield.rotation.z = -0.38;
    bike.add(shield);
    const floorB = rbox(0.3, 0.05, 0.22, 0.02, dark);
    floorB.position.set(0.0, 0.36, 0);
    bike.add(floorB);
    const rear = rbox(0.62, 0.3, 0.26, 0.11, body);
    rear.position.set(-0.32, 0.66, 0);
    rear.rotation.z = 0.12;
    bike.add(rear);
    const front = rbox(0.24, 0.16, 0.2, 0.07, body);
    front.position.set(H.x - 0.02, H.y - 0.02, 0);
    bike.add(front);
  } else {
    // tanque
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), body);
    const tScale = cat === 'naked' ? [1.35, 0.72, 0.95] : cat === 'adventure' ? [1.45, 0.82, 1.05] : cat === 'enduro' ? [1.2, 0.62, 0.82] : [1.35, 0.68, 0.85];
    tank.scale.set(...tScale);
    tank.position.set(H.x - 0.32, P.seatY + 0.07, 0);
    tank.rotation.z = -0.12;
    bike.add(tank);
    // tapas laterales / shrouds
    [-1, 1].forEach((s) => {
      const side = rbox(0.3, 0.18, 0.03, 0.012, cat === 'enduro' || cat === 'adventure' ? body : accent);
      side.position.set(H.x - 0.38, P.seatY - 0.08, s * (cat === 'naked' ? 0.15 : 0.13));
      side.rotation.z = -0.35;
      bike.add(side);
      const panel = rbox(0.24, 0.14, 0.03, 0.012, cat === 'street' ? body : accent);
      panel.position.set(-0.3, P.seatY - 0.12, s * 0.1);
      bike.add(panel);
    });
    // cola
    const tailB = rbox(0.42, 0.1, 0.18, 0.04, body);
    tailB.position.set(-0.62, P.seatY + 0.01, 0);
    tailB.rotation.z = cat === 'naked' ? 0.28 : 0.12;
    bike.add(tailB);
  }
  // asiento
  const seat = rbox(cat === 'cub' ? 0.58 : 0.66, 0.075, 0.24, 0.035, seatMat);
  seat.position.set(seatX, P.seatY + (cat === 'cub' ? -0.0 : 0.03), 0);
  seat.rotation.z = cat === 'naked' ? 0.08 : 0.02;
  bike.add(seat);
  // luz trasera
  const tl = rbox(0.03, 0.05, 0.12, 0.01, tail);
  tl.position.set(-0.84, P.seatY + 0.02, 0);
  bike.add(tl);
  // portapatente
  bike.add(cylBetween(V(-0.78, P.seatY - 0.05), V(-0.9, P.seatY - 0.3), 0.012, dark));
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.17), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  plate.position.set(-0.91, P.seatY - 0.34, 0);
  bike.add(plate);
  if (cat === 'street' || cat === 'cub') {
    // parrilla
    bike.add(tube([V(-0.55, P.seatY + 0.06, -0.1), V(-0.82, P.seatY + 0.08, -0.08), V(-0.84, P.seatY + 0.08, 0), V(-0.82, P.seatY + 0.08, 0.08), V(-0.55, P.seatY + 0.06, 0.1)], 0.01, dark));
  }

  // Guardabarros
  if (cat === 'enduro' || cat === 'adventure') {
    const ff = rbox(0.62, 0.025, 0.13, 0.01, cat === 'adventure' ? body : body);
    ff.position.set(fx + 0.05, cat === 'adventure' ? P.rf * 2 + 0.06 : H.y - 0.2, 0);
    ff.rotation.z = 0.08;
    bike.add(ff);
  } else {
    const ff = new THREE.Mesh(new THREE.TorusGeometry(P.rf + 0.03, 0.05, 6, 28, Math.PI * 0.62), cat === 'naked' ? dark : body);
    ff.scale.z = 1.3;
    ff.position.set(fx, P.rf, 0);
    ff.rotation.z = Math.PI * 0.2;
    bike.add(ff);
  }
  const rf = new THREE.Mesh(new THREE.TorusGeometry(P.rr + 0.03, 0.045, 6, 24, Math.PI * 0.45), dark);
  rf.scale.z = 1.4;
  rf.position.set(rx, P.rr, 0);
  rf.rotation.z = Math.PI * 0.45;
  bike.add(rf);

  // Adventure: parabrisas + pico + cubrepuños
  if (cat === 'adventure') {
    const fair = rbox(0.16, 0.24, 0.3, 0.05, body);
    fair.position.set(H.x + 0.06, H.y + 0.02, 0);
    fair.rotation.z = -0.35;
    bike.add(fair);
    const ws = rbox(0.015, 0.34, 0.28, 0.006, glass);
    ws.position.set(H.x + 0.08, H.y + 0.26, 0);
    ws.rotation.z = -0.42;
    bike.add(ws);
    [-0.36, 0.36].forEach((z) => {
      const hg = rbox(0.14, 0.06, 0.02, 0.01, body);
      hg.position.set(H.x - 0.02, barY, z);
      bike.add(hg);
    });
    if (color.name === 'Negro') {
      const box = rbox(0.32, 0.26, 0.34, 0.05, dark);
      box.position.set(-0.75, P.seatY + 0.2, 0);
      bike.add(box);
    }
  }

  bike.traverse((m) => {
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; }
  });
  return bike;
}

// ------------------------------------------------------------------
export function createViewer(container, hud) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  camera.position.set(2.6, 1.1, 2.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.55, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.6;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight('#ffffff', '#3a0d0d', 0.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(3, 5, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -2;
  key.shadow.camera.right = key.shadow.camera.top = 2;
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.PointLight('#ff2a2a', 2.2, 6, 1.5);
  rim.position.set(-2.2, 1.8, -2.2);
  scene.add(rim);

  // Plataforma giratoria tipo estudio
  const stage = new THREE.Group();
  scene.add(stage);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.4, 0.06, 96), new THREE.MeshStandardMaterial({ color: '#141416', metalness: 0.7, roughness: 0.35 }));
  disc.position.y = -0.03;
  disc.receiveShadow = true;
  stage.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.37, 0.008, 8, 128), new THREE.MeshBasicMaterial({ color: '#e3121b' }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.002;
  stage.add(ring);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.55 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.002;
  shadowPlane.receiveShadow = true;
  stage.add(shadowPlane);
  // marcas de grados (estilo satélite)
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(long ? 0.12 : 0.05, 0.004, 0.008), new THREE.MeshBasicMaterial({ color: long ? '#e3121b' : '#55555c' }));
    tick.position.set(Math.cos(a) * 1.5, 0.002, Math.sin(a) * 1.5);
    tick.rotation.y = -a;
    stage.add(tick);
  }

  let bike = null;
  function setBike(moto, color) {
    if (bike) {
      stage.remove(bike);
      bike.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); } });
    }
    bike = buildBike(moto.cat, color);
    bike.scale.setScalar(1.05);
    bike.position.y = 0.0;
    stage.add(bike);
    // animación de entrada
    bike.userData.intro = 0;
  }

  // Animación de cámara a presets
  let tween = null;
  function goTo(name) {
    const r = camera.position.distanceTo(controls.target);
    const views = {
      lateral: { az: 0, el: 0.08, d: 3.2 },
      frente: { az: Math.PI / 2, el: 0.1, d: 3.0 },
      tres4: { az: Math.PI / 4, el: 0.28, d: 3.3 },
      satelite: { az: Math.PI / 5, el: 1.35, d: 4.2 },
    };
    const v = views[name];
    if (!v) return;
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const to = new THREE.Spherical(v.d, Math.PI / 2 - v.el, v.az);
    // camino más corto en azimut
    let dTheta = to.theta - from.theta;
    dTheta = ((dTheta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    tween = { from, to: new THREE.Spherical(to.radius, to.phi, from.theta + dTheta), t: 0, r };
    controls.maxPolarAngle = name === 'satelite' ? Math.PI * 0.495 : Math.PI * 0.495;
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = 0, running = true;
  const clock = new THREE.Clock();
  const tmp = new THREE.Spherical();
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 1.1);
      const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - Math.pow(-2 * tween.t + 2, 3) / 2;
      tmp.set(
        THREE.MathUtils.lerp(tween.from.radius, tween.to.radius, e),
        THREE.MathUtils.lerp(tween.from.phi, tween.to.phi, e),
        THREE.MathUtils.lerp(tween.from.theta, tween.to.theta, e)
      );
      camera.position.setFromSpherical(tmp).add(controls.target);
      if (tween.t >= 1) tween = null;
    }
    if (bike && bike.userData.intro < 1) {
      bike.userData.intro = Math.min(1, bike.userData.intro + dt * 1.6);
      const e = 1 - Math.pow(1 - bike.userData.intro, 3);
      bike.position.y = (1 - e) * 0.6;
      bike.rotation.y = (1 - e) * -1.2;
    }
    // las ruedas giran suavemente en auto-rotación
    controls.update();
    if (hud) {
      const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const az = ((THREE.MathUtils.radToDeg(s.theta) % 360) + 360) % 360;
      const el = 90 - THREE.MathUtils.radToDeg(s.phi);
      hud(az, el, s.radius);
    }
    renderer.render(scene, camera);
  }
  loop();

  return {
    setBike,
    goTo,
    setAuto(v) { controls.autoRotate = v; },
    get auto() { return controls.autoRotate; },
    pause() { running = false; },
    resume() { running = true; clock.getDelta(); resize(); },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); container.innerHTML = ''; },
    stopTween() { tween = null; },
    controls,
  };
}
