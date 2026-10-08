// New Zealand farm setting: rolling pasture, distant snow-capped ranges,
// cabbage trees (tī kōuka), a post-and-wire fence and a rotomoulded poly tank.
// World units: 1 unit = 10 cm.
import { THREE, mat, add, canvasTex, corrugatedCylinder } from './studio.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------- noise ----------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

// Height of the ground at (x, z); flat pad around the origin for the tank.
export function groundY(x, z) {
  const r = Math.hypot(x, z);
  const pad = Math.min(1, Math.max(0, (r - 120) / 1400));
  const hills = (fbm(x / 4200 + 3.1, z / 4200 + 7.7) - 0.45) * 380;
  const swell = (fbm(x / 700, z / 700) - 0.5) * 60;
  return (hills + swell) * pad * pad;
}

export function sky(S, { elevation = 24, azimuth = 322, zenith = '#4f86c0', horizon = '#d7e4ec' } = {}) {
  const tex = canvasTex(2048, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h * 0.5);
    g.addColorStop(0, zenith); g.addColorStop(0.75, '#9fc0dc'); g.addColorStop(1, horizon);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = horizon; c.fillRect(0, h * 0.5, w, h * 0.5);
    // soft high cloud streaks (nor'west arch feel)
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * w, y = h * (0.18 + Math.random() * 0.26), rw = 80 + Math.random() * 260, rh = 6 + Math.random() * 16;
      const gr = c.createRadialGradient(x, y, 0, x, y, rw);
      gr.addColorStop(0, 'rgba(255,255,255,0.20)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.translate(x, y); c.scale(1, rh / rw); c.translate(-x, -y); c.fillStyle = gr; c.beginPath(); c.arc(x, y, rw, 0, 7); c.fill(); c.restore();
    }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500000, 64, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false }));
  S.scene.add(dome);
  S.scene.background = null;
  const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshBasicMaterial({ color: '#4d6b33' })); ground.rotation.x = -Math.PI / 2; ground.position.y = -5; env.add(ground);
  const pm = new THREE.PMREMGenerator(S.renderer);
  S.scene.environment = pm.fromScene(env).texture;
  return new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth));
}

function grassTexture() {
  const t = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#d9dfcf'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = 70 + Math.random() * 25, hue = 70 + Math.random() * 30;
      c.fillStyle = `hsl(${hue},${12 + Math.random() * 14}%,${l}%)`;
      c.fillRect(x, y, 1.4, 3 + Math.random() * 4);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(900, 900);
  return t;
}

export function terrain(S, size = 60000, seg = 360) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; const col = [];
  const cA = new THREE.Color('#8aa65c'), cB = new THREE.Color('#62853f'), cC = new THREE.Color('#b3ad72'), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, groundY(x, z));
    const n = fbm(x / 900 + 11, z / 900 - 4, 3), m = fbm(x / 240, z / 240, 2);
    tmp.copy(cA).lerp(cB, n).lerp(cC, Math.max(0, m - 0.62) * 1.6);
    col.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = add(S.scene, geo, new THREE.MeshStandardMaterial({ map: grassTexture(), vertexColors: true, roughness: 1 }), [0, 0, 0], [0, 0, 0], false);
  m.receiveShadow = true;
  return m;
}

// Distant ranges with snow above a height
export function ranges(S, { dist = 70000, width = 220000, height = 9000, dir = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(width, 30000, 260, 60); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = [];
  const rock = new THREE.Color('#5d6670'), snow = new THREE.Color('#f2f5f8'), foot = new THREE.Color('#556b4a'), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const ridge = Math.pow(1 - Math.abs(fbm(x / 14000, 3.3, 3) * 2 - 1), 1.6);
    const edge = 1 - Math.min(1, Math.abs(z) / 15000);
    const h = (ridge * 0.8 + fbm(x / 4200, z / 4200, 4) * 0.35) * height * Math.pow(edge, 0.8);
    p.setY(i, h);
    const k = h / height;
    t.copy(foot).lerp(rock, Math.min(1, k * 2.2));
    if (k > 0.55 + fbm(x / 800, z / 800, 2) * 0.15) t.copy(snow);
    col.push(t.r, t.g, t.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const g = new THREE.Group(); g.rotation.y = dir; S.scene.add(g);
  const m = add(g, geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), [0, -1500, -dist], [0, 0, 0], false);
  m.castShadow = false;
  return g;
}

// Cabbage tree (tī kōuka): slender trunk that forks, with spiky leaf heads
export function cabbageTree(S, x, z, scale = 1, seed = 1) {
  const g = new THREE.Group(); g.position.set(x, groundY(x, z), z); g.scale.setScalar(scale); g.rotation.y = seed * 2.3; S.scene.add(g);
  const bark = new THREE.MeshStandardMaterial({ color: '#6e6250', roughness: 1 });
  const leafM = new THREE.MeshStandardMaterial({ color: '#5d6b36', roughness: 0.9, side: THREE.DoubleSide });
  const deadM = new THREE.MeshStandardMaterial({ color: '#9c8a5c', roughness: 1, side: THREE.DoubleSide });
  add(g, new THREE.CylinderGeometry(1.2, 2.2, 32, 10), bark, [0, 16, 0]);
  const heads = [];
  const forks = 2 + (seed % 2);
  for (let k = 0; k < forks; k++) {
    const a = (k / forks) * Math.PI * 2 + seed, tilt = 0.35;
    const br = new THREE.Group(); br.position.set(0, 31, 0); br.rotation.set(Math.cos(a) * tilt, 0, Math.sin(a) * tilt); g.add(br);
    add(br, new THREE.CylinderGeometry(0.7, 1.1, 14, 8), bark, [0, 7, 0]);
    heads.push(br);
  }
  const leaf = new THREE.ConeGeometry(0.35, 9, 3); leaf.translate(0, 4.5, 0);
  for (const br of heads) {
    const head = new THREE.Group(); head.position.set(0, 14, 0); br.add(head);
    for (let i = 0; i < 70; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.random() * 1.6 - 0.25;
      const m = add(head, leaf, i < 12 ? deadM : leafM, [0, 0, 0], [0, 0, 0]);
      m.rotation.set(Math.cos(u) * (Math.PI / 2 - v), 0, Math.sin(u) * (Math.PI / 2 - v));
      if (i < 12) m.rotation.x += Math.PI * 0.75;
    }
  }
  return g;
}

// Post-and-wire fence along a line
export function fence(S, x0, z0, x1, z1, spacing = 30) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / spacing);
  const wood = new THREE.MeshStandardMaterial({ color: '#7a6a55', roughness: 1 });
  const wire = mat.metal('#9aa0a4', 0.4);
  const tops = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = groundY(x, z);
    add(S.scene, new THREE.CylinderGeometry(0.65, 0.75, 13, 7), wood, [x, y + 6.5, z]);
    tops.push([x, y, z]);
  }
  for (const h of [4, 7, 10, 12.4]) {
    for (let i = 0; i < tops.length - 1; i++) {
      const a = tops[i], b = tops[i + 1];
      const curve = new THREE.LineCurve3(new THREE.Vector3(a[0], a[1] + h, a[2]), new THREE.Vector3(b[0], b[1] + h, b[2]));
      add(S.scene, new THREE.TubeGeometry(curve, 1, 0.06, 4, false), wire, [0, 0, 0], [0, 0, 0], false);
    }
  }
}

// Rotomoulded poly water tank, typical NZ rural ~25,000 L: wide, ribbed, domed lid.
// Origin at the base centre. Returns { group, roofY(r) }.
export function polyTank(parent, { R = 17.5, H = 21, color = '#2f4a3a', cut = 0 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const poly = new THREE.MeshPhysicalMaterial({ color, roughness: 0.72, clearcoat: 0.05, clearcoatRoughness: 0.7, envMapIntensity: 0.55, side: THREE.DoubleSide });
  const t0 = cut, tl = Math.PI * 2 - cut * 2;
  add(g, corrugatedCylinder(R, H, 3.0, 0.2, t0, tl), poly, [0, H / 2, 0]);
  // flared base and top shoulder
  add(g, new THREE.CylinderGeometry(R + 0.35, R + 0.7, 1.2, 160, 1, true, t0, tl), poly, [0, 0.6, 0]);
  add(g, new THREE.TorusGeometry(R - 0.2, 0.9, 16, 160, tl), poly, [0, H, 0], [Math.PI / 2, 0, -Math.PI / 2 + t0 - (cut ? 0 : 0)]);
  // dome
  const domeH = 3.2;
  const dome = add(g, new THREE.SphereGeometry(R - 0.2, 120, 24, t0 - Math.PI / 2, tl, 0, Math.PI / 2), poly, [0, H, 0]);
  dome.scale.y = domeH / (R - 0.2);
  // concentric moulded ring and central lid
  add(g, new THREE.TorusGeometry(R * 0.55, 0.18, 10, 120, tl), poly, [0, H + domeH * Math.sqrt(1 - 0.55 * 0.55) + 0.05, 0], [Math.PI / 2, 0, -Math.PI / 2 + t0]);
  if (!cut) {
    add(g, new THREE.CylinderGeometry(3.2, 3.4, 0.9, 48), mat.plastic('#1d2420', 0.55), [0, H + domeH + 0.2, 0]);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(g, new THREE.BoxGeometry(0.4, 0.7, 0.6), mat.plastic('#1d2420', 0.55), [Math.cos(a) * 3.3, H + domeH + 0.25, Math.sin(a) * 3.3], [0, -a, 0]); }
    // inlet strainer
    const ix = R * 0.62, iy = H + domeH * Math.sqrt(1 - 0.62 * 0.62);
    add(g, new THREE.CylinderGeometry(2.2, 2.4, 1.2, 40), mat.plastic('#1d2420', 0.6), [ix, iy + 0.3, -3]);
    add(g, new THREE.CylinderGeometry(1.9, 1.9, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#3a403d', roughness: 0.7, metalness: 0.3 }), [ix, iy + 0.92, -3]);
    // outlet with brass valve
    add(g, new THREE.CylinderGeometry(0.9, 0.9, 2.4, 20), mat.plastic('#1d2420', 0.6), [Math.sin(0.5) * (R + 1), 2.2, Math.cos(0.5) * (R + 1)], [Math.PI / 2, 0.5, 0]);
    add(g, new THREE.BoxGeometry(1.6, 1.6, 1.6), mat.metal('#b88a3a', 0.35), [Math.sin(0.5) * (R + 2.4), 2.2, Math.cos(0.5) * (R + 2.4)], [0, 0.5, 0]);
  }
  const Rd = R - 0.2;
  const roofY = (r) => H + domeH * Math.sqrt(Math.max(0, 1 - (r / Rd) ** 2));
  const roofSlope = (r) => Math.atan((domeH * r / (Rd * Rd)) / Math.sqrt(Math.max(1e-4, 1 - (r / Rd) ** 2)));
  return { group: g, roofY, roofSlope, R, H, domeH };
}

// Instanced grass tufts scattered around a point (foreground texture)
export function grassTufts(S, cx, cz, radius, count, seed = 3) {
  const blade = new THREE.BufferGeometry();
  const pos = [];
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2 + b, lean = 0.25 + (b % 3) * 0.12, h = 1.6 + (b % 4) * 0.5, w = 0.12;
    const dx = Math.cos(a), dz = Math.sin(a);
    pos.push(-w * dz, 0, w * dx, w * dz, 0, -w * dx, dx * lean * h, h, dz * lean * h);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  blade.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide });
  const inst = new THREE.InstancedMesh(blade, m, count);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rnd()) * radius, a = rnd() * Math.PI * 2;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    d.position.set(x, groundY(x, z), z); d.rotation.y = rnd() * 6.28; d.scale.setScalar(0.7 + rnd() * 1.1); d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
    c.setHSL(0.21 + rnd() * 0.06, 0.38 + rnd() * 0.2, 0.26 + rnd() * 0.16); inst.setColorAt(i, c);
  }
  inst.receiveShadow = true;
  S.scene.add(inst);
  return inst;
}
