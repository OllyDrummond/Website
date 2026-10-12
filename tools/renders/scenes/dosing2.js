// Acid dosing skid (concept), after the owner's reference photo: stainless skid
// and frame, white poly batching tank with a top-mounted mixer, control box on
// the frame, two dosing pumps on pedestals, grey PVC pipework with ball valves,
// ball check valves and a pulsation dampener with a gauge. Studio style matches
// the smart filtration render.
import { studio, THREE, mat, add, tube, canvasTex, contactShadow, rectShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 30, fogFar: 60,
    cam: [5.9, 5.0, 14.6], target: [0.55, 2.7, 0], fov: 29, aperture: 0.03, softness: 1.4,
    key: [5, 11, 8], keyIntensity: 2.3, envIntensity: 0.7, fillIntensity: 0.38, shadowSize: 7, samples: +(q.get('n') || 48) });

  const steel = mat.metal('#cdd3d7', 0.24);
  const pvc = mat.plastic('#5d6469', 0.4);
  const maroon = mat.plastic('#8a2433', 0.35);
  const blue = mat.plastic('#2a62a8', 0.35);
  const black = mat.plastic('#1d2125', 0.45);
  const tankMat = new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', roughness: 0.55, clearcoat: 0.2, sheen: 0.4, sheenColor: '#ffffff' });

  const bar = (a, b, s = 0.11) => {
    const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), len = d.length();
    const m = add(S.scene, new THREE.BoxGeometry(s, len, s), steel, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  const pipe = (pts, r = 0.07) => tube(S.scene, pts, r, pvc, 160);
  const straight = (a, b, r = 0.07) => {
    const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), len = d.length();
    const m = add(S.scene, new THREE.CylinderGeometry(r, r, len, 24), pvc, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  const elbow = (p) => add(S.scene, new THREE.SphereGeometry(0.09, 20, 12), pvc, p);
  // Ball valve on a pipe running along axis ('x' | 'y' | 'z'), red handle
  const ballValve = (p, axis = 'x') => {
    const rot = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    add(S.scene, new THREE.CylinderGeometry(0.11, 0.11, 0.34, 24), pvc, p, rot);
    add(S.scene, new THREE.CylinderGeometry(0.13, 0.13, 0.06, 24), pvc, p, rot);
    add(S.scene, new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), pvc, [p[0], p[1] + 0.15, p[2]]);
    add(S.scene, new RoundedBoxGeometry(axis === 'x' ? 0.34 : 0.08, 0.05, axis === 'x' ? 0.08 : 0.34, 2, 0.02), maroon, [p[0], p[1] + 0.22, p[2]]);
  };
  // True-union ball check valve: ribbed sphere with unions
  const checkValve = (p) => {
    add(S.scene, new THREE.SphereGeometry(0.2, 32, 20), maroon, p);
    for (let k = 0; k < 6; k++) add(S.scene, new THREE.TorusGeometry(0.2, 0.014, 6, 32), maroon, p, [0, (k * Math.PI) / 6, 0]);
    for (const s of [-1, 1]) add(S.scene, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24), maroon, [p[0], p[1] + s * 0.24, p[2]]);
  };

  // ---- skid base ----
  const X = 2.45, Z = 1.55, by = 0.32;
  for (const z of [-Z, Z]) bar([-X, by, z], [X, by, z], 0.14);
  for (const x of [-X, X, -1.0, 1.0]) bar([x, by, -Z], [x, by, Z], 0.14);
  for (const x of [-X, X]) for (const z of [-Z, Z]) add(S.scene, new THREE.BoxGeometry(0.2, 0.25, 0.2), steel, [x, 0.125, z]);
  // tank stand
  for (const z of [-0.9, 0.9]) bar([-1.3, 0.62, z], [1.3, 0.62, z], 0.12);
  for (const x of [-1.3, 1.3]) for (const z of [-0.9, 0.9]) bar([x, by, z], [x, 0.62, z], 0.1);

  // ---- frame ----
  const fx = 2.05, fz = 1.35, top = 4.05;
  for (const x of [-fx, fx]) for (const z of [-fz, fz]) bar([x, by, z], [x, top, z]);
  for (const y of [2.15, top]) {
    for (const z of [-fz, fz]) bar([-fx, y, z], [fx, y, z]);
    for (const x of [-fx, fx]) bar([x, y, -fz], [x, y, fz]);
  }
  bar([-fx, 3.1, fz], [fx, 3.1, fz], 0.09);

  // ---- tank ----
  const tr = 1.42, tb = 0.68, th = 3.45;
  add(S.scene, new THREE.CylinderGeometry(tr, tr, th, 72), tankMat, [0, tb + th / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(tr * 0.92, tr, 0.22, 72), tankMat, [0, tb + th + 0.11, 0]);
  add(S.scene, new THREE.CylinderGeometry(0.62, 0.62, 0.08, 48), tankMat, [0, tb + th + 0.26, 0]);
  for (const y of [1.6, 2.6, 3.5]) add(S.scene, new THREE.TorusGeometry(tr + 0.005, 0.012, 6, 72), mat.plastic('#e6e5e0', 0.6), [0, y, 0], [Math.PI / 2, 0, 0]);
  const lvl = canvasTex(64, 512, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.fillStyle = '#5b6268';
    for (let k = 0; k <= 10; k++) { const y = 20 + k * 47; c.fillRect(0, y, k % 5 ? 22 : 40, 4); } });
  add(S.scene, new THREE.PlaneGeometry(0.16, 1.3), new THREE.MeshStandardMaterial({ map: lvl, transparent: true }), [0.78, 2.4, Math.sqrt(tr * tr - 0.78 * 0.78) + 0.01], [0, Math.atan2(0.78, Math.sqrt(tr * tr - 0.6)), 0], false);

  // ---- mixer on the lid ----
  const ty = tb + th + 0.3;
  add(S.scene, new THREE.BoxGeometry(1.1, 0.08, 0.5), steel, [0, ty + 0.04, 0]);
  add(S.scene, new THREE.CylinderGeometry(0.22, 0.26, 0.4, 32), mat.plastic('#6d7378', 0.4), [0, ty + 0.28, 0]);
  add(S.scene, new THREE.CylinderGeometry(0.27, 0.27, 0.7, 32), mat.plastic('#6d7378', 0.4), [0, ty + 0.83, 0]);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; add(S.scene, new THREE.BoxGeometry(0.03, 0.62, 0.06), mat.plastic('#62686d', 0.45), [Math.cos(a) * 0.28, ty + 0.83, Math.sin(a) * 0.28], [0, -a, 0]); }
  add(S.scene, new THREE.CylinderGeometry(0.25, 0.27, 0.16, 32), mat.plastic('#585e63', 0.5), [0, ty + 1.26, 0]);
  add(S.scene, new RoundedBoxGeometry(0.26, 0.2, 0.22, 2, 0.03), mat.plastic('#6d7378', 0.4), [0.3, ty + 0.95, 0]);

  // ---- control box on the left of the frame ----
  const cb = new THREE.Group(); cb.position.set(-2.05, 3.4, 1.0); cb.rotation.y = 0; S.scene.add(cb);
  add(cb, new RoundedBoxGeometry(1.5, 1.85, 0.55, 4, 0.04), mat.plastic('#eceef0', 0.5), [-0.2, 0, 0.1]);
  add(cb, new RoundedBoxGeometry(1.42, 1.77, 0.04, 3, 0.015), mat.plastic('#f2f4f5', 0.45), [-0.2, 0, 0.39]);
  const hmi = canvasTex(512, 300, (c, w, h) => { c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('AM wash  06:12', 26, 52);
    c.fillStyle = '#eef3f6'; c.font = '800 92px Inter'; c.fillText('pH 2.4', 22, 150);
    c.fillStyle = '#3fbf7f'; c.font = '700 32px Inter'; c.fillText('Dosed 180 mL', 26, 205);
    c.fillStyle = '#2f6fa8'; c.fillRect(26, 236, 460, 20); c.fillStyle = '#5aa6e6'; c.fillRect(26, 236, 300, 20); });
  add(cb, new THREE.PlaneGeometry(0.86, 0.5), new THREE.MeshStandardMaterial({ map: hmi, emissiveMap: hmi, emissive: '#fff', emissiveIntensity: 0.9, roughness: 0.15 }), [-0.2, 0.42, 0.415], [0, 0, 0], false);
  add(cb, new THREE.PlaneGeometry(0.92, 0.56), mat.plastic('#22272b', 0.3), [-0.2, 0.42, 0.413], [0, 0, 0], false);
  for (let i = 0; i < 3; i++) {
    const x = -0.6 + i * 0.4;
    add(cb, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 24), mat.glow(i === 0 ? '#3fbf7f' : '#2f9d63', i === 0 ? 1.6 : 0.4), [x, -0.18, 0.43], [Math.PI / 2, 0, 0]);
    add(cb, new THREE.CylinderGeometry(0.09, 0.09, 0.03, 24), mat.metal('#b9c0c5', 0.3), [x, -0.18, 0.41], [Math.PI / 2, 0, 0]);
    add(cb, new THREE.CylinderGeometry(0.08, 0.08, 0.05, 24), black, [x, -0.55, 0.43], [Math.PI / 2, 0, 0]);
    add(cb, new THREE.BoxGeometry(0.035, 0.12, 0.06), black, [x, -0.55, 0.47], [0, 0, 0.5]);
  }
  add(cb, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), mat.metal('#9aa2a7', 0.3), [0.38, -0.32, 0.43], [Math.PI / 2, 0, 0]);
  const lg = canvasTex(256, 64, (c) => { c.fillStyle = '#f2f4f5'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#7a1f2b'; c.font = '800 40px Inter'; c.fillText('KINETIQ', 20, 46); });
  add(cb, new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({ map: lg }), [-0.2, -0.78, 0.415], [0, 0, 0], false);

  // ---- dosing pumps on pedestals ----
  const pumps = [[-1.95, 1.05], [1.95, 1.05]];
  for (const [px, pz] of pumps) {
    add(S.scene, new THREE.BoxGeometry(0.75, 0.6, 0.75), steel, [px, by + 0.37, pz]);
    const p0 = by + 0.67;
    add(S.scene, new THREE.CylinderGeometry(0.34, 0.34, 0.48, 40), blue, [px, p0 + 0.34, pz], [Math.PI / 2, 0, 0]);
    add(S.scene, new THREE.CylinderGeometry(0.28, 0.32, 0.12, 40), blue, [px, p0 + 0.34, pz + 0.3], [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(S.scene, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), mat.metal('#dfe4e8', 0.2), [px + Math.cos(a) * 0.24, p0 + 0.34 + Math.sin(a) * 0.24, pz + 0.37], [Math.PI / 2, 0, 0]); }
    add(S.scene, new RoundedBoxGeometry(0.62, 0.7, 0.62, 4, 0.08), black, [px, p0 + 0.98, pz - 0.05]);
    for (let k = 0; k < 7; k++) add(S.scene, new THREE.BoxGeometry(0.64, 0.025, 0.64), mat.plastic('#262b30', 0.5), [px, p0 + 0.72 + k * 0.08, pz - 0.05]);
    add(S.scene, new THREE.CylinderGeometry(0.24, 0.24, 0.14, 32), black, [px, p0 + 1.38, pz - 0.05]);
    const lbl = canvasTex(128, 64, (c) => { c.fillStyle = '#1d2125'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#dfe4e8'; c.font = '700 28px Inter'; c.fillText(px < 0 ? 'P1' : 'P2', 40, 42); });
    add(S.scene, new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshStandardMaterial({ map: lbl }), [px, p0 + 1.1, pz + 0.265], [0, 0, 0], false);
  }

  // ---- pipework ----
  // suction: tank outlet at the bottom front, manifold to both pumps
  const sy = 0.5, sz = 1.6;
  straight([0, 0.95, 1.3], [0, sy, 1.3]); straight([0, sy, 1.3], [0, sy, sz]); elbow([0, sy, sz]); elbow([0, sy, 1.3]);
  straight([-1.95, sy, sz], [1.95, sy, sz]);
  ballValve([-0.75, sy, sz], 'x'); ballValve([0.75, sy, sz], 'x'); ballValve([0, 0.75, 1.3], 'y');
  for (const [px] of pumps) { elbow([px, sy, sz]); straight([px, sy, sz], [px, 1.01, sz]); elbow([px, 1.01, sz]); straight([px, 1.01, sz], [px, 1.01, 1.35]); }
  // drain
  straight([0, sy, sz], [0, sy, sz + 0.35]); ballValve([0, sy, sz + 0.2], 'z');
  // discharge: from each pump head up the frame front to a header, check valves, dampener
  const hy = 2.32, hz = 1.62;
  for (const [px] of pumps) {
    const sx = px < 0 ? px + 0.42 : px - 0.42;
    pipe([[px, 1.01 + 0.34, 1.3], [sx, 1.45, 1.45], [sx, 1.85, hz], [sx, hy, hz]]);
    elbow([sx, hy, hz]);
  }
  straight([-1.53, hy, hz], [1.53, hy, hz]);
  ballValve([-0.95, hy, hz], 'x'); ballValve([0.95, hy, hz], 'x');
  // risers with check valves
  for (const x of [-0.7, 0.6]) { elbow([x, hy, hz]); straight([x, hy, hz], [x, 3.55, hz]); checkValve([x, 3.1, hz]); elbow([x, 3.55, hz]); }
  straight([-0.7, 3.55, hz], [2.9, 3.55, hz]);
  add(S.scene, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), pvc, [2.9, 3.55, hz], [0, 0, Math.PI / 2]);
  // dampener with gauge
  straight([1.45, 3.55, hz], [1.45, 3.75, hz]);
  add(S.scene, new THREE.CylinderGeometry(0.34, 0.2, 0.22, 32), maroon, [1.45, 3.84, hz]);
  add(S.scene, new THREE.CylinderGeometry(0.2, 0.34, 0.22, 32), maroon, [1.45, 4.06, hz]);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; add(S.scene, new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), mat.metal('#d6dbdf', 0.25), [1.45 + Math.cos(a) * 0.3, 3.95, hz + Math.sin(a) * 0.3]); }
  add(S.scene, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16), mat.metal('#d6dbdf', 0.25), [1.45, 4.3, hz]);
  const face = canvasTex(256, 256, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 4;
    for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k * Math.PI * 0.15; c.beginPath(); c.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); c.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115); c.stroke(); }
    c.strokeStyle = '#9b2335'; c.lineWidth = 7; const a = Math.PI * 0.75 + 0.45 * Math.PI * 1.5; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); c.stroke(); });
  add(S.scene, new THREE.CylinderGeometry(0.24, 0.24, 0.1, 40), mat.metal('#c8ced1', 0.25), [1.45, 4.6, hz], [Math.PI / 2, 0, 0]);
  add(S.scene, new THREE.CircleGeometry(0.2, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.3 }), [1.45, 4.6, hz + 0.052], [0, 0, 0], false);
  // ---- cables ----
  const cable = new THREE.MeshStandardMaterial({ color: '#15181b', roughness: 0.7 });
  tube(S.scene, [[-2.0, 4.3, 0.9], [-1.8, 4.8, 0.5], [-0.8, 5.2, 0.2], [-0.05, 5.15, 0.05], [0, ty + 1.05, 0.3]], 0.045, cable);
  tube(S.scene, [[-2.3, 2.5, 1.0], [-2.4, 2.0, 0.9], [-2.2, 1.6, 0.6], [-1.95, 1.75, 0.6]], 0.04, cable);
  tube(S.scene, [[-1.7, 2.5, 1.0], [-0.6, 1.5, 1.2], [1.0, 1.4, 1.3], [1.7, 1.55, 0.95], [1.9, 1.85, 0.6]], 0.04, cable);

  rectShadow(S.scene, 5.1, 3.3, 0.45, 0.35, [0, 0.004, 0]);
  contactShadow(S.scene, 10, 6, 0.25, [0, 0.003, 0.2]);
  S.finish();
}
