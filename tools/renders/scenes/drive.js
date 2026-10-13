// Custom machine design service image, round two (?v=1..5): the servo motor and
// planetary gearbox the owner picked, each time driving the original spur gears
// (steel wheel, maroon pinion). Shared dark service studio and backdrop.
import { studio, THREE, mat, add, gearGeo } from '../studio.js';
import { SERVICE_STUDIO } from '../service-studio.js';
import { alu, aluDark, steel, anod, maroon, rb, cyl, X, servo, pillow } from './machine.js';

// servo + inline gearbox along +x, axis at the group origin; returns the output shaft group
function drive(parent, pos, rotY = 0, rotZ = 0, explode = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; g.rotation.z = rotZ; parent.add(g);
  servo(g, 1.5, 0.9, [-0.2 - explode * 1.4, 0, 0]);
  const e = explode;
  add(g, cyl(0.48, 0.5), alu, [0.45 + e * 0.2, 0, 0], X);
  add(g, cyl(0.5, 0.1), maroon, [0.75 + e * 0.2, 0, 0], X);
  add(g, cyl(0.42, 0.36), alu, [0.98 + e * 0.2, 0, 0], X);
  add(g, cyl(0.3, 0.12), aluDark, [1.22 + e * 0.2, 0, 0], X);
  return g;
}
// spur gear in the plane normal to x (shaft along x), centred on its face at pos
function gearX(parent, t, ro, rr, w, m, pos, hub = 0.22) {
  add(parent, gearGeo(t, ro, rr, w, 0.1), m, [pos[0] - w / 2, pos[1], pos[2]], [0, Math.PI / 2, 0]);
  add(parent, cyl(hub, w + 0.16), aluDark, pos, X);
}
// flat gear (shaft vertical), bottom face at y
function gearY(parent, t, ro, rr, w, m, pos, hub = 0.24) {
  add(parent, gearGeo(t, ro, rr, w, 0.12), m, pos, [-Math.PI / 2, 0, 0]);
  add(parent, cyl(hub, 0.14), aluDark, [pos[0], pos[1] + w + 0.07, pos[2]]);
  add(parent, cyl(0.12, 0.2, 32), steel, [pos[0], pos[1] + w + 0.18, pos[2]]);
}
const foot = (parent, x, y, z = 0, w = 1.2, d = 1.1) => add(parent, rb(w, y, d, 0.04), aluDark, [x, y / 2, z]);

const V = {
  // 1. horizontal drive on a foot; maroon pinion drives the steel wheel on its own shaft and bearing
  1: (S) => {
    const R = new THREE.Group(); R.rotation.y = -0.5; S.scene.add(R);
    const y = 1.1;
    foot(R, -0.85, y - 0.45);
    drive(R, [0, y, 0]);
    add(R, cyl(0.12, 0.7, 32), steel, [1.6, y, 0], X);
    gearX(R, 18, 0.5, 0.42, 0.3, maroon, [1.62, y, 0]);
    const zc = -1.4;
    gearX(R, 36, 1.0, 0.92, 0.3, steel, [1.62, y, zc], 0.3);
    add(R, cyl(0.12, 1.4, 32), steel, [1.2, y, zc], X);
    pillow(R, 0.7, y, zc);
    return { cam: [1.6, 4.4, 6.6], target: [0.45, 0.8, -0.6] };
  },
  // 2. motor standing upright with the gears lying flat on top, like the original image
  2: (S) => {
    const R = new THREE.Group(); R.rotation.y = 0.35; S.scene.add(R);
    const H = 1.85;
    drive(R, [0, H, 0], 0, Math.PI / 2);
    add(R, cyl(0.12, 0.5, 32), steel, [0, H + 1.45, 0]);
    gearY(R, 18, 0.5, 0.42, 0.28, maroon, [0, H + 1.4, 0], 0.2);
    // steel wheel on a post with a base flange
    const x = 1.42, top = H + 1.4;
    add(R, cyl(0.16, top, 32), alu, [x, top / 2, 0]);
    add(R, cyl(0.45, 0.08), aluDark, [x, 0.04, 0]);
    gearY(R, 36, 1.0, 0.92, 0.28, steel, [x, top, 0], 0.3);
    return { cam: [1.6, 6.0, 9.2], target: [0.95, 1.85, 0] };
  },
  // 3. gear plate: drive bolted behind an upright plate, the original three-gear train on its face
  3: (S) => {
    const R = new THREE.Group(); R.rotation.y = 0.12; S.scene.add(R);
    const px = 0.0;
    add(R, rb(0.16, 3.8, 3.6, 0.04), alu, [px, 1.9, 0.1]);
    add(R, rb(1.0, 0.12, 3.6, 0.03), aluDark, [px - 0.3, 0.06, 0.1]);
    for (const z of [-1.5, 1.7]) add(R, rb(0.6, 0.6, 0.1, 0.02), aluDark, [px - 0.32, 0.4, z]);
    drive(R, [px - 1.4, 1.1, -0.6]);
    const fx = px + 0.08;
    add(R, cyl(0.1, 0.5, 24), steel, [fx + 0.2, 1.1, -0.6], X);
    gearX(R, 18, 0.5, 0.42, 0.24, maroon, [fx + 0.2, 1.1, -0.6], 0.18);
    gearX(R, 36, 1.0, 0.92, 0.24, steel, [fx + 0.2, 1.1 + 0.55, -0.6 + 1.33], 0.28);
    gearX(R, 24, 0.68, 0.6, 0.24, steel, [fx + 0.2, 1.1 + 1.85, -0.6 + 0.25], 0.22);
    return { cam: [5.0, 4.8, 7.8], target: [0.05, 1.6, -0.05] };
  },
  // 4. rack and pinion: the maroon pinion drives a steel rack
  4: (S) => {
    const R = new THREE.Group(); R.rotation.y = -0.55; S.scene.add(R);
    const y = 1.1, rp = 0.46;
    foot(R, -0.85, y - 0.45);
    drive(R, [0, y, 0]);
    add(R, cyl(0.12, 0.7, 32), steel, [1.6, y, 0], X);
    gearX(R, 18, 0.5, 0.42, 0.3, maroon, [1.62, y, 0]);
    const top = y - rp - 0.04, L = 3.2;
    add(R, rb(0.42, top - 0.1, L, 0.02), steel, [1.62, (top - 0.1) / 2, 0.6]);
    const pitch = (2 * Math.PI * rp) / 18;
    for (let k = 0; k < Math.floor(L / pitch); k++) add(R, new THREE.BoxGeometry(0.42, 0.12, pitch * 0.45), steel, [1.62, top - 0.04, 0.6 - L / 2 + pitch * (k + 0.5)]);
    return { cam: [2.2, 4.6, 7.6], target: [1.15, 0.55, 0.4] };
  },
  // 5. exploded assembly: motor, gearbox, pinion and wheel pulled apart along the axis
  5: (S) => {
    const R = new THREE.Group(); R.rotation.y = -0.45; S.scene.add(R);
    const y = 0.75;
    drive(R, [-0.6, y, 0], 0, 0, 1);
    add(R, cyl(0.15, 0.6, 40), steel, [1.25, y, 0], X);
    add(R, new THREE.BoxGeometry(0.4, 0.05, 0.08), anod, [1.3, y + 0.15, 0]);
    gearX(R, 18, 0.5, 0.42, 0.3, maroon, [2.0, y, 0], 0.2);
    gearX(R, 36, 1.0, 0.92, 0.3, steel, [2.0, y + 0.0, -1.42], 0.3);
    add(R, cyl(0.12, 0.8, 32), steel, [2.0, y, -1.42], X);
    // thin assembly axis line
    add(R, cyl(0.008, 5.6, 8), mat.glow('#7a1f2b', 0.6), [0.2, y, 0], X, false);
    return { cam: [1.0, 4.4, 7.8], target: [-0.35, 0.5, -0.5] };
  },
};

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ ...SERVICE_STUDIO, w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), cam: [0, 3, 6], target: [0, 0.8, 0], aperture: 0.04, samples: +(q.get('n') || 56) });
  const view = V[+(q.get('v') || 1)](S);
  S.camPos.set(...view.cam); S.target.set(...view.target);
  S.finish();
}
