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
// Version 2, closer to the prototype photo: a shallower junction box with the
// lid on top, a plain black solar panel fixed flush on the lid (slightly larger
// than the box), a tapered rubber antenna on a knuckle at the side, a cable
// gland on the side, and a smooth stainless probe with a stepped, grooved nose.
export const BOX2 = { w: 1.4, h: 0.72, d: 1.15 };

function blackPanelTexture() {
  return canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#07090c'; c.fillRect(0, 0, w, h);
    // monocrystalline cells: very dark, faint busbars
    const n = 4, pad = 40, gap = 8, cs = (w - pad * 2 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = pad + i * (cs + gap), y = pad + j * (cs + gap);
      c.fillStyle = '#0d1117'; c.fillRect(x, y, cs, cs);
      c.strokeStyle = 'rgba(120,130,145,0.18)'; c.lineWidth = 2;
      for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(x + (cs * k) / 3, y); c.lineTo(x + (cs * k) / 3, y + cs); c.stroke(); }
    }
  });
}

export function unit2({ lidOffset = 0, panelLift = 0, showLogo = true } = {}) {
  const g = new THREE.Group();
  const { w, h, d } = BOX2;
  const body = mat.plastic('#e4e6e6', 0.55);
  add(g, new RoundedBoxGeometry(w, h * 0.78, d, 6, 0.06), body, [0, h * 0.39, 0]);
  // lid with a visible seam line
  const lid = new THREE.Group(); lid.position.set(0, h * 0.78 + 0.004 + lidOffset, 0); g.add(lid);
  add(lid, new RoundedBoxGeometry(w + 0.02, h * 0.22, d + 0.02, 6, 0.05), mat.plastic('#e9ebeb', 0.5), [0, h * 0.11, 0]);
  add(g, new THREE.BoxGeometry(w + 0.025, 0.012, d + 0.025), mat.plastic('#b9bebf', 0.6), [0, h * 0.78, 0], [0, 0, 0], false);
  // screws in the lid corners (visible from above beside the panel overhang)
  for (const [x, z] of [[-0.6, -0.48], [0.6, -0.48], [-0.6, 0.48], [0.6, 0.48]]) add(lid, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), mat.plastic('#c7cbcc', 0.4), [x, h * 0.22 + 0.006, z], [0, 0, 0], false);
  // black solar panel fixed flush on the lid, overhanging slightly
  const panel = new THREE.Group(); panel.position.set(0, h + 0.03 + panelLift + lidOffset, 0); g.add(panel);
  const top = new THREE.MeshPhysicalMaterial({ map: blackPanelTexture(), roughness: 0.2, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 0.35 });
  const edge = mat.plastic('#121417', 0.4);
  add(panel, new THREE.BoxGeometry(1.62, 0.05, 1.42), [edge, edge, top, edge, edge, edge]);
  // logo on the front of the body
  if (showLogo) {
    const t = canvasTex(512, 96, (c, W, H) => { c.fillStyle = '#e4e6e6'; c.fillRect(0, 0, W, H); c.fillStyle = '#7a1f2b'; c.font = '800 60px Inter'; c.fillText('KINETIQ', 18, 70); });
    add(g, new THREE.PlaneGeometry(0.62, 0.115), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }), [-0.28, h * 0.4, d / 2 + 0.002], [0, 0, 0], false);
    add(g, new THREE.CircleGeometry(0.028, 20), mat.glow('#3fbf7f', 2.2), [0.55, h * 0.55, d / 2 + 0.003], [0, 0, 0], false);
  }
  // antenna: knuckle on the right-hand side, angled up and out
  const ant = new THREE.Group(); ant.position.set(w / 2 + 0.02, h * 0.5, 0.15); g.add(ant);
  add(ant, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 24), mat.rubber('#14171a'), [0.04, 0, 0], [0, 0, Math.PI / 2]);
  const rod = new THREE.Group(); rod.position.set(0.1, 0, 0); rod.rotation.z = -0.62; ant.add(rod);
  add(rod, new THREE.SphereGeometry(0.075, 20, 12), mat.rubber('#14171a'));
  add(rod, new THREE.CylinderGeometry(0.022, 0.07, 1.9, 24), mat.rubber('#14171a'), [0, 0.95, 0]);
  add(rod, new THREE.SphereGeometry(0.024, 12, 8), mat.rubber('#14171a'), [0, 1.9, 0]);
  // cable gland on the left side, near the bottom
  add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.1, 6), mat.plastic('#2a2f34', 0.5), [-w / 2 - 0.05, h * 0.25, 0.1], [0, 0, Math.PI / 2]);
  add(g, new THREE.CylinderGeometry(0.06, 0.075, 0.1, 20), mat.plastic('#2a2f34', 0.5), [-w / 2 - 0.13, h * 0.25, 0.1], [0, 0, Math.PI / 2]);
  g.userData.glandOut = new THREE.Vector3(-w / 2 - 0.2, h * 0.25, 0.1);
  return g;
}

// Smooth stainless probe with a stepped, grooved nose. Origin at the cable end, pointing -Y.
export function probe2() {
  const g = new THREE.Group();
  const ss = mat.metal('#d6dadd', 0.16);
  add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.9, 40), ss, [0, -0.45, 0]);
  add(g, new THREE.CylinderGeometry(0.1, 0.075, 0.04, 40), ss, [0, -0.92, 0]);
  add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.14, 40), ss, [0, -1.01, 0]);
  add(g, new THREE.TorusGeometry(0.072, 0.008, 8, 40), mat.metal('#8e959a', 0.35), [0, -0.99, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 6), ss, [0, -1.095, 0]);
  add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.01, 40), mat.metal('#b4babe', 0.25), [0, -0.005, 0]);
  return g;
}
