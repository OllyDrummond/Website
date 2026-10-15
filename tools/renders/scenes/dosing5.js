// Acid dosing plant built around one heated wash vat (?v=1..3): a large
// stainless vat with an immersion element and a top-mounted stirrer, two acid
// storage tanks each with its own metering pump dosing into the vat, and pumps
// taking the wash out of the vat to the plant. Light product studio.
//   1 Centre vat   - vat in the middle, an acid station either side, outlet pumps at the front
//   2 Side by side - both acid stations on the left, vat on the right, pumps beneath
//   3 Vat at back  - vat behind, acid stations and panel along the front
//   4 Simple       - vat, two acid tanks and dosing pumps, one outlet pump; nothing else
import { studio, THREE, mat, add, tube, canvasTex, rectShadow } from '../studio.js';
import { rb, cyl, ss, ssDull, steelPaint, maroon, dark, X, Z, label, plate, acidTank, circPump, meterPump, panel, valve, pipe, hoseM, skid } from './dosing4.js';

// The vat. Returns world-ish anchor points (in the group's local frame) for pipe routing.
function vat(p, pos, R = 0.72, H = 1.45, simple = false) {
  const g = new THREE.Group(); g.position.set(...pos); p.add(g);
  const legH = 0.5, cone = 0.36, base = legH + cone;
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4;
    add(g, cyl(0.045, legH + cone * 0.6, 16), ssDull(), [Math.cos(a) * R * 0.82, (legH + cone * 0.6) / 2, Math.sin(a) * R * 0.82]);
    add(g, cyl(0.08, 0.02, 20), ssDull(), [Math.cos(a) * R * 0.82, 0.01, Math.sin(a) * R * 0.82]); }
  add(g, new THREE.CylinderGeometry(R, 0.1, cone, 64, 1, true), ss(), [0, legH + cone / 2, 0]);
  add(g, cyl(R, H, 64), ss(), [0, base + H / 2, 0]);
  for (const y of [base + 0.04, base + H - 0.04]) add(g, new THREE.TorusGeometry(R + 0.006, 0.016, 8, 64), ssDull(), [0, y, 0], Z);
  // dished lid
  const lid = add(g, new THREE.SphereGeometry(R, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2), ss(), [0, base + H, 0]); lid.scale.y = 0.18;
  const top = base + H + R * 0.18;
  // bridge and stirrer drive: gearbox + finned motor, shaft down into the vat
  add(g, rb(R * 1.7, 0.07, 0.16, 0.01), steelPaint(), [0, top - 0.02, 0]);
  add(g, rb(0.32, 0.22, 0.3, 0.03), mat.plastic('#4d565f', 0.45), [0, top + 0.13, 0]);
  add(g, cyl(0.15, 0.42, 40), mat.plastic('#5c6670', 0.4), [0, top + 0.45, 0]);
  for (let k = 0; k < 8; k++) add(g, new THREE.TorusGeometry(0.153, 0.008, 6, 40), mat.plastic('#4d565f', 0.45), [0, top + 0.28 + k * 0.045, 0], Z, false);
  add(g, cyl(0.12, 0.05, 32), mat.plastic('#4d565f', 0.45), [0, top + 0.69, 0]);
  add(g, rb(0.12, 0.1, 0.14, 0.01), mat.plastic('#4d565f', 0.45), [0.17, top + 0.48, 0]);
  // manway hatch and inlet nozzles on the lid
  if (!simple) { add(g, cyl(0.17, 0.06, 40), ss(), [-R * 0.48, top - 0.05, R * 0.25]); add(g, cyl(0.19, 0.02, 40), ssDull(), [-R * 0.48, top - 0.01, R * 0.25]); }
  const nozzles = [[R * 0.5, top - 0.04, R * 0.35], [R * 0.5, top - 0.04, -R * 0.35], [-R * 0.45, top - 0.04, -R * 0.4]];
  for (const n of nozzles) add(g, cyl(0.04, 0.12, 20), ss(), [n[0], n[1] + 0.04, n[2]]);
  // immersion element: flange and terminal box low on the front, with conduit
  add(g, cyl(0.13, 0.05, 32), ssDull(), [0.25, base + 0.3, R * 0.97], Z);
  add(g, rb(0.26, 0.24, 0.12, 0.02), dark(), [0.25, base + 0.3, R + 0.06]);
  if (!simple) plate(g, label('HEATER', 'Immersion element'), 0.2, 0.1, [0.25, base + 0.3, R + 0.121]);
  if (!simple) {
  // temperature probe and gauge, level sight glass
  add(g, cyl(0.07, 0.04, 32), ssDull(), [-0.3, base + 0.75, R * 0.98], Z);
  add(g, new THREE.CircleGeometry(0.06, 32), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), [-0.3, base + 0.75, R + 0.005], [0, 0, 0], false);
  add(g, rb(0.01, 0.07, 0.01, 0.002), maroon(), [-0.3, base + 0.77, R + 0.012]);
  add(g, cyl(0.025, H * 0.75, 16), new THREE.MeshPhysicalMaterial({ color: '#e8f0f5', roughness: 0.1, transparent: true, opacity: 0.6 }), [-R * 0.7, base + H * 0.5, R * 0.72]);
  add(g, cyl(0.02, H * 0.45, 16), mat.plastic('#6aa6d8', 0.4), [-R * 0.7, base + H * 0.36, R * 0.72]);
  plate(g, label('WASH VAT', 'Heated, stirred'), 0.4, 0.2, [0.32, base + H * 0.62, R + 0.004]);
  }
  // bottom outlet and valve
  add(g, cyl(0.05, 0.25, 24), ss(), [0, legH - 0.1, 0]);
  valve(g, [0, legH - 0.25, 0], Math.PI / 2);
  return { g, outlet: [pos[0], pos[1] + legH - 0.3, pos[2]], nozzles: nozzles.map((n) => [pos[0] + n[0], pos[1] + n[1] + 0.1, pos[2] + n[2]]) };
}

// acid station: bunded tank and its metering pump in front; returns the pump outlet
function station(p, tankPos, pumpPos, name) {
  acidTank(p, tankPos, 0.36, 1.0, name, 'Acid solution');
  meterPump(p, pumpPos, 0, 1.0);
  tube(p, [[tankPos[0], tankPos[1] + 1.4, tankPos[2]], [tankPos[0] + 0.1, tankPos[1] + 1.5, tankPos[2] + 0.25], [pumpPos[0] + 0.15, pumpPos[1] + 0.6, pumpPos[2]], [pumpPos[0] + 0.26, pumpPos[1] + 0.3, pumpPos[2]]], 0.016, hoseM());
  return [pumpPos[0] + 0.3, pumpPos[1] + 0.14, pumpPos[2]];
}
// dosing line from a pump outlet up and over into a vat nozzle
const doseLine = (p, from, to, lift = 0.18) => {
  const y = to[1] + lift, k = 0.12;
  tube(p, [from, [from[0] + 0.06, from[1] + 0.25, from[2]], [from[0] + 0.06, y - k, from[2]], [from[0] + 0.06 + (to[0] - from[0]) * 0.08, y, from[2] + (to[2] - from[2]) * 0.08],
    [to[0] - (to[0] - from[0]) * 0.08, y, to[2] - (to[2] - from[2]) * 0.08], [to[0], y - k * 0.5, to[2]], to], 0.017, maroonHose());
};
const maroonHose = () => new THREE.MeshPhysicalMaterial({ color: '#f1d9dc', roughness: 0.3, transmission: 0.25, thickness: 0.02 });

const V = {
  1: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.32; S.scene.add(g);
    const top = 0.17;
    skid(g, 4.4, 1.9);
    const v = vat(g, [0, top, -0.25]);
    const a = station(g, [-1.6, top, -0.35], [-1.35, top + 0.02, 0.5], 'ACID A');
    const b = station(g, [1.6, top, -0.35], [1.35, top + 0.02, 0.5], 'ACID B');
    doseLine(g, a, v.nozzles[2]); doseLine(g, b, v.nozzles[0]);
    // outlet: down from the vat, split to two pumps, lines out to the plant
    pipe(g, [v.outlet, [0, top + 0.18, -0.25], [0, top + 0.18, 0.2]]);
    pipe(g, [[-0.6, top + 0.18, 0.2], [0.6, top + 0.18, 0.2]]);
    circPump(g, [-0.55, top, 0.62], Math.PI / 2, 1.0); circPump(g, [0.55, top, 0.62], Math.PI / 2, 1.0);
    for (const x of [-0.55, 0.55]) {
      pipe(g, [[x, top + 0.18, 0.2], [x, top + 0.18, 0.35]]);
      pipe(g, [[x, top + 0.53, 0.46], [x, top + 0.9, 0.5], [x + 0.1, top + 1.0, 0.75], [x + 0.1, top + 1.0, 1.3]]);
      valve(g, [x + 0.1, top + 1.0, 1.05], Math.PI / 2);
    }
    for (const x of [1.95, 2.35]) add(g, rb(0.06, 1.7, 0.06, 0.01), steelPaint(), [x, top + 0.85, -0.8]);
    panel(g, [2.15, top + 1.3, -0.65], 0, 0.9);
    rectShadow(g, 4.6, 2.1, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.6, 3.5, 9.4], target: [0.1, 1.2, 0] };
  },
  2: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.4; S.scene.add(g);
    const top = 0.17;
    skid(g, 4.4, 1.9);
    const v = vat(g, [0.9, top, -0.2]);
    const a = station(g, [-1.75, top, -0.4], [-1.55, top + 0.02, 0.5], 'ACID A');
    const b = station(g, [-0.85, top, -0.4], [-0.65, top + 0.02, 0.5], 'ACID B');
    doseLine(g, a, v.nozzles[2], 0.24); doseLine(g, b, v.nozzles[1], 0.16);
    pipe(g, [v.outlet, [0.9, top + 0.18, -0.2], [0.9, top + 0.18, 0.35], [1.6, top + 0.18, 0.35]]);
    circPump(g, [1.2, top, 0.62], Math.PI / 2, 1.0); circPump(g, [1.85, top, 0.62], Math.PI / 2, 1.0);
    for (const x of [1.2, 1.85]) { pipe(g, [[x, top + 0.18, 0.35], [x, top + 0.18, 0.38]]); pipe(g, [[x, top + 0.53, 0.46], [x, top + 0.9, 0.5], [x + 0.1, top + 1.0, 0.75], [x + 0.1, top + 1.0, 1.35]]); valve(g, [x + 0.1, top + 1.0, 1.05], Math.PI / 2); }
    panel(g, [2.2, top + 1.3, -0.65], 0, 0.85);
    for (const x of [1.98, 2.42]) add(g, rb(0.06, 1.7, 0.06, 0.01), steelPaint(), [x, top + 0.85, -0.8]);
    rectShadow(g, 4.6, 2.1, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.6, 3.5, 9.4], target: [0.1, 1.2, 0] };
  },
  3: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.28; S.scene.add(g);
    const top = 0.17;
    skid(g, 3.8, 2.4);
    const v = vat(g, [0.3, top, -0.55], 0.78, 1.5);
    const a = station(g, [-1.35, top, 0.35], [-0.85, top + 0.02, 0.75], 'ACID A');
    const b = station(g, [-1.35, top, -0.6], [-0.85, top + 0.02, -0.2], 'ACID B');
    doseLine(g, a, v.nozzles[1], 0.16); doseLine(g, b, v.nozzles[2], 0.24);
    pipe(g, [v.outlet, [0.3, top + 0.18, -0.55], [0.3, top + 0.18, 0.3], [1.3, top + 0.18, 0.3]]);
    circPump(g, [0.6, top, 0.62], Math.PI / 2, 1.0); circPump(g, [1.25, top, 0.62], Math.PI / 2, 1.0);
    for (const x of [0.6, 1.25]) { pipe(g, [[x, top + 0.18, 0.3], [x, top + 0.18, 0.38]]); pipe(g, [[x, top + 0.53, 0.46], [x, top + 0.9, 0.5], [x + 0.1, top + 1.0, 0.8], [x + 0.1, top + 1.0, 1.45]]); valve(g, [x + 0.1, top + 1.0, 1.1], Math.PI / 2); }
    for (const x of [1.45, 1.85]) add(g, rb(0.06, 1.7, 0.06, 0.01), steelPaint(), [x, top + 0.85, -0.9]);
    panel(g, [1.65, top + 1.3, -0.75], 0, 0.9);
    rectShadow(g, 4.0, 2.6, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.9, 3.8, 9.0], target: [0.1, 1.15, 0] };
  },
  4: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.3; S.scene.add(g);
    const top = 0.17;
    skid(g, 3.9, 1.6);
    const v = vat(g, [0, top, -0.2], 0.72, 1.45, true);
    const a = station(g, [-1.4, top, -0.25], [-1.2, top + 0.02, 0.5], 'ACID A');
    const b = station(g, [1.4, top, -0.25], [1.2, top + 0.02, 0.5], 'ACID B');
    doseLine(g, a, v.nozzles[2], 0.2); doseLine(g, b, v.nozzles[0], 0.2);
    // one outlet: vat -> pump -> line to the plant
    pipe(g, [v.outlet, [0, top + 0.18, -0.2], [0, top + 0.18, 0.35]]);
    circPump(g, [0, top, 0.62], Math.PI / 2, 1.0);
    pipe(g, [[0, top + 0.53, 0.46], [0, top + 0.85, 0.5], [0.05, top + 0.95, 0.75], [0.05, top + 0.95, 1.25]]);
    rectShadow(g, 4.1, 1.8, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.5, 3.2, 8.8], target: [0.1, 1.15, 0] };
  },
};

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e3e5e7', floor: '#e1e3e5', fogNear: 20, fogFar: 45,
    cam: [2, 3, 9], target: [0, 1.1, 0], fov: 30, aperture: 0.012, softness: 1.8, key: [-5, 8, 6], keyIntensity: 2.2,
    rim: [5, 4, -4], rimIntensity: 1.2, rimColor: '#ffffff', envIntensity: 0.9, fillIntensity: 0.45, shadowSize: 6, samples: +(q.get('n') || 48) });
  const view = V[+(q.get('v') || 1)](S);
  S.camPos.set(...view.cam); S.target.set(...view.target);
  S.finish();
}
