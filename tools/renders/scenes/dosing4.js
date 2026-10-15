// Acid dosing plant, industrial (?v=1..4): a large insulated stainless hot water
// cylinder, acid solution storage in a bund, a metering pump, a circulation
// pump and motor, an industrial control panel with HMI, stainless pipework and
// valves. Light studio to match the other concept product cards.
//   1 Inline skid      - everything on one long steel skid
//   2 Two-level frame  - acid tank raised on a top deck, pumps and cylinder below
//   3 Plant room       - cylinder and IBC on the floor, dosing gear on a wall board
//   4 Acid + alkali    - two chemical tanks, for washes that alternate
//   5 Enclosed unit    - skid inside a weatherproof housing, near side cut away
//   6 Twin cylinder    - two hot water cylinders for larger sheds
//   7 Compact tower    - tall stainless frame, small footprint, everything stacked
//   8 Corner skid      - L-shaped skid for the corner of a plant room
import { studio, THREE, mat, add, tube, canvasTex, rectShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const rb = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 4, r);
const cyl = (r, h, n = 48) => new THREE.CylinderGeometry(r, r, h, n);
const ss = () => mat.metal('#d3d8dc', 0.24);              // brushed stainless
const ssDull = () => mat.metal('#b9bfc4', 0.38);
const steelPaint = () => mat.plastic('#3d4349', 0.5);     // painted skid steel
const ral7035 = () => mat.plastic('#d6d8d4', 0.45);       // control panel grey
const poly = () => new THREE.MeshPhysicalMaterial({ color: '#eceee6', roughness: 0.55, clearcoat: 0.1 });
const maroon = () => mat.plastic('#7a1f2b', 0.4);
const dark = () => mat.plastic('#22262a', 0.45);
const X = [0, 0, Math.PI / 2], Z = [Math.PI / 2, 0, 0];

function screenTex() {
  return canvasTex(640, 400, (c, w, h) => {
    c.fillStyle = '#0f1316'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9aa5ad'; c.font = '600 28px Inter'; c.fillText('Plant wash · acid', 30, 52);
    c.fillStyle = '#fff'; c.font = '800 88px Inter'; c.fillText('62°C', 30, 150);
    c.fillStyle = '#9aa5ad'; c.font = '600 24px Inter'; c.fillText('wash water', 32, 186);
    c.fillStyle = '#fff'; c.font = '700 42px Inter'; c.fillText('1.2 L', 30, 270); c.fillText('08:42', 250, 270);
    c.fillStyle = '#9aa5ad'; c.font = '600 22px Inter'; c.fillText('acid dosed', 32, 302); c.fillText('runtime', 252, 302);
    c.fillStyle = '#28323a'; c.fillRect(30, 340, w - 60, 10); c.fillStyle = '#3d8fe6'; c.fillRect(30, 340, (w - 60) * 0.68, 10);
  });
}
const label = (txt, sub, bg = '#ffffff', fg = '#1c2227') => canvasTex(320, 160, (c, w, h) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = '#7a1f2b'; c.fillRect(0, 0, w, 30);
  c.fillStyle = '#fff'; c.font = '700 20px Inter'; c.fillText('KINETIQ', 12, 22);
  c.fillStyle = fg; c.font = '700 30px Inter'; c.fillText(txt, 14, 78); c.font = '500 20px Inter'; c.fillText(sub, 14, 112);
});
const plate = (parent, tex, w, h, pos, rot = [0, 0, 0]) => add(parent, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), pos, rot, false);

// Hot water cylinder: insulated stainless body, domed top, legs, element housing, gauge, relief valve
function cylinder(p, pos, R = 0.48, H = 2.0) {
  const g = new THREE.Group(); g.position.set(...pos); p.add(g);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; add(g, cyl(0.04, 0.22, 16), ssDull(), [Math.cos(a) * R * 0.7, 0.11, Math.sin(a) * R * 0.7]); }
  add(g, cyl(R, H, 64), ss(), [0, 0.22 + H / 2, 0]);
  for (const y of [0.42, 0.22 + H - 0.2]) add(g, new THREE.TorusGeometry(R + 0.004, 0.012, 8, 64), ssDull(), [0, y, 0], Z);
  add(g, new THREE.SphereGeometry(R, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), ss(), [0, 0.22 + H, 0], [0, 0, 0]);
  g.children[g.children.length - 1].scale.y = 0.35;
  // relief valve and drain on top
  add(g, cyl(0.035, 0.18, 20), ssDull(), [0.12, 0.22 + H + 0.2, 0]);
  add(g, rb(0.08, 0.06, 0.08, 0.01), maroon(), [0.12, 0.22 + H + 0.32, 0]);
  // element housing and thermostat cover near the base, facing +z
  add(g, rb(0.26, 0.2, 0.08, 0.02), dark(), [0, 0.62, R + 0.02]);
  // temperature gauge
  const dial = canvasTex(128, 128, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 3;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + i * Math.PI * 0.15; c.beginPath(); c.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); c.stroke(); }
    c.strokeStyle = '#7a1f2b'; c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(Math.PI * 1.6) * 44, 64 + Math.sin(Math.PI * 1.6) * 44); c.stroke(); });
  add(g, cyl(0.075, 0.04, 32), ssDull(), [0, 1.55, R + 0.02], Z);
  add(g, new THREE.CircleGeometry(0.065, 32), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.3 }), [0, 1.55, R + 0.041], [0, 0, 0], false);
  plate(g, label('HOT WATER', 'Wash cylinder'), 0.36, 0.18, [0, 1.15, R + 0.004]);
  return g;
}
// Acid storage: natural poly tank with lid, sight tube and label, standing in a bund
function acidTank(p, pos, R = 0.42, H = 1.2, name = 'ACID', sub = 'Wash solution') {
  const g = new THREE.Group(); g.position.set(...pos); p.add(g);
  add(g, rb(R * 2 + 0.3, 0.3, R * 2 + 0.3, 0.03), mat.plastic('#2b3136', 0.55), [0, 0.15, 0]);
  add(g, rb(R * 2 + 0.2, 0.02, R * 2 + 0.2, 0.01), mat.plastic('#1b1f23', 0.6), [0, 0.3, 0]);
  add(g, cyl(R, H, 64), poly(), [0, 0.3 + H / 2, 0]);
  add(g, cyl(R * 0.98, 0.06, 64), poly(), [0, 0.3 + H + 0.03, 0]);
  add(g, cyl(0.16, 0.08, 32), mat.plastic('#2f6fb0', 0.45), [0, 0.3 + H + 0.1, 0]);
  add(g, cyl(0.022, H * 0.8, 16), mat.clear('#e8f0f5'), [R * 0.72, 0.3 + H * 0.5, R * 0.72]);
  add(g, cyl(0.018, H * 0.45, 16), mat.plastic('#c45763', 0.4), [R * 0.72, 0.3 + H * 0.32, R * 0.72]);
  plate(g, label(name, sub), 0.34, 0.17, [0, 0.3 + H * 0.62, R + 0.003]);
  return g;
}
// Centrifugal circulation pump: finned motor, stainless volute, base plate. Outlet up.
function circPump(p, pos, rotY = 0, s = 1) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; g.scale.setScalar(s); p.add(g);
  add(g, rb(0.7, 0.04, 0.32, 0.01), steelPaint(), [0, 0.02, 0]);
  add(g, cyl(0.13, 0.42, 40), mat.plastic('#5c6670', 0.4), [-0.12, 0.18, 0], X);
  for (let k = 0; k < 9; k++) add(g, new THREE.TorusGeometry(0.133, 0.008, 6, 40), mat.plastic('#4d565f', 0.45), [-0.3 + k * 0.045, 0.18, 0], [0, Math.PI / 2, 0], false);
  add(g, cyl(0.1, 0.06, 32), mat.plastic('#4d565f', 0.45), [-0.36, 0.18, 0], X);
  add(g, rb(0.14, 0.1, 0.12, 0.01), mat.plastic('#4d565f', 0.45), [-0.12, 0.33, 0]);
  add(g, cyl(0.15, 0.12, 40), ss(), [0.16, 0.18, 0], X);
  add(g, cyl(0.045, 0.12, 24), ss(), [0.27, 0.18, 0], X);
  add(g, cyl(0.04, 0.16, 24), ss(), [0.16, 0.36, 0]);
  return g;
}
// Diaphragm metering pump, head facing +x
function meterPump(p, pos, rotY = 0, s = 1) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; g.scale.setScalar(s); p.add(g);
  add(g, rb(0.36, 0.3, 0.26, 0.04), mat.plastic('#eef0f1', 0.42), [0, 0.15, 0]);
  add(g, rb(0.37, 0.05, 0.27, 0.015), maroon(), [0, 0.27, 0]);
  add(g, cyl(0.1, 0.07, 40), mat.plastic('#9aa1a7', 0.45), [0.21, 0.14, 0], X);
  add(g, cyl(0.085, 0.05, 40), mat.clear('#e8f0f5'), [0.26, 0.14, 0], X);
  return g;
}
// Industrial control enclosure with HMI, lamps, isolator. Door faces +z.
function panel(p, pos, rotY = 0, s = 1) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; g.scale.setScalar(s); p.add(g);
  add(g, rb(0.8, 1.0, 0.3, 0.025), ral7035(), [0, 0, 0]);
  add(g, rb(0.76, 0.96, 0.02, 0.015), ral7035(), [0, 0, 0.155]);
  const t = screenTex();
  add(g, rb(0.48, 0.32, 0.02, 0.01), dark(), [0, 0.2, 0.166]);
  add(g, new THREE.PlaneGeometry(0.44, 0.275), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#fff', emissiveIntensity: 0.6, roughness: 0.2 }), [0, 0.2, 0.177], [0, 0, 0], false);
  [['#3fbf7f', 1.6], ['#e8b44a', 0.3], ['#d6404e', 0.3]].forEach(([c, k], i) => add(g, cyl(0.03, 0.03, 24), mat.glow(c, k), [-0.18 + i * 0.12, -0.12, 0.175], Z));
  add(g, cyl(0.07, 0.03, 32), mat.plastic('#e8c33a', 0.4), [0.2, -0.3, 0.17], Z);
  add(g, rb(0.03, 0.12, 0.03, 0.01), mat.plastic('#c62f2f', 0.4), [0.2, -0.3, 0.2]);
  plate(g, label('WASH CONTROL', 'Acid dosing'), 0.3, 0.15, [-0.18, -0.32, 0.168]);
  for (const x of [-0.25, -0.1, 0.05]) add(g, cyl(0.022, 0.05, 16), dark(), [x, -0.52, 0.05]);
  return g;
}
// Ball valve with lever, on a pipe along x
function valve(p, pos, rotY = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; p.add(g);
  add(g, cyl(0.06, 0.14, 24), ss(), [0, 0, 0], X);
  add(g, rb(0.18, 0.025, 0.035, 0.01), maroon(), [0.04, 0.09, 0]);
  add(g, cyl(0.015, 0.06, 12), ss(), [0, 0.06, 0]);
  return g;
}
const pipe = (p, pts, r = 0.035) => tube(p, pts, r, ss(), 160);
const hoseM = () => new THREE.MeshPhysicalMaterial({ color: '#eef2f4', roughness: 0.3, transmission: 0.3, thickness: 0.02 });
// Steel skid: two channels, cross members, chequer deck
function skid(p, W, D, pos = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(...pos); p.add(g);
  for (const z of [-D / 2 + 0.06, D / 2 - 0.06]) add(g, rb(W, 0.14, 0.12, 0.01), steelPaint(), [0, 0.07, z]);
  for (let k = 0; k <= 4; k++) add(g, rb(0.1, 0.1, D - 0.2, 0.01), steelPaint(), [-W / 2 + 0.1 + k * (W - 0.2) / 4, 0.07, 0]);
  const chq = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#9aa1a7'; c.fillRect(0, 0, w, h); c.fillStyle = '#b6bcc1';
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { c.save(); c.translate(x + 8 + ((y / 32) % 2) * 16, y + 16); c.rotate(((x + y) / 32) % 2 ? 0.8 : -0.8); c.fillRect(-9, -2.5, 18, 5); c.restore(); } });
  chq.wrapS = chq.wrapT = THREE.RepeatWrapping; chq.repeat.set(W * 3, D * 3);
  add(g, rb(W, 0.03, D, 0.005), new THREE.MeshStandardMaterial({ map: chq, metalness: 0.6, roughness: 0.45 }), [0, 0.155, 0]);
  return g;
}

const V = {
  // 1. inline skid: cylinder | acid tank | panel, pumps along the front
  1: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.38; S.scene.add(g);
    const top = 0.17;
    skid(g, 3.4, 1.4);
    cylinder(g, [-1.15, top, -0.15]);
    acidTank(g, [0.3, top, -0.2], 0.4, 1.1);
    // panel on an upright stand
    for (const x of [1.05, 1.55]) add(g, rb(0.06, 1.75, 0.06, 0.01), steelPaint(), [x, top + 0.87, -0.35]);
    panel(g, [1.3, top + 1.3, -0.2]);
    circPump(g, [-0.55, top, 0.45], 0, 1.1);
    meterPump(g, [0.75, top + 0.02, 0.4], Math.PI / 2 * 0, 1.1);
    // pipework: cylinder outlet -> circ pump -> header -> plant
    pipe(g, [[-0.67, top + 0.55, -0.15], [-0.55, top + 0.55, 0.1], [-0.4, top + 0.25, 0.45], [-0.3, top + 0.2, 0.45]]);
    pipe(g, [[-0.37, top + 0.56, 0.45], [-0.37, top + 1.05, 0.45], [-0.2, top + 1.15, 0.45], [1.0, top + 1.15, 0.45], [1.75, top + 1.15, 0.45], [2.05, top + 1.15, 0.45]]);
    valve(g, [0.1, top + 1.15, 0.45]); valve(g, [1.75, top + 1.15, 0.45]);
    // dosing line: acid tank -> metering pump -> injection into the header
    tube(g, [[0.3, top + 1.45, -0.2], [0.42, top + 1.6, 0.0], [0.6, top + 0.6, 0.4], [0.72, top + 0.2, 0.4]], 0.016, hoseM());
    tube(g, [[1.0, top + 0.17, 0.4], [1.1, top + 0.3, 0.4], [1.2, top + 0.9, 0.45], [1.25, top + 1.12, 0.45]], 0.016, hoseM());
    rectShadow(g, 3.5, 1.5, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.9, 2.8, 7.3], target: [0.2, 1.0, 0] };
  },
  // 2. two-level frame: acid tank on the top deck feeds down by gravity
  2: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.5; S.scene.add(g);
    const W = 2.6, D = 1.3, top = 0.17, deck = 1.55;
    skid(g, W, D);
    for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) for (const z of [-D / 2 + 0.05, D / 2 - 0.05]) add(g, rb(0.08, deck + 0.1, 0.08, 0.01), steelPaint(), [x, top + (deck + 0.1) / 2, z]);
    add(g, rb(W * 0.55, 0.06, D, 0.01), steelPaint(), [W * 0.2, top + deck, 0]);
    add(g, rb(W * 0.55 - 0.1, 0.02, D - 0.1, 0.005), mat.metal('#9aa1a7', 0.45), [W * 0.2, top + deck + 0.04, 0]);
    for (const z of [-D / 2 + 0.05, D / 2 - 0.05]) add(g, rb(W, 0.06, 0.06, 0.01), steelPaint(), [0, top + deck + 0.1, z]);
    cylinder(g, [-0.75, top, 0], 0.46, 1.95);
    acidTank(g, [0.55, top + deck + 0.05, 0], 0.38, 0.85);
    circPump(g, [0.45, top, 0.25], 0, 1.05);
    meterPump(g, [0.55, top + 0.75, -0.2], 0, 1.1);
    add(g, rb(0.6, 0.04, 0.45, 0.01), steelPaint(), [0.55, top + 0.73, -0.2]);
    panel(g, [W / 2 + 0.2, top + 1.0, 0.1], Math.PI / 2, 0.95);
    pipe(g, [[-0.3, top + 0.6, 0], [0.0, top + 0.6, 0.15], [0.3, top + 0.25, 0.25], [0.4, top + 0.2, 0.25]]);
    pipe(g, [[0.63, top + 0.55, 0.25], [0.63, top + 1.25, 0.25], [0.9, top + 1.32, 0.3], [W / 2 + 0.4, top + 1.32, 0.45]]);
    valve(g, [0.9, top + 1.32, 0.3]);
    tube(g, [[0.55, top + deck + 0.35, 0.3], [0.6, top + 1.3, -0.05], [0.7, top + 1.05, -0.2], [0.75, top + 0.9, -0.2]], 0.016, hoseM());
    rectShadow(g, W + 0.2, D + 0.2, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [2.4, 3.2, 8.2], target: [0.1, 1.3, 0] };
  },
  // 3. plant room: cylinder, IBC and a wall board with the dosing gear and panel
  3: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.3; S.scene.add(g);
    // back wall board (galvanised mounting board)
    add(g, rb(3.2, 2.3, 0.06, 0.02), mat.plastic('#e6e8ea', 0.5), [0.2, 1.25, -0.7]);
    cylinder(g, [-1.0, 0, -0.1], 0.5, 2.0);
    // IBC: white tank in a galvanised cage on a pallet
    const ibc = new THREE.Group(); ibc.position.set(1.1, 0, 0.1); g.add(ibc);
    add(ibc, rb(1.1, 0.15, 0.95, 0.01), steelPaint(), [0, 0.075, 0]);
    add(ibc, rb(1.02, 0.95, 0.88, 0.06), poly(), [0, 0.65, 0]);
    add(ibc, cyl(0.12, 0.06, 32), mat.plastic('#2f6fb0', 0.45), [0, 1.15, 0]);
    const cage = mat.metal('#bfc5ca', 0.35);
    for (let i = 0; i <= 5; i++) { const x = -0.53 + i * 0.212; add(ibc, cyl(0.012, 1.0, 8), cage, [x, 0.65, 0.46]); add(ibc, cyl(0.012, 1.0, 8), cage, [x, 0.65, -0.46]); }
    for (let i = 0; i <= 4; i++) { const z = -0.46 + i * 0.23; add(ibc, cyl(0.012, 1.0, 8), cage, [0.53, 0.65, z]); add(ibc, cyl(0.012, 1.0, 8), cage, [-0.53, 0.65, z]); }
    for (const y of [0.17, 0.65, 1.14]) { add(ibc, cyl(0.012, 1.06, 8), cage, [0, y, 0.46], X); add(ibc, cyl(0.012, 1.06, 8), cage, [0, y, -0.46], X); add(ibc, cyl(0.012, 0.92, 8), cage, [0.53, y, 0], Z); add(ibc, cyl(0.012, 0.92, 8), cage, [-0.53, y, 0], Z); }
    plate(ibc, label('ACID', 'Bulk solution 1000 L'), 0.36, 0.18, [0, 0.75, 0.465]);
    valve(ibc, [0.0, 0.3, 0.52], Math.PI / 2);
    // wall-mounted gear
    panel(g, [-0.05, 1.6, -0.5], 0, 1.05);
    meterPump(g, [0.85, 1.55, -0.52], 0, 1.15);
    add(g, rb(0.55, 0.04, 0.35, 0.01), steelPaint(), [0.85, 1.52, -0.52]);
    circPump(g, [-0.15, 0, 0.35], 0, 1.1);
    pipe(g, [[-0.52, 0.6, -0.1], [-0.4, 0.4, 0.2], [-0.2, 0.22, 0.35]]);
    pipe(g, [[0.03, 0.56, 0.35], [0.03, 2.1, 0.35], [0.3, 2.2, 0.35], [1.9, 2.2, 0.35]]);
    valve(g, [0.6, 2.2, 0.35]);
    tube(g, [[1.1, 0.3, 0.6], [0.95, 0.5, 0.4], [1.2, 1.2, -0.3], [1.15, 1.6, -0.5]], 0.016, hoseM());
    tube(g, [[1.15, 1.75, -0.5], [1.0, 2.0, -0.2], [0.6, 2.18, 0.3]], 0.016, hoseM());
    rectShadow(g, 3.4, 1.6, 0.5, 0.2, [0.2, 0.003, -0.1]);
    return { cam: [2.0, 2.6, 8.2], target: [0.25, 1.15, 0] };
  },
  // 4. acid + alkali: panel | cylinder | two chemical tanks, pumps along the front
  4: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.3; S.scene.add(g);
    const top = 0.17;
    skid(g, 4.2, 1.5);
    for (const x of [-1.95, -1.45]) add(g, rb(0.06, 1.75, 0.06, 0.01), steelPaint(), [x, top + 0.87, -0.35]);
    panel(g, [-1.7, top + 1.3, -0.2]);
    cylinder(g, [-0.6, top, -0.2], 0.5, 2.05);
    acidTank(g, [0.75, top, -0.2], 0.38, 1.05, 'ACID', 'Wash solution');
    acidTank(g, [1.65, top, -0.2], 0.38, 1.05, 'ALKALI', 'Wash solution');
    circPump(g, [-0.55, top, 0.45], 0, 1.05);
    meterPump(g, [0.55, top + 0.02, 0.5], 0, 0.95);
    meterPump(g, [1.45, top + 0.02, 0.5], 0, 0.95);
    pipe(g, [[-0.6, top + 0.6, 0.3], [-0.6, top + 0.4, 0.45], [-0.45, top + 0.22, 0.45]]);
    pipe(g, [[-0.38, top + 0.56, 0.45], [-0.38, top + 1.2, 0.5], [-0.2, top + 1.28, 0.6], [2.0, top + 1.28, 0.6], [2.3, top + 1.28, 0.6]]);
    valve(g, [0.1, top + 1.28, 0.6]); valve(g, [2.05, top + 1.28, 0.6]);
    for (const [tx, px] of [[0.75, 0.55], [1.65, 1.45]]) {
      tube(g, [[tx, top + 1.45, -0.2], [tx + 0.1, top + 1.55, 0.1], [px + 0.1, top + 0.6, 0.5], [px + 0.2, top + 0.3, 0.5]], 0.016, hoseM());
      tube(g, [[px + 0.26, top + 0.15, 0.5], [px + 0.35, top + 0.4, 0.55], [px + 0.3, top + 1.1, 0.6], [px + 0.28, top + 1.26, 0.6]], 0.016, hoseM());
    }
    rectShadow(g, 4.4, 1.7, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.6, 3.2, 9.0], target: [0.0, 1.05, 0] };
  },
  // 5. enclosed unit: housing with the near side and roof cut away to show the plant
  5: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.42; S.scene.add(g);
    const W = 3.2, D = 1.5, H = 2.45, top = 0.17;
    skid(g, W + 0.1, D + 0.1);
    const clad = mat.plastic('#e4e6e8', 0.5), trim = steelPaint();
    // back wall and the far end wall, with louvres
    add(g, rb(W, H, 0.05, 0.01), clad, [0, top + H / 2, -D / 2]);
    add(g, rb(0.05, H, D, 0.01), clad, [-W / 2, top + H / 2, 0]);
    for (let k = 0; k < 8; k++) add(g, rb(0.02, 0.04, 0.7, 0.005), trim, [-W / 2 + 0.03, top + 1.4 + k * 0.1, 0]);
    // corner posts and a roof edge frame (roof itself left off)
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) add(g, rb(0.07, H, 0.07, 0.01), trim, [x, top + H / 2, z]);
    for (const z of [-D / 2, D / 2]) add(g, rb(W, 0.07, 0.07, 0.01), trim, [0, top + H, z]);
    for (const x of [-W / 2, W / 2]) add(g, rb(0.07, 0.07, D, 0.01), trim, [x, top + H, 0]);
    plate(g, label('WASH PLANT', 'Hot water + acid dosing'), 0.6, 0.3, [0.6, top + 2.05, -D / 2 + 0.03]);
    cylinder(g, [-0.95, top, -0.2], 0.48, 1.95);
    acidTank(g, [0.35, top, -0.25], 0.36, 1.0);
    panel(g, [1.25, top + 1.5, -D / 2 + 0.2], 0, 0.95);
    circPump(g, [-0.35, top, 0.4], 0, 1.05);
    meterPump(g, [0.7, top + 0.02, 0.35], 0, 1.0);
    pipe(g, [[-0.5, top + 0.6, -0.1], [-0.35, top + 0.4, 0.3], [-0.2, top + 0.22, 0.4]]);
    pipe(g, [[-0.13, top + 0.56, 0.4], [-0.13, top + 1.3, 0.45], [0.1, top + 1.38, 0.45], [W / 2 + 0.4, top + 1.38, 0.45]]);
    valve(g, [0.9, top + 1.38, 0.45]);
    tube(g, [[0.35, top + 1.35, -0.25], [0.5, top + 1.45, 0.0], [0.75, top + 0.6, 0.35], [0.9, top + 0.3, 0.35]], 0.016, hoseM());
    rectShadow(g, W + 0.3, D + 0.3, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [2.6, 3.4, 8.4], target: [0.15, 1.15, 0] };
  },
  // 6. twin cylinders, acid tank and panel on a wide skid
  6: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.3; S.scene.add(g);
    const top = 0.17;
    skid(g, 4.0, 1.5);
    cylinder(g, [-1.45, top, -0.2], 0.46, 1.95);
    cylinder(g, [-0.45, top, -0.2], 0.46, 1.95);
    acidTank(g, [0.8, top, -0.2], 0.4, 1.1);
    for (const x of [1.55, 2.0]) add(g, rb(0.06, 1.75, 0.06, 0.01), steelPaint(), [x, top + 0.87, -0.35]);
    panel(g, [1.78, top + 1.3, -0.2], 0, 0.95);
    circPump(g, [-0.95, top, 0.45], 0, 1.05);
    meterPump(g, [1.05, top + 0.02, 0.45], 0, 1.0);
    // common header off both cylinders
    pipe(g, [[-1.45, top + 0.7, 0.26], [-1.45, top + 0.7, 0.4], [-0.45, top + 0.7, 0.4], [-0.45, top + 0.7, 0.26]]);
    pipe(g, [[-0.95, top + 0.7, 0.4], [-0.85, top + 0.4, 0.45], [-0.75, top + 0.22, 0.45]]);
    pipe(g, [[-0.68, top + 0.56, 0.45], [-0.68, top + 1.25, 0.55], [-0.4, top + 1.33, 0.6], [2.2, top + 1.33, 0.6]]);
    valve(g, [0.1, top + 1.33, 0.6]); valve(g, [-1.2, top + 0.7, 0.4]);
    tube(g, [[0.8, top + 1.45, -0.2], [0.95, top + 1.55, 0.1], [1.15, top + 0.6, 0.45], [1.25, top + 0.3, 0.45]], 0.016, hoseM());
    rectShadow(g, 4.2, 1.7, 0.55, 0.2, [0, 0.003, 0]);
    return { cam: [1.9, 3.3, 9.0], target: [0.15, 1.05, 0] };
  },
  // 7. compact tower: stainless frame, cylinder in the middle, tank on a side shelf, panel on the front
  7: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.55; S.scene.add(g);
    const W = 1.7, D = 1.25, H = 2.6, top = 0.17, sf = mat.metal('#cfd4d8', 0.3);
    skid(g, W + 0.9, D + 0.1, [0.4, 0, 0]);
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) add(g, rb(0.06, H, 0.06, 0.01), sf, [x, top + H / 2, z]);
    for (const y of [top + 0.9, top + H]) { for (const z of [-D / 2, D / 2]) add(g, rb(W, 0.05, 0.05, 0.01), sf, [0, y, z]); for (const x of [-W / 2, W / 2]) add(g, rb(0.05, 0.05, D, 0.01), sf, [x, y, 0]); }
    cylinder(g, [-0.35, top, -0.15], 0.45, 1.95);
    // side shelf holding the acid tank, at mid height
    add(g, rb(0.95, 0.05, D, 0.01), sf, [W / 2 + 0.45, top + 0.9, 0]);
    for (const z of [-D / 2, D / 2]) add(g, rb(0.05, 0.9, 0.05, 0.01), sf, [W / 2 + 0.9, top + 0.45, z]);
    acidTank(g, [W / 2 + 0.45, top + 0.92, 0], 0.32, 0.8);
    panel(g, [0.5, top + 1.6, D / 2 + 0.15], 0, 0.72);
    circPump(g, [0.35, top, 0.15], 0, 1.0);
    meterPump(g, [W / 2 + 0.35, top + 0.02, 0.2], 0, 0.95);
    pipe(g, [[-0.3, top + 0.6, 0.35], [-0.1, top + 0.4, 0.3], [0.15, top + 0.22, 0.15]]);
    pipe(g, [[0.6, top + 0.53, 0.15], [0.6, top + 2.45, 0.15], [0.8, top + 2.5, 0.15], [W / 2 + 1.0, top + 2.5, 0.15]]);
    valve(g, [1.15, top + 2.5, 0.15]);
    tube(g, [[W / 2 + 0.45, top + 1.95, 0], [W / 2 + 0.6, top + 2.0, 0.3], [W / 2 + 0.55, top + 0.6, 0.25], [W / 2 + 0.55, top + 0.3, 0.2]], 0.016, hoseM());
    rectShadow(g, W + 1.1, D + 0.3, 0.55, 0.2, [0.4, 0.003, 0]);
    return { cam: [2.2, 3.4, 8.2], target: [0.35, 1.3, 0] };
  },
  // 8. corner skid: L-shaped base, cylinder in the corner, tank and panel on the wings
  8: (S) => {
    const g = new THREE.Group(); g.rotation.y = -0.78; S.scene.add(g);
    const top = 0.17;
    skid(g, 3.0, 1.2, [0.3, 0, -0.6]);
    skid(g, 1.2, 1.8, [-0.6, 0, 0.9]);
    cylinder(g, [-0.6, top, -0.6], 0.5, 2.05);
    acidTank(g, [0.85, top, -0.65], 0.38, 1.1);
    panel(g, [-0.6, top + 1.25, 1.75], 0, 0.95);
    for (const x of [-0.85, -0.35]) add(g, rb(0.06, 1.7, 0.06, 0.01), steelPaint(), [x, top + 0.85, 1.6]);
    circPump(g, [-0.65, top, 0.65], Math.PI / 2, 1.05);
    meterPump(g, [1.35, top + 0.02, -0.25], 0, 1.0);
    pipe(g, [[-0.6, top + 0.6, -0.08], [-0.65, top + 0.38, 0.2], [-0.65, top + 0.2, 0.36]]);
    pipe(g, [[-0.65, top + 0.53, 0.49], [-0.65, top + 1.3, 0.49], [-0.45, top + 1.38, 0.49], [1.8, top + 1.38, 0.49]]);
    valve(g, [0.3, top + 1.38, 0.49]);
    tube(g, [[0.85, top + 1.45, -0.65], [1.0, top + 1.55, -0.4], [1.25, top + 0.6, -0.25], [1.35, top + 0.3, -0.25]], 0.016, hoseM());
    rectShadow(g, 3.2, 1.4, 0.55, 0.2, [0.3, 0.003, -0.6]); rectShadow(g, 1.4, 2.0, 0.5, 0.2, [-0.6, 0.003, 0.9]);
    return { cam: [2.4, 3.6, 8.4], target: [0.2, 1.0, 0.2] };
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
