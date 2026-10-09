// Model of the real Kinetiq tank monitor, based on the prototype photo:
// light grey junction-box enclosure with a screw-down front lid, a small solar
// panel on a tilted mount on top, a swivel antenna on the side, a cable gland
// underneath, and a cable down to a stainless submersible pressure probe.
import { THREE, mat, add, canvasTex } from './studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BOX = { w: 1.5, h: 1.15, d: 1.2 };

const enclosure = () => mat.plastic('#d9dcdc', 0.5);

function solarTexture() {
  return canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#0d1424'; c.fillRect(0, 0, w, h);
    const n = 6, pad = 36, gap = 10, cs = (w - pad * 2 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = pad + i * (cs + gap), y = pad + j * (cs + gap);
      const g = c.createLinearGradient(x, y, x + cs, y + cs);
      g.addColorStop(0, '#1d2f55'); g.addColorStop(1, '#14223f');
      c.fillStyle = g; c.fillRect(x, y, cs, cs);
      c.strokeStyle = 'rgba(160,175,200,0.55)'; c.lineWidth = 2;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + (cs * k) / 4, y); c.lineTo(x + (cs * k) / 4, y + cs); c.stroke(); }
      c.strokeStyle = 'rgba(90,110,140,0.35)'; c.lineWidth = 1;
      for (let k = 1; k < 12; k++) { c.beginPath(); c.moveTo(x, y + (cs * k) / 12); c.lineTo(x + cs, y + (cs * k) / 12); c.stroke(); }
    }
  });
}

export function solarPanel() {
  const g = new THREE.Group();
  const top = new THREE.MeshPhysicalMaterial({ map: solarTexture(), roughness: 0.18, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const side = mat.metal('#aeb4b8', 0.35);
  add(g, new THREE.BoxGeometry(1.55, 0.06, 1.45), [side, side, top, mat.plastic('#2a2f34'), side, side], [0, 0, 0.725]);
  return g;
}

export function antenna(len = 1.9) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.14, 24), mat.metal('#c9a64e', 0.25), [0, 0.07, 0]);
  add(g, new THREE.SphereGeometry(0.085, 20, 12), mat.rubber('#14171a'), [0, 0.2, 0]);
  add(g, new THREE.CylinderGeometry(0.035, 0.065, len, 24), mat.rubber('#14171a'), [0, 0.2 + len / 2, 0]);
  add(g, new THREE.SphereGeometry(0.036, 16, 8), mat.rubber('#14171a'), [0, 0.2 + len, 0]);
  return g;
}

// The enclosure assembly. Origin at the centre of the base.
export function unit({ lidOffset = 0, panelLift = 0, panelAngle = 0.62, showLogo = true } = {}) {
  const g = new THREE.Group();
  const { w, h, d } = BOX;
  add(g, new RoundedBoxGeometry(w, h, d - 0.1, 6, 0.08), enclosure(), [0, h / 2, -0.05]);
  // front lid with corner screws
  const lid = new THREE.Group(); lid.position.set(0, h / 2, d / 2 - 0.02 + lidOffset); g.add(lid);
  add(lid, new RoundedBoxGeometry(w + 0.03, h + 0.03, 0.14, 6, 0.06), mat.plastic('#e1e3e3', 0.45));
  for (const [x, y] of [[-0.6, -0.44], [0.6, -0.44], [-0.6, 0.44], [0.6, 0.44]]) {
    add(lid, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), mat.plastic('#c4c8c9', 0.4), [x, y, 0.075], [Math.PI / 2, 0, 0], false);
    add(lid, new THREE.BoxGeometry(0.06, 0.012, 0.01), mat.plastic('#8f9597', 0.5), [x, y, 0.091], [0, 0, 0.6], false);
  }
  if (showLogo) {
    const t = canvasTex(512, 128, (c, W, H) => {
      c.fillStyle = '#e1e3e3'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#7a1f2b'; c.font = '800 66px Inter'; c.fillText('KINETIQ', 26, 84);
      c.fillStyle = '#6c777e'; c.font = '600 28px Inter'; c.fillText('TANK', 330, 62); c.fillText('MONITOR', 330, 94);
    });
    add(lid, new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), [0, -0.1, 0.0705], [0, 0, 0], false);
    add(lid, new THREE.CircleGeometry(0.035, 20), mat.glow('#3fbf7f', 2.2), [0.55, 0.3, 0.071], [0, 0, 0], false);
  }
  // solar panel on a tilted mount: hinged at the front edge, propped up on two posts at the back
  const mount = new THREE.Group(); mount.position.set(0, h + 0.05 + panelLift, d / 2 - 0.12); g.add(mount);
  const pivot = new THREE.Group(); pivot.rotation.x = panelAngle; mount.add(pivot);
  const sp = solarPanel(); sp.rotation.y = Math.PI; pivot.add(sp);
  add(g, new THREE.BoxGeometry(1.3, 0.05, 0.12), mat.plastic('#2a2f34', 0.5), [0, h + 0.025, d / 2 - 0.12]);
  if (panelLift === 0) {
    const backZ = d / 2 - 0.12 - 1.45 * Math.cos(panelAngle);
    const backY = 1.45 * Math.sin(panelAngle);
    for (const x of [-0.6, 0.6]) add(g, new THREE.BoxGeometry(0.05, backY, 0.08), mat.metal('#9aa2a7', 0.35), [x, h + 0.05 + backY / 2 - 0.02, backZ + 0.06]);
  }
  // antenna on the right-hand side, leaning out
  const ant = antenna(); ant.position.set(w / 2 + 0.02, h * 0.72, 0.1); ant.rotation.z = -0.55; g.add(ant);
  // cable gland underneath
  add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.12, 6), mat.plastic('#2a2f34', 0.5), [0.35, -0.04, 0.05]);
  add(g, new THREE.CylinderGeometry(0.09, 0.1, 0.1, 24), mat.plastic('#2a2f34', 0.5), [0.35, -0.13, 0.05]);
  return g;
}

// Stainless submersible pressure probe, vertical, origin at its top.
export function probe() {
  const g = new THREE.Group();
  const ss = mat.metal('#d3d7da', 0.2);
  add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.22, 24), mat.rubber('#14171a'), [0, -0.11, 0]);
  add(g, new THREE.CylinderGeometry(0.13, 0.13, 1.0, 40), ss, [0, -0.72, 0]);
  add(g, new THREE.CylinderGeometry(0.135, 0.135, 0.06, 40), ss, [0, -0.24, 0]);
  for (let k = 0; k < 4; k++) add(g, new THREE.TorusGeometry(0.128, 0.012, 8, 40), mat.metal('#a9afb3', 0.3), [0, -1.25 - k * 0.07, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.125, 0.11, 0.32, 40), ss, [0, -1.37, 0]);
  return g;
}

export function cable(parent, points, r = 0.035) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, Math.max(60, points.length * 24), r, 10, false), mat.rubber('#101316'));
}

// Loose coil of cable lying on the floor (like the photo)
export function coilPoints(cx, cz, rx = 1.5, rz = 1.1, turns = 4, y = 0.04) {
  const pts = [];
  const n = turns * 36;
  for (let i = 0; i <= n; i++) {
    const t = (i / 36) * Math.PI * 2;
    const wob = 1 + Math.sin(i * 0.37) * 0.04 + (i / n) * 0.12;
    pts.push([cx + Math.cos(t) * rx * wob, y + (i / n) * 0.06 + Math.abs(Math.sin(t * 0.5)) * 0.02, cz + Math.sin(t) * rz * wob]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Version 2, matched to the product photos: a white two-part enclosure (base
// and shallower lid with a seam), a black framed solar panel fixed on the lid
// with a small gap, a rubber whip antenna on an SMA knuckle at the back-right
// corner, the probe cable leaving the back, and a stainless probe with a hex
// collar and red O-ring at the cable end.
export const BOX2 = { w: 1.45, h: 0.6, d: 1.12 };

function stripPanelTexture() {
  return canvasTex(1024, 832, (c, w, h) => {
    c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    const rows = 4, pad = 34, gap = 12, rh = (h - pad * 2 - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      const y = pad + r * (rh + gap);
      const g = c.createLinearGradient(0, y, 0, y + rh); g.addColorStop(0, '#141a22'); g.addColorStop(1, '#0d1117');
      c.fillStyle = g; c.fillRect(pad, y, w - pad * 2, rh);
      c.strokeStyle = 'rgba(150,160,175,0.16)'; c.lineWidth = 1.4;
      for (let x = pad + 7; x < w - pad; x += 7) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + rh); c.stroke(); }
      c.strokeStyle = 'rgba(170,180,195,0.28)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(pad, y + rh / 2); c.lineTo(w - pad, y + rh / 2); c.stroke();
    }
  });
}

function roundedPlate(w, d, t, r) {
  const sh = new THREE.Shape(), x = -w / 2, z = -d / 2;
  sh.moveTo(x + r, z); sh.lineTo(x + w - r, z); sh.quadraticCurveTo(x + w, z, x + w, z + r); sh.lineTo(x + w, z + d - r);
  sh.quadraticCurveTo(x + w, z + d, x + w - r, z + d); sh.lineTo(x + r, z + d); sh.quadraticCurveTo(x, z + d, x, z + d - r);
  sh.lineTo(x, z + r); sh.quadraticCurveTo(x, z, x + r, z);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10 });
  geo.rotateX(Math.PI / 2); geo.translate(0, t, 0);
  return geo;
}

export function whip(len = 1.75) {
  const g = new THREE.Group(), rb = mat.rubber('#121417');
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.07, 6), mat.metal('#c9a64e', 0.25), [0, 0.035, 0]);
  add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.2, 24), rb, [0, 0.17, 0]);
  for (let k = 0; k < 5; k++) add(g, new THREE.TorusGeometry(0.07, 0.008, 6, 24), rb, [0, 0.1 + k * 0.035, 0], [Math.PI / 2, 0, 0]);
  const rod = new THREE.Group(); rod.position.y = 0.29; g.add(rod);
  add(rod, new THREE.SphereGeometry(0.065, 20, 12), rb);
  add(rod, new THREE.CylinderGeometry(0.03, 0.06, len, 24), rb, [0, len / 2, 0]);
  add(rod, new THREE.SphereGeometry(0.031, 12, 8), rb, [0, len, 0]);
  g.userData.rod = rod;
  return g;
}

export function unit2({ lidOffset = 0, panelLift = 0, showLogo = false } = {}) {
  const g = new THREE.Group();
  const { w, h, d } = BOX2;
  const white = mat.plastic('#eceeee', 0.5);
  const hb = h * 0.6, hl = h * 0.4;
  add(g, new RoundedBoxGeometry(w, hb, d, 6, 0.07), white, [0, hb / 2, 0]);
  const lid = new THREE.Group(); lid.position.set(0, hb + 0.012 + lidOffset, 0); g.add(lid);
  add(lid, new RoundedBoxGeometry(w + 0.03, hl, d + 0.03, 6, 0.07), mat.plastic('#f0f2f2', 0.48), [0, hl / 2, 0]);
  // seam between base and lid
  add(g, new RoundedBoxGeometry(w - 0.03, 0.03, d - 0.03, 2, 0.01), mat.plastic('#9da3a5', 0.6), [0, hb + 0.006, 0], [0, 0, 0], false);
  // black framed solar panel on low standoffs, slightly larger than the lid
  const panel = new THREE.Group(); panel.position.set(0, h + 0.04 + panelLift + lidOffset, 0); g.add(panel);
  const frame = mat.plastic('#0c0e10', 0.35);
  add(panel, roundedPlate(w + 0.08, d + 0.06, 0.045, 0.07), frame, [0, 0, 0]);
  const glass = new THREE.MeshPhysicalMaterial({ map: stripPanelTexture(), roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.5 });
  add(panel, new THREE.PlaneGeometry(w - 0.02, d - 0.06), glass, [0, 0.057, 0], [-Math.PI / 2, 0, 0], false);
  for (const [x, z] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12), mat.metal('#9aa2a7', 0.3), [x, h + 0.02 + lidOffset, z], [0, 0, 0], false);
  // SMA knuckle at the back-right corner, antenna standing up
  const ant = new THREE.Group(); ant.position.set(w / 2 + 0.03, h - 0.05 + lidOffset, -d / 2 + 0.12); g.add(ant);
  add(ant, new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), mat.metal('#c9a64e', 0.25), [0.03, 0, 0], [0, 0, Math.PI / 2]);
  const wp = whip(); wp.position.set(0.12, -0.02, 0); wp.rotation.z = -0.08; ant.add(wp);
  // cable gland on the back face, low
  add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.08, 6), mat.plastic('#e2e5e5', 0.5), [0.35, hb * 0.35, -d / 2 - 0.04], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.05, 0.065, 0.08, 20), mat.plastic('#e2e5e5', 0.5), [0.35, hb * 0.35, -d / 2 - 0.11], [Math.PI / 2, 0, 0]);
  g.userData.glandOut = new THREE.Vector3(0.35, hb * 0.35, -d / 2 - 0.16);
  if (showLogo) add(g, new THREE.CircleGeometry(0.02, 20), mat.glow('#3fbf7f', 2), [0.58, hb * 0.5, d / 2 + 0.002], [0, 0, 0], false);
  return g;
}

// Stainless probe: long smooth body, rounded nose, hex collar and red O-ring
// at the cable end. Origin at the cable end, pointing -Y.
export function probe2() {
  const g = new THREE.Group();
  const ss = mat.metal('#d9dde0', 0.14);
  add(g, new THREE.SphereGeometry(0.085, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ss, [0, -0.02, 0]);
  add(g, new THREE.CylinderGeometry(0.085, 0.085, 0.04, 6), ss, [0, -0.05, 0]);
  add(g, new THREE.TorusGeometry(0.083, 0.009, 8, 40), mat.plastic('#a3232c', 0.4), [0, -0.085, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.095, 0.095, 0.1, 6), ss, [0, -0.14, 0]);
  add(g, new THREE.CylinderGeometry(0.1, 0.095, 0.08, 40), ss, [0, -0.23, 0]);
  add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.9, 40), ss, [0, -0.72, 0]);
  add(g, new THREE.SphereGeometry(0.1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ss, [0, -1.17, 0]);
  return g;
}
