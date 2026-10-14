// Acid dosing concept, redesigned in the clean product style of the other
// concept renders (light studio, white and grey bodies, dark controller with a
// screen, a single maroon accent). Four takes, ?v=1..4:
//   1 Wall panel  - white backboard with metering pump, controller, valves; carboy on the floor
//   2 Cabinet     - free-standing enclosure, screen in the door, carboy housed in the base
//   3 Drum-top    - one pump-and-controller head sitting on the chemical drum, on a spill tray
//   4 Skid        - compact powder-coated frame, dosing tank, pump, controller, bunded base
import { studio, THREE, mat, add, tube, canvasTex, rectShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const rb = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 5, r);
const cyl = (r, h, n = 48) => new THREE.CylinderGeometry(r, r, h, n);
const white = () => mat.plastic('#f1f2f3', 0.42);
const grey = () => mat.plastic('#a9afb5', 0.45);
const dark = () => mat.plastic('#22262a', 0.45);
const steel = () => mat.metal('#cfd4d8', 0.28);
const maroon = () => mat.plastic('#7a1f2b', 0.4);
const hose = () => new THREE.MeshPhysicalMaterial({ color: '#eef2f4', roughness: 0.3, transmission: 0.35, thickness: 0.02 });

// controller screen: wash summary, styled like the filtration controller
function screenTex() {
  return canvasTex(640, 400, (c, w, h) => {
    c.fillStyle = '#0f1316'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9aa5ad'; c.font = '600 30px Inter'; c.fillText('Plant wash · acid', 34, 58);
    c.fillStyle = '#ffffff'; c.font = '800 96px Inter'; c.fillText('1.2 L', 34, 168);
    c.fillStyle = '#9aa5ad'; c.font = '600 28px Inter'; c.fillText('dosed this wash', 36, 210);
    c.fillStyle = '#ffffff'; c.font = '700 44px Inter'; c.fillText('62°C', 34, 300); c.fillText('08:42', 250, 300);
    c.fillStyle = '#9aa5ad'; c.font = '600 24px Inter'; c.fillText('temperature', 36, 334); c.fillText('runtime', 252, 334);
    c.fillStyle = '#28323a'; c.fillRect(34, 362, w - 68, 10); c.fillStyle = '#3d8fe6'; c.fillRect(34, 362, (w - 68) * 0.68, 10);
  });
}
// dark controller box with screen and two keys; front faces +z
function controller(parent, pos, s = 1, rotY = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; g.scale.setScalar(s); parent.add(g);
  add(g, rb(0.62, 0.5, 0.1, 0.03), dark(), [0, 0, 0]);
  const t = screenTex();
  add(g, new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.2 }), [0, 0.05, 0.051], [0, 0, 0], false);
  add(g, cyl(0.025, 0.02, 24), mat.glow('#3fbf7f', 1.4), [-0.08, -0.17, 0.05], [Math.PI / 2, 0, 0]);
  add(g, cyl(0.025, 0.02, 24), mat.glow('#d6404e', 0.6), [0.02, -0.17, 0.05], [Math.PI / 2, 0, 0]);
  return g;
}
// compact diaphragm metering pump; dosing head faces +x, body back along -x
function meterPump(parent, pos, s = 1, rotY = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; g.scale.setScalar(s); parent.add(g);
  add(g, rb(0.42, 0.34, 0.3, 0.05), white(), [0, 0.17, 0]);
  add(g, rb(0.43, 0.06, 0.31, 0.02), maroon(), [0, 0.3, 0]);
  add(g, cyl(0.12, 0.08, 40), grey(), [0.25, 0.16, 0], [0, 0, Math.PI / 2]);
  add(g, cyl(0.1, 0.06, 40), mat.clear('#e8f0f5'), [0.31, 0.16, 0], [0, 0, Math.PI / 2]);
  for (const y of [0.05, 0.27]) add(g, cyl(0.025, 0.08, 16), grey(), [0.31, y, 0]);
  add(g, rb(0.3, 0.03, 0.34, 0.01), grey(), [0, 0.015, 0]);
  return g;
}
// 20 L chemical carboy: white HDPE, handle, cap and a suction lance
function carboy(parent, pos, rotY = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; parent.add(g);
  add(g, rb(0.46, 0.62, 0.34, 0.06), mat.plastic('#f3f4f2', 0.5), [0, 0.31, 0]);
  add(g, rb(0.2, 0.07, 0.28, 0.03), mat.plastic('#f3f4f2', 0.5), [-0.08, 0.66, 0]);
  add(g, cyl(0.06, 0.07, 32), mat.plastic('#2f6fb0', 0.45), [0.12, 0.67, 0]);
  const lab = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a1f2b'; c.fillRect(0, 0, w, 34);
    c.fillStyle = '#fff'; c.font = '700 22px Inter'; c.fillText('ACID DETERGENT', 14, 24); c.fillStyle = '#2b3035'; c.font = '600 18px Inter'; c.fillText('20 L', 14, 70);
    c.save(); c.translate(200, 110); c.rotate(Math.PI / 4); c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(-26, -26, 52, 52); c.restore(); });
  add(g, new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.6 }), [0, 0.32, 0.171], [0, 0, 0], false);
  return g;
}
const studioOpts = (q, cam, target) => ({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e3e5e7', floor: '#e1e3e5', fogNear: 18, fogFar: 40,
  cam, target, fov: 30, aperture: 0.015, softness: 1.8, key: [-5, 7, 5], keyIntensity: 2.2, rim: [5, 4, -4], rimIntensity: 1.2, rimColor: '#ffffff',
  envIntensity: 0.9, fillIntensity: 0.45, samples: +(q.get('n') || 48) });

const V = {
  // 1. wall panel, like the filtration concept
  1: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.22; S.scene.add(g);
    add(g, rb(2.2, 1.5, 0.06, 0.03), white(), [0, 1.5, -0.03]);
    for (const [x, y] of [[-1.0, 2.15], [1.0, 2.15], [-1.0, 0.85], [1.0, 0.85]]) add(g, cyl(0.025, 0.02, 20), steel(), [x, y, 0.01], [Math.PI / 2, 0, 0]);
    controller(g, [-0.52, 1.78, 0.08], 1.2);
    meterPump(g, [0.15, 0.95, 0.24], 1.5);
    add(g, rb(0.75, 0.05, 0.55, 0.01), grey(), [0.15, 0.93, 0.22]);
    for (const x of [-0.12, 0.42]) add(g, rb(0.05, 0.05, 0.3, 0.01), grey(), [x, 0.9, 0.1]);
    // discharge: pump head up, across through a valve, off the panel to the plant
    const pv = new THREE.MeshPhysicalMaterial({ color: '#e9ecee', roughness: 0.35 });
    tube(g, [[0.615, 1.42, 0.24], [0.615, 1.5, 0.24], [0.66, 1.58, 0.24], [0.85, 1.6, 0.24], [1.4, 1.6, 0.24]], 0.035, pv);
    add(g, cyl(0.065, 0.14, 32), maroon(), [0.9, 1.6, 0.24], [0, 0, Math.PI / 2]);
    add(g, rb(0.05, 0.14, 0.05, 0.01), dark(), [0.9, 1.72, 0.24]);
    add(g, rb(0.08, 0.09, 0.2, 0.01), steel(), [1.02, 1.6, 0.12]);
    // carboy on the floor with its suction hose up to the pump head
    carboy(S.scene, [1.05, 0, 0.85], -0.5);
    tube(S.scene, [[1.0, 0.72, 0.9], [0.98, 0.9, 0.85], [0.85, 1.0, 0.55], [0.72, 1.03, 0.36], [0.66, 1.06, 0.3]], 0.018, hose());
    return { cam: [1.9, 2.0, 6.6], target: [0.3, 1.1, 0.3] };
  },
  // 2. free-standing cabinet
  2: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.4; S.scene.add(g);
    const W = 1.3, H = 2.3, D = 0.75;
    // body as a shell so the bays behind the glass are open
    add(g, rb(W, H, D - 0.45, 0.06), white(), [0, H / 2 + 0.05, -0.22]);
    for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) add(g, rb(0.08, H, 0.5, 0.03), white(), [x, H / 2 + 0.05, D / 2 - 0.25]);
    for (const y of [0.1, 1.03, 1.57, H]) add(g, rb(W, 0.1, 0.5, 0.03), white(), [0, y, D / 2 - 0.25]);
    add(g, rb(W - 0.16, 0.86, 0.02, 0.01), mat.plastic('#4a5056', 0.6), [0, 0.58, D / 2 - 0.42]);
    add(g, rb(0.78, 0.5, 0.02, 0.01), mat.plastic('#4a5056', 0.6), [0, 1.3, D / 2 - 0.42]);
    add(g, rb(W - 0.06, 0.06, D - 0.04, 0.02), dark(), [0, 0.03, 0]);
    // upper door: screen and a smoked window onto the pump
        controller(g, [0, 1.95, D / 2 + 0.06], 1.25);
    add(g, rb(0.7, 0.42, 0.02, 0.02), new THREE.MeshPhysicalMaterial({ color: '#2a3036', roughness: 0.08, clearcoat: 1, opacity: 0.42, transparent: true, depthWrite: false }), [0, 1.3, D / 2 + 0.02]);
    meterPump(g, [-0.12, 1.12, D / 2 - 0.12], 0.75);
    // lower bay open at the front, carboy inside
        add(g, rb(W - 0.2, 0.78, 0.02, 0.02), new THREE.MeshPhysicalMaterial({ color: '#2a3036', roughness: 0.08, clearcoat: 1, opacity: 0.38, transparent: true, depthWrite: false }), [0, 0.58, D / 2 + 0.012]);
    carboy(g, [-0.05, 0.2, D / 2 - 0.2]);
    add(g, rb(W + 0.002, 0.05, D + 0.002, 0.01), maroon(), [0, 1.03, 0]);
    // handle and outlet
    add(g, rb(0.04, 0.3, 0.04, 0.015), steel(), [W / 2 - 0.12, 1.55, D / 2 + 0.04]);
    tube(g, [[W / 2, 1.75, -0.15], [W / 2 + 0.2, 1.75, -0.15], [W / 2 + 0.35, 1.6, -0.15], [W / 2 + 0.35, 0.05, -0.15]], 0.03, new THREE.MeshPhysicalMaterial({ color: '#e9ecee', roughness: 0.35 }));
    rectShadow(g, W + 0.2, D + 0.2, 0.55, 0.18, [0, 0.003, 0]);
    return { cam: [1.5, 2.2, 7.0], target: [0.1, 1.2, 0] };
  },
  // 3. dosing head on the drum
  3: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.3; S.scene.add(g);
    // spill tray (bund)
    add(g, rb(1.3, 0.18, 1.3, 0.04), mat.plastic('#5a6066', 0.5), [0, 0.09, 0]);
    add(g, rb(1.18, 0.02, 1.18, 0.01), mat.plastic('#3a4046', 0.5), [0, 0.18, 0]);
    // 200 L drum: white HDPE with rolling hoops
    const drum = mat.plastic('#f2f3f1', 0.48);
    add(g, cyl(0.5, 1.5, 64), drum, [0, 0.96, 0]);
    for (const y of [0.55, 1.36]) add(g, new THREE.TorusGeometry(0.505, 0.025, 12, 64), drum, [0, y, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.47, 0.03, 64), drum, [0, 1.72, 0]);
    // dosing head: one rounded dark unit with screen, maroon accent, pump head at the side
    const hd = new THREE.Group(); hd.position.set(0, 1.74, 0); g.add(hd);
    add(hd, cyl(0.3, 0.08, 64), grey(), [0, 0.04, 0]);
    add(hd, rb(0.62, 0.42, 0.42, 0.08), dark(), [0, 0.29, 0]);
    add(hd, rb(0.63, 0.04, 0.43, 0.015), maroon(), [0, 0.1, 0]);
    const t = screenTex();
    add(hd, new THREE.PlaneGeometry(0.42, 0.26), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.2 }), [0, 0.31, 0.212], [0, 0, 0], false);
    add(hd, cyl(0.11, 0.08, 40), grey(), [0.35, 0.26, 0], [0, 0, Math.PI / 2]);
    add(hd, cyl(0.09, 0.05, 40), mat.clear('#e8f0f5'), [0.4, 0.26, 0], [0, 0, Math.PI / 2]);
    tube(hd, [[0.4, 0.33, 0], [0.42, 0.5, 0], [0.5, 0.6, -0.05], [0.9, 0.62, -0.2], [1.3, 0.3, -0.35], [1.4, -1.6, -0.35]], 0.025, hose());
    rectShadow(g, 1.4, 1.4, 0.5, 0.2, [0, 0.003, 0]);
    return { cam: [1.5, 2.6, 6.0], target: [0.15, 1.1, 0] };
  },
  // 4. compact skid
  4: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.45; S.scene.add(g);
    const fr = mat.plastic('#3a4046', 0.4), W = 1.9, D = 1.1, H = 1.6;
    // bunded base tray
    add(g, rb(W + 0.1, 0.16, D + 0.1, 0.03), grey(), [0, 0.08, 0]);
    // powder-coated frame: four posts, top rails
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) add(g, rb(0.07, H, 0.07, 0.015), fr, [x, H / 2 + 0.16, z]);
    for (const z of [-D / 2, D / 2]) add(g, rb(W, 0.07, 0.07, 0.015), fr, [0, H + 0.13, z]);
    for (const x of [-W / 2, W / 2]) add(g, rb(0.07, 0.07, D, 0.015), fr, [x, H + 0.13, 0]);
    // dosing tank with a level sight tube
    const tankM = mat.plastic('#f3f4f2', 0.45);
    add(g, cyl(0.42, 1.2, 64), tankM, [-0.5, 0.8, -0.1]);
    add(g, new THREE.SphereGeometry(0.42, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), tankM, [-0.5, 1.4, -0.1]);
    add(g, cyl(0.1, 0.06, 32), mat.plastic('#2f6fb0', 0.45), [-0.5, 1.84, -0.1]);
    add(g, cyl(0.025, 0.9, 16), mat.clear('#e8f0f5'), [-0.5 + 0.1, 0.8, 0.31]);
    add(g, cyl(0.02, 0.5, 16), mat.plastic('#c45763', 0.4), [-0.5 + 0.1, 0.6, 0.31]);
    // pump on a shelf, controller on the front post
    add(g, rb(0.7, 0.04, 0.6, 0.01), fr, [0.55, 0.62, 0]);
    meterPump(g, [0.5, 0.64, 0.02], 1.0);
    add(g, rb(0.03, 0.6, 0.6, 0.01), fr, [W / 2 + 0.05, 1.3, 0.1]);
    controller(g, [W / 2 + 0.12, 1.3, 0.1], 0.9, Math.PI / 2);
    const pv = new THREE.MeshPhysicalMaterial({ color: '#e9ecee', roughness: 0.35 });
    tube(g, [[-0.5, 0.32, 0.3], [-0.45, 0.3, 0.5], [0.0, 0.3, 0.5], [0.4, 0.3, 0.3], [0.55, 0.3, 0.12], [0.81, 0.69, 0.02]], 0.03, pv);
    tube(g, [[0.81, 0.96, 0.02], [0.82, 1.15, 0.02], [0.9, 1.25, -0.3], [W / 2 + 0.2, 1.25, -0.3]], 0.03, pv);
    add(g, cyl(0.055, 0.12, 32), maroon(), [0.3, 0.3, 0.42], [0, 0, Math.PI / 2]);
    rectShadow(g, W + 0.2, D + 0.2, 0.55, 0.18, [0, 0.003, 0]);
    return { cam: [2.6, 2.4, 6.3], target: [0.2, 0.95, 0] };
  },
};

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio(studioOpts(q, [1.5, 2.2, 7], [0, 1.2, 0]));
  const view = V[+(q.get('v') || 1)](S);
  S.camPos.set(...view.cam); S.target.set(...view.target);
  S.finish();
}
