// Custom machine design service image: several clean, simple takes (?v=1..5),
// each a recognisable piece of machine design in aluminium, dark anodised
// steel and a single maroon accent. Shared dark service studio and backdrop.
import { studio, THREE, mat, add, gearGeo } from '../studio.js';
import { SERVICE_STUDIO } from '../service-studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const alu = mat.metal('#c9cfd3', 0.3), aluDark = mat.metal('#9aa3a9', 0.38), steel = mat.metal('#d4d9dc', 0.22);
const anod = new THREE.MeshPhysicalMaterial({ color: '#2a2f34', metalness: 0.5, roughness: 0.42, clearcoat: 0.3 });
const maroon = new THREE.MeshPhysicalMaterial({ color: '#7a1f2b', metalness: 0.55, roughness: 0.32, clearcoat: 0.4 });
const rb = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 4, r);
const cyl = (r, l, n = 48) => new THREE.CylinderGeometry(r, r, l, n);
const X = [0, 0, Math.PI / 2], Z = [Math.PI / 2, 0, 0];

// 40-series style T-slot aluminium profile, length L along the given axis
function profile(parent, L, axis, pos, s = 0.36) {
  const h = s / 2, w = s * 0.14, d = s * 0.2, pts = [];
  for (let k = 0; k < 4; k++) {
    const c = Math.cos(k * Math.PI / 2), sn = Math.sin(k * Math.PI / 2);
    for (const [x, y] of [[-h, -h], [-w, -h], [-w, -h + d], [w, -h + d], [w, -h]]) pts.push(new THREE.Vector2(x * c - y * sn, x * sn + y * c));
  }
  const shape = new THREE.Shape(pts), hole = new THREE.Path(); hole.absarc(0, 0, s * 0.11, 0, Math.PI * 2, true); shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 24 });
  g.translate(0, 0, -L / 2);
  if (axis === 'x') g.rotateY(Math.PI / 2); if (axis === 'y') g.rotateX(Math.PI / 2);
  return add(parent, g, alu, pos);
}

// AC servo motor, shaft pointing +x, axis at the group's origin
function servo(parent, len = 1.3, s = 0.8, pos = [0, 0, 0], rotY = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; parent.add(g);
  add(g, rb(len, s, s, 0.06), anod, [-len / 2, 0, 0]);
  add(g, rb(0.12, s + 0.1, s + 0.1, 0.03), aluDark, [0.06, 0, 0]);
  for (const [y, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(g, cyl(0.035, 0.03, 16), steel, [0.125, y * (s / 2 - 0.02), z * (s / 2 - 0.02)], X);
  add(g, cyl(s * 0.24, 0.06), aluDark, [0.15, 0, 0], X);
  add(g, cyl(s * 0.11, 0.42, 32), steel, [0.33, 0, 0], X);
  add(g, rb(0.32, s - 0.06, s - 0.06, 0.08), mat.plastic('#1b1f23', 0.5), [-len - 0.14, 0, 0]);
  add(g, rb(0.3, 0.16, 0.26, 0.03), mat.plastic('#1b1f23', 0.5), [-len * 0.55, s / 2 + 0.07, 0]);
  add(g, rb(0.36, 0.012, 0.22, 0.004), maroon, [-len * 0.3, s / 2 + 0.003, 0]);
  return g;
}

// pillow-block bearing for a shaft along x at height y
function pillow(parent, x, y, z = 0) {
  add(parent, rb(0.34, 0.16, 1.0, 0.03), aluDark, [x, 0.08, z]);
  add(parent, rb(0.3, y - 0.08, 0.5, 0.03), aluDark, [x, (y - 0.08) / 2 + 0.08, z]);
  add(parent, cyl(0.3, 0.34), aluDark, [x, y, z], X);
  add(parent, cyl(0.16, 0.36), steel, [x, y, z], X);
  for (const s of [-1, 1]) add(parent, cyl(0.06, 0.05, 6), steel, [x, 0.18, z + s * 0.38]);
}

const V = {
  // 1. servo motor with an inline planetary gearbox, output shaft keyed
  1: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.5; g.position.set(0.2, 0.45, 0); S.scene.add(g);
    servo(g, 1.5, 0.9, [-0.2, 0, 0]);
    add(g, cyl(0.48, 0.5), alu, [0.45, 0, 0], X);
    add(g, cyl(0.5, 0.1), maroon, [0.75, 0, 0], X);
    add(g, cyl(0.42, 0.36), alu, [0.98, 0, 0], X);
    add(g, cyl(0.3, 0.12), aluDark, [1.22, 0, 0], X);
    add(g, cyl(0.15, 0.6, 40), steel, [1.55, 0, 0], X);
    add(g, new THREE.BoxGeometry(0.4, 0.05, 0.08), anod, [1.6, 0.15, 0]);
    // the servo's own shaft hides inside the gearbox
    return { cam: [0.6, 3.0, 5.2], target: [-0.1, 0.35, 0] };
  },
  // 2. linear actuator module: profile body, servo drive, maroon carriage
  2: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.38; S.scene.add(g);
    const L = 4.6, y = 0.22;
    add(g, rb(L, 0.44, 0.9, 0.05), alu, [0, y, 0]);
    for (const z of [-0.36, 0.36]) add(g, new THREE.BoxGeometry(L - 0.1, 0.02, 0.03), aluDark, [0, y + 0.221, z], [0, 0, 0], false);
    for (const z of [-0.47, 0.47]) for (const yy of [0.12, 0.32]) add(g, new THREE.BoxGeometry(L - 0.2, 0.03, 0.02), aluDark, [0, yy, z], [0, 0, 0], false);
    add(g, new THREE.BoxGeometry(L - 0.3, 0.012, 0.3), mat.metal('#e2e6e8', 0.15), [0, y + 0.226, 0]);
    for (const s of [-1, 1]) add(g, rb(0.2, 0.5, 0.96, 0.04), anod, [s * (L / 2 + 0.1), 0.25, 0]);
    add(g, rb(0.5, 0.6, 0.6, 0.04), aluDark, [-L / 2 - 0.45, 0.3, 0]);
    servo(g, 1.0, 0.56, [-L / 2 - 0.7, 0.3, 0]);
    add(g, rb(1.0, 0.2, 1.0, 0.04), alu, [0.5, 0.55, 0]);
    add(g, rb(0.96, 0.06, 0.96, 0.02), maroon, [0.5, 0.68, 0]);
    for (const [x, z] of [[-0.32, -0.32], [-0.32, 0.32], [0.32, -0.32], [0.32, 0.32]]) add(g, cyl(0.04, 0.03, 16), steel, [0.5 + x, 0.72, z]);
    return { cam: [1.2, 4.4, 7.4], target: [-0.1, 0.3, 0] };
  },
  // 3. a single gear pair, cleanly finished: steel wheel and maroon pinion on collared shafts
  3: (S) => {
    const gear = (t, ro, rr, x, z, m, rot, hub) => {
      add(S.scene, gearGeo(t, ro, rr, 0.3, 0.16), m, [x, 0.5, z], [-Math.PI / 2, 0, rot]);
      add(S.scene, cyl(hub, 0.5), steel, [x, 0.25, z]);
      add(S.scene, cyl(hub + 0.06, 0.16), aluDark, [x, 0.88, z]);
      add(S.scene, cyl(0.14, 0.5, 32), steel, [x, 1.0, z]);
    };
    gear(40, 1.6, 1.48, -0.75, 0, steel, 0, 0.36);
    gear(20, 0.84, 0.72, 1.48, 0.2, maroon, 0.08, 0.26);
    return { cam: [0.4, 4.8, 6.4], target: [0.15, 0.4, 0.1] };
  },
  // 4. a T-slot aluminium machine frame with a gantry axis and servo
  4: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.5; S.scene.add(g);
    const W = 3.2, D = 1.8, H = 1.7, s = 0.36, h = s / 2;
    for (const x of [-W / 2 + h, W / 2 - h]) for (const z of [-D / 2 + h, D / 2 - h]) profile(g, H, 'y', [x, H / 2, z]);
    for (const y of [h, H - h]) {
      for (const z of [-D / 2 + h, D / 2 - h]) profile(g, W - 2 * s, 'x', [0, y, z]);
      for (const x of [-W / 2 + h, W / 2 - h]) profile(g, D - 2 * s, 'z', [x, y, 0]);
    }
    // corner brackets on the top frame
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(g, new THREE.BoxGeometry(0.3, 0.03, 0.3), aluDark, [x * (W / 2 - s - 0.14), H + 0.012, z * (D / 2 - h)], [0, 0, 0], false);
    // rail and carriage along the front top member
    add(g, new THREE.BoxGeometry(W - 0.9, 0.1, 0.16), steel, [0, H + 0.05, D / 2 - h]);
    add(g, rb(0.7, 0.18, 0.5, 0.03), alu, [0.3, H + 0.18, D / 2 - h]);
    add(g, rb(0.68, 0.05, 0.48, 0.015), maroon, [0.3, H + 0.29, D / 2 - h]);
    servo(g, 0.8, 0.46, [-W / 2 - 0.42, H - h, D / 2 - h]);
    add(g, rb(0.36, 0.5, 0.5, 0.03), aluDark, [-W / 2 - 0.05, H - h, D / 2 - h]);
    // adjustable feet
    for (const x of [-W / 2 + h, W / 2 - h]) for (const z of [-D / 2 + h, D / 2 - h]) add(g, cyl(0.2, 0.06), anod, [x, 0.0, z]);
    return { cam: [1.4, 4.8, 8.2], target: [0.6, 0.8, 0] };
  },
  // 5. a drive train: servo, jaw coupling, shaft in two pillow blocks, maroon gear
  5: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.45; S.scene.add(g);
    const y = 0.75;
    add(g, rb(0.7, 0.75, 1.0, 0.04), aluDark, [-2.1, 0.375, 0]);
    servo(g, 1.3, 0.8, [-1.7, y + 0.03, 0]);
    add(g, cyl(0.28, 0.3), alu, [-1.15, y, 0], X);
    add(g, cyl(0.29, 0.08), maroon, [-0.96, y, 0], X);
    add(g, cyl(0.28, 0.3), alu, [-0.77, y, 0], X);
    add(g, cyl(0.12, 3.2, 40), steel, [0.9, y, 0], X);
    pillow(g, -0.25, y); pillow(g, 1.45, y);
    add(g, gearGeo(30, 0.7, 0.6, 0.26, 0.12), maroon, [0.55, y, 0], [0, Math.PI / 2, 0]);
    add(g, cyl(0.2, 0.2), steel, [0.45, y, 0], X);
    add(g, cyl(0.2, 0.12, 6), steel, [2.4, y, 0], X);
    return { cam: [0.6, 4.2, 7.2], target: [-0.3, 0.5, 0] };
  },
};

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ ...SERVICE_STUDIO, w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), cam: [0, 3, 6], target: [0, 0.8, 0], aperture: 0.04, samples: +(q.get('n') || 56) });
  const view = V[+(q.get('v') || 1)](S);
  S.camPos.set(...view.cam); S.target.set(...view.target);
  S.finish();
}
