// Acid dosing skid (concept), version 2: stainless skid and frame, white poly
// batching tank, a compact metering pump mounted on the tank lid (suction lance
// into the tank, discharge line over the frame), one transfer pump with simple
// pipework, and an LCD control panel on the side of the frame. Studio style
// matches the smart filtration render.
import { studio, THREE, mat, add, tube, canvasTex, contactShadow, rectShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 30, fogFar: 60,
    cam: [6.8, 5.2, 14.0], target: [0.85, 2.55, 0], fov: 29, aperture: 0.03, softness: 1.4,
    key: [5, 11, 8], keyIntensity: 2.3, envIntensity: 0.7, fillIntensity: 0.38, shadowSize: 7, samples: +(q.get('n') || 48) });

  const steel = mat.metal('#cdd3d7', 0.24);
  const pvc = mat.plastic('#5d6469', 0.4);
  const maroon = mat.plastic('#8a2433', 0.35);
  const blue = mat.plastic('#2a62a8', 0.35);
  const black = mat.plastic('#1d2125', 0.45);
  const white = mat.plastic('#eef0f1', 0.42);
  const tankMat = new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', roughness: 0.55, clearcoat: 0.2, sheen: 0.4, sheenColor: '#ffffff' });
  const hose = new THREE.MeshPhysicalMaterial({ color: '#f1ead8', roughness: 0.35, transmission: 0.25, thickness: 0.1 });

  const bar = (a, b, s = 0.11) => {
    const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), len = d.length();
    const m = add(S.scene, new THREE.BoxGeometry(s, len, s), steel, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  const straight = (a, b, r = 0.07, m = pvc) => {
    const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), len = d.length();
    const o = add(S.scene, new THREE.CylinderGeometry(r, r, len, 24), m, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  const elbow = (p) => add(S.scene, new THREE.SphereGeometry(0.09, 20, 12), pvc, p);
  const ballValve = (p, axis = 'x') => {
    const rot = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    add(S.scene, new THREE.CylinderGeometry(0.11, 0.11, 0.34, 24), pvc, p, rot);
    add(S.scene, new THREE.CylinderGeometry(0.13, 0.13, 0.06, 24), pvc, p, rot);
    add(S.scene, new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), pvc, [p[0], p[1] + 0.15, p[2]]);
    add(S.scene, new RoundedBoxGeometry(axis === 'x' ? 0.34 : 0.08, 0.05, axis === 'x' ? 0.08 : 0.34, 2, 0.02), maroon, [p[0], p[1] + 0.22, p[2]]);
  };
  const checkValve = (p) => { // (unused now; kept for vertical risers)
    add(S.scene, new THREE.SphereGeometry(0.2, 32, 20), maroon, p);
    for (let k = 0; k < 6; k++) add(S.scene, new THREE.TorusGeometry(0.2, 0.014, 6, 32), maroon, p, [0, (k * Math.PI) / 6, 0]);
    for (const s of [-1, 1]) add(S.scene, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24), maroon, [p[0], p[1] + s * 0.24, p[2]]);
  };

  // ---- skid base ----
  const X = 2.45, Z = 1.55, by = 0.32;
  for (const z of [-Z, Z]) bar([-X, by, z], [X, by, z], 0.14);
  for (const x of [-X, X, -1.0, 1.0]) bar([x, by, -Z], [x, by, Z], 0.14);
  for (const x of [-X, X]) for (const z of [-Z, Z]) add(S.scene, new THREE.BoxGeometry(0.2, 0.25, 0.2), steel, [x, 0.125, z]);
  for (const z of [-0.9, 0.9]) bar([-1.3, 0.62, z], [1.3, 0.62, z], 0.12);
  for (const x of [-1.3, 1.3]) for (const z of [-0.9, 0.9]) bar([x, by, z], [x, 0.62, z], 0.1);

  // ---- frame ----
  const fx = 2.05, fz = 1.35, top = 4.05;
  for (const x of [-fx, fx]) for (const z of [-fz, fz]) bar([x, by, z], [x, top, z]);
  for (const y of [2.15, top]) {
    for (const z of [-fz, fz]) bar([-fx, y, z], [fx, y, z]);
    for (const x of [-fx, fx]) bar([x, y, -fz], [x, y, fz]);
  }

  // ---- tank ----
  const tr = 1.42, tb = 0.68, th = 3.45;
  add(S.scene, new THREE.CylinderGeometry(tr, tr, th, 72), tankMat, [0, tb + th / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(tr * 0.92, tr, 0.22, 72), tankMat, [0, tb + th + 0.11, 0]);
  add(S.scene, new THREE.CylinderGeometry(0.62, 0.62, 0.08, 48), tankMat, [0, tb + th + 0.26, 0]);
  for (const y of [1.6, 2.6, 3.5]) add(S.scene, new THREE.TorusGeometry(tr + 0.005, 0.012, 6, 72), mat.plastic('#e6e5e0', 0.6), [0, y, 0], [Math.PI / 2, 0, 0]);
  const lvl = canvasTex(64, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#5b6268';
    for (let k = 0; k <= 10; k++) { const y = 20 + k * 47; c.fillRect(0, y, k % 5 ? 22 : 40, 4); } });
  add(S.scene, new THREE.PlaneGeometry(0.16, 1.3), new THREE.MeshStandardMaterial({ map: lvl, transparent: true }), [0.78, 2.4, Math.sqrt(tr * tr - 0.78 * 0.78) + 0.01], [0, Math.atan2(0.78, Math.sqrt(tr * tr - 0.6)), 0], false);

  // ---- metering pump on the lid ----
  const ty = tb + th + 0.3;
  const dp = new THREE.Group(); dp.position.set(-0.15, ty, 0.1); dp.rotation.y = 0.35; S.scene.add(dp);
  add(dp, new THREE.BoxGeometry(1.3, 0.06, 0.8), steel, [0, 0.03, 0]);
  add(dp, new RoundedBoxGeometry(1.0, 0.7, 0.62, 6, 0.1), white, [-0.1, 0.41, 0]);
  add(dp, new THREE.BoxGeometry(1.0, 0.04, 0.63), mat.plastic('#8a2433', 0.4), [-0.1, 0.2, 0]);
  // diaphragm dosing head on the right-hand end
  add(dp, new THREE.CylinderGeometry(0.27, 0.27, 0.22, 40), maroon, [0.5, 0.42, 0], [0, 0, Math.PI / 2]);
  add(dp, new THREE.CylinderGeometry(0.21, 0.24, 0.1, 40), maroon, [0.65, 0.42, 0], [0, 0, Math.PI / 2]);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(dp, new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), mat.metal('#dfe4e8', 0.2), [0.71, 0.42 + Math.cos(a) * 0.17, Math.sin(a) * 0.17], [0, 0, Math.PI / 2]); }
  // inlet (bottom) and outlet (top) fittings on the head
  add(dp, new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), mat.plastic('#e8e3d6', 0.4), [0.62, 0.72, 0]);
  add(dp, new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), mat.plastic('#e8e3d6', 0.4), [0.62, 0.12, 0]);
  // stroke-rate knob and status lights on the front face
  add(dp, new THREE.CylinderGeometry(0.11, 0.11, 0.07, 32), black, [-0.25, 0.46, 0.33], [Math.PI / 2, 0, 0]);
  add(dp, new THREE.BoxGeometry(0.03, 0.12, 0.02), mat.plastic('#e7eaec', 0.4), [-0.25, 0.49, 0.37]);
  add(dp, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), mat.glow('#3fbf7f', 2), [0.05, 0.56, 0.315], [Math.PI / 2, 0, 0], false);
  add(dp, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), mat.glow('#e0a043', 0.3), [0.15, 0.56, 0.315], [Math.PI / 2, 0, 0], false);
  const lg = canvasTex(256, 64, (c) => { c.fillStyle = '#eef0f1'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#7a1f2b'; c.font = '800 40px Inter'; c.fillText('KINETIQ', 20, 46); });
  add(dp, new THREE.PlaneGeometry(0.36, 0.09), new THREE.MeshStandardMaterial({ map: lg }), [0.05, 0.32, 0.312], [0, 0, 0], false);
  dp.updateMatrixWorld(true);
  const W = (x, y, z) => { const v = dp.localToWorld(new THREE.Vector3(x, y, z)); return [v.x, v.y, v.z]; };
  // suction lance: from the head inlet down through the lid
  const inl = W(0.62, 0.05, 0);
  tube(S.scene, [inl, [inl[0] + 0.05, ty - 0.02, inl[2] + 0.1], [inl[0] - 0.1, ty - 0.1, inl[2] + 0.25]], 0.045, hose);
  add(S.scene, new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24), pvc, [inl[0] - 0.12, ty - 0.08, inl[2] + 0.28]);
  // discharge: from the head outlet over the frame and down the right-hand side
  const out = W(0.62, 0.8, 0);
  tube(S.scene, [out, [out[0] + 0.1, out[1] + 0.45, out[2]], [1.3, top + 0.6, -0.5], [fx + 0.1, top + 0.15, -1.1], [fx + 0.2, 3.3, -1.25], [fx + 0.25, 2.6, -1.3]], 0.045, hose);
  // injection fitting where the line leaves the skid
  add(S.scene, new THREE.CylinderGeometry(0.08, 0.08, 0.22, 20), maroon, [fx + 0.25, 2.45, -1.3]);
  straight([fx + 0.25, 2.34, -1.3], [fx + 1.4, 2.34, -1.3], 0.07);
  // small level sensor on the lid
  add(S.scene, new THREE.CylinderGeometry(0.16, 0.16, 0.25, 32), mat.plastic('#6d7378', 0.4), [0.75, ty + 0.12, -0.55]);
  add(S.scene, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), black, [0.75, ty + 0.3, -0.55]);

  // ---- LCD control panel on the right side of the frame ----
  const lp = new THREE.Group(); lp.position.set(fx + 0.12, 3.05, 0.15); lp.rotation.y = Math.PI / 2 - 0.62; S.scene.add(lp);
  add(lp, new RoundedBoxGeometry(1.5, 1.05, 0.22, 5, 0.06), white, [0, 0, 0]);
  add(lp, new THREE.PlaneGeometry(1.12, 0.7), mat.plastic('#1b2025', 0.3), [-0.08, 0.04, 0.112], [0, 0, 0], false);
  const hmi = canvasTex(640, 400, (c, w, h) => {
    c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#eef3f6'; c.font = '700 30px Inter'; c.fillText('Acid dosing', 28, 50);
    c.fillStyle = '#3fbf7f'; c.beginPath(); c.arc(w - 36, 42, 9, 0, 7); c.fill();
    c.fillStyle = '#8b99a3'; c.font = '500 22px Inter'; c.textAlign = 'right'; c.fillText('Auto', w - 56, 50); c.textAlign = 'left';
    c.fillStyle = '#eef3f6'; c.font = '800 104px Inter'; c.fillText('pH 2.4', 26, 168);
    c.fillStyle = '#8b99a3'; c.font = '500 24px Inter'; c.fillText('Target 2.5', 32, 208);
    const st = (x, k, v) => { c.fillStyle = '#8b99a3'; c.font = '500 22px Inter'; c.fillText(k, x, 264); c.fillStyle = '#eef3f6'; c.font = '700 34px Inter'; c.fillText(v, x, 304); };
    st(30, 'Last dose', '180 mL'); st(250, 'Next wash', '15:30'); st(460, 'Tank', '72%');
    c.fillStyle = '#22303b'; c.fillRect(30, 340, w - 60, 18); c.fillStyle = '#5aa6e6'; c.fillRect(30, 340, (w - 60) * 0.72, 18);
  });
  add(lp, new THREE.PlaneGeometry(1.06, 0.66), new THREE.MeshStandardMaterial({ map: hmi, emissiveMap: hmi, emissive: '#fff', emissiveIntensity: 0.9, roughness: 0.12 }), [-0.08, 0.04, 0.114], [0, 0, 0], false);
  for (const [y, c, k] of [[0.26, '#3fbf7f', 1.6], [0.0, '#e0a043', 0.3], [-0.26, '#b42318', 0.3]]) {
    add(lp, new THREE.CylinderGeometry(0.055, 0.055, 0.04, 24), mat.glow(c, k), [0.62, y, 0.12], [Math.PI / 2, 0, 0]);
  }
  for (const z of [-0.35, 0.35]) add(S.scene, new THREE.BoxGeometry(0.1, 0.9, 0.08), steel, [fx + 0.03, 3.05, 0.15 + z * 0.4]);

  // ---- one transfer pump on a pedestal, simple pipework ----
  const px = 1.75, pz = 1.05;
  add(S.scene, new THREE.BoxGeometry(0.75, 0.6, 0.75), steel, [px, by + 0.37, pz]);
  const p0 = by + 0.67;
  add(S.scene, new THREE.CylinderGeometry(0.34, 0.34, 0.48, 40), blue, [px, p0 + 0.34, pz], [Math.PI / 2, 0, 0]);
  add(S.scene, new THREE.CylinderGeometry(0.28, 0.32, 0.12, 40), blue, [px, p0 + 0.34, pz + 0.3], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(S.scene, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), mat.metal('#dfe4e8', 0.2), [px + Math.cos(a) * 0.24, p0 + 0.34 + Math.sin(a) * 0.24, pz + 0.37], [Math.PI / 2, 0, 0]); }
  add(S.scene, new RoundedBoxGeometry(0.62, 0.7, 0.62, 4, 0.08), black, [px, p0 + 0.98, pz - 0.05]);
  for (let k = 0; k < 7; k++) add(S.scene, new THREE.BoxGeometry(0.64, 0.025, 0.64), mat.plastic('#262b30', 0.5), [px, p0 + 0.72 + k * 0.08, pz - 0.05]);
  add(S.scene, new THREE.CylinderGeometry(0.24, 0.24, 0.14, 32), black, [px, p0 + 1.38, pz - 0.05]);
  // tank outlet -> valve -> pump inlet
  const sy = 0.5, sz = 1.6;
  straight([0, 0.95, 1.3], [0, sy, 1.3]); elbow([0, sy, 1.3]); straight([0, sy, 1.3], [0, sy, sz]); elbow([0, sy, sz]);
  ballValve([0, 0.75, 1.3], 'y');
  straight([0, sy, sz], [px, sy, sz]); ballValve([0.85, sy, sz], 'x'); elbow([px, sy, sz]);
  straight([px, sy, sz], [px, p0 + 0.34, sz]); elbow([px, p0 + 0.34, sz]); straight([px, p0 + 0.34, sz], [px, p0 + 0.34, pz + 0.36]);
  // drain
  straight([0, sy, sz], [-0.6, sy, sz]); ballValve([-0.35, sy, sz], 'x');
  // pump outlet -> check valve -> out of the skid
  const oy = p0 + 0.34;
  straight([px + 0.2, oy, pz], [3.3, oy, pz]);
  add(S.scene, new THREE.SphereGeometry(0.2, 32, 20), maroon, [2.75, oy, pz]);
  for (let k = 0; k < 6; k++) add(S.scene, new THREE.TorusGeometry(0.2, 0.014, 6, 32), maroon, [2.75, oy, pz], [(k * Math.PI) / 6, 0, Math.PI / 2]);
  for (const s2 of [-1, 1]) add(S.scene, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24), maroon, [2.75 + s2 * 0.24, oy, pz], [0, 0, Math.PI / 2]);
  add(S.scene, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), pvc, [3.3, oy, pz], [0, 0, Math.PI / 2]);

  // ---- cables from the panel ----
  const cable = new THREE.MeshStandardMaterial({ color: '#15181b', roughness: 0.7 });
  tube(S.scene, [[fx + 0.1, 3.55, 0.0], [fx - 0.1, top + 0.15, -0.3], [0.8, top + 0.5, -0.4], [-0.3, ty + 0.45, -0.3]], 0.04, cable);
  tube(S.scene, [[fx + 0.1, 2.55, 0.1], [fx + 0.05, 2.0, 0.4], [px + 0.25, p0 + 1.2, pz - 0.2]], 0.04, cable);

  rectShadow(S.scene, 5.1, 3.3, 0.45, 0.35, [0, 0.004, 0]);
  contactShadow(S.scene, 10, 6, 0.25, [0, 0.003, 0.2]);
  S.finish();
}
