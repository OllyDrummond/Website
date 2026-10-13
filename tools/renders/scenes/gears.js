// Custom machine design service image: the original gear train, tailored to
// what Kinetiq builds. A DC gear motor drives the maroon pinion, an inductive
// proximity sensor reads the big gear's teeth, a rotary encoder sits on the
// back shaft, and all three are wired to a small Kinetiq controller board.
import { studio, THREE, mat, add, gearGeo, tube, canvasTex } from '../studio.js';
import { SERVICE_STUDIO } from '../service-studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ ...SERVICE_STUDIO, w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), cam: [0.1, 5.3, 8.4], target: [-0.05, 0.35, -0.75], aperture: 0.06, samples: +(q.get('n') || 56) });
  const steel = mat.metal('#c4cacd', 0.32), dark = mat.metal('#5d666c', 0.45);
  const maroon = new THREE.MeshStandardMaterial({ color: '#7a1f2b', metalness: 0.7, roughness: 0.35 });
  const black = mat.plastic('#1c2024', 0.5), wire = mat.rubber('#101214');

  const gear = (t, ro, rr, x, z, y, m, rot) => {
    add(S.scene, gearGeo(t, ro, rr, 0.22, 0.14), m, [x, y, z], [-Math.PI / 2, 0, rot]);
    add(S.scene, new THREE.CylinderGeometry(0.14, 0.14, y + 0.3, 32), steel, [x, (y + 0.3) / 2, z]);
    add(S.scene, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 6), steel, [x, y + 0.17, z]);
  };
  gear(36, 1.42, 1.3, -0.9, 0, 0.7, steel, 0);
  gear(18, 0.76, 0.64, 1.18, 0.05, 0.7, maroon, 0.08);
  gear(24, 1.0, 0.88, 1.45, -1.55, 0.4, steel, 0.1);

  // DC gear motor standing under the maroon pinion
  const mx = 1.18, mz = 0.05;
  add(S.scene, new THREE.CylinderGeometry(0.4, 0.4, 0.42, 48), mat.metal('#b8bfc4', 0.28), [mx, 0.23, mz]);
  add(S.scene, new THREE.CylinderGeometry(0.4, 0.4, 0.04, 48), steel, [mx, 0.02, mz]);
  add(S.scene, new THREE.CylinderGeometry(0.405, 0.405, 0.12, 48), maroon, [mx, 0.3, mz]);
  add(S.scene, new THREE.CylinderGeometry(0.42, 0.42, 0.2, 48), black, [mx, 0.54, mz]);
  for (const a of [0.6, 2.2, 3.8, 5.4]) add(S.scene, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), steel, [mx + Math.cos(a) * 0.32, 0.66, mz + Math.sin(a) * 0.32]);
  // motor terminals and leads (red / black) to the controller
  const term = (dx, c) => { add(S.scene, new THREE.BoxGeometry(0.05, 0.1, 0.03), mat.metal('#d6b15a', 0.25), [mx + dx, 0.17, mz + 0.41]);
    return c; };
  term(-0.08); term(0.08);

  // inductive proximity sensor (M18) aimed at the big gear's teeth, on an angle bracket
  const sy = 0.81, sz = 0.35, tipX = -2.42;
  const sensor = new THREE.Group(); sensor.position.set(tipX, sy, sz); S.scene.add(sensor);
  add(sensor, new THREE.CylinderGeometry(0.16, 0.16, 0.95, 40), mat.metal('#b9a26a', 0.3), [-0.5, 0, 0], [0, 0, Math.PI / 2]);
  for (let k = 0; k < 24; k++) add(sensor, new THREE.TorusGeometry(0.16, 0.012, 6, 40), mat.metal('#a58f5c', 0.35), [-0.12 - k * 0.032, 0, 0], [0, Math.PI / 2, 0], false);
  add(sensor, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 40), mat.plastic('#3a4045', 0.4), [0.0, 0, 0], [0, 0, Math.PI / 2]);
  for (const x of [-0.3, -0.62]) add(sensor, new THREE.CylinderGeometry(0.24, 0.24, 0.08, 6), steel, [x, 0, 0], [0, 0, Math.PI / 2]);
  add(sensor, new THREE.CylinderGeometry(0.15, 0.15, 0.16, 32), mat.plastic('#e8eaeb', 0.3), [-1.05, 0, 0], [0, 0, Math.PI / 2]);
  add(sensor, new THREE.TorusGeometry(0.15, 0.025, 10, 32), mat.glow('#ff9a2e', 2.2), [-1.0, 0, 0], [0, Math.PI / 2, 0]);
  add(sensor, new THREE.CylinderGeometry(0.06, 0.08, 0.2, 20), black, [-1.2, 0, 0], [0, 0, Math.PI / 2]);
  // bracket: upright plate the sensor passes through, with a foot
  add(S.scene, new THREE.BoxGeometry(0.06, 1.05, 0.62), mat.metal('#8d969b', 0.4), [tipX - 0.46, 0.525, sz]);
  add(S.scene, new THREE.BoxGeometry(0.5, 0.06, 0.62), mat.metal('#8d969b', 0.4), [tipX - 0.7, 0.03, sz]);

  // rotary encoder on top of the back gear's shaft
  const ex = 1.45, ez = -1.55;
  add(S.scene, new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16), steel, [ex, 0.72, ez]);
  add(S.scene, new THREE.CylinderGeometry(0.3, 0.3, 0.32, 48), mat.metal('#9aa3a8', 0.3), [ex, 0.95, ez]);
  add(S.scene, new THREE.CylinderGeometry(0.31, 0.31, 0.06, 48), maroon, [ex, 1.08, ez]);
  add(S.scene, new THREE.CylinderGeometry(0.29, 0.29, 0.02, 48), black, [ex, 1.12, ez]);
  add(S.scene, new THREE.CylinderGeometry(0.07, 0.07, 0.18, 20), black, [ex + 0.32, 0.95, ez], [0, 0, Math.PI / 2]);

  // Kinetiq controller board on the right with a green terminal block
  const B = new THREE.Group(); B.position.set(3.15, 0.12, 0.55); B.rotation.y = -0.35; S.scene.add(B);
  for (const [x, z] of [[-0.52, -0.33], [0.52, -0.33], [-0.52, 0.33], [0.52, 0.33]]) add(B, new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), mat.metal('#d6b15a', 0.25), [x, -0.06, z]);
  const tex = canvasTex(512, 340, (c, w, h) => {
    c.fillStyle = '#0d3f86'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6fa6e8'; c.lineWidth = 3;
    for (let i = 0; i < 26; i++) { const y = 40 + i * 11; c.beginPath(); c.moveTo(60 + (i % 5) * 18, y); c.lineTo(230, y); c.lineTo(260, y + 24); c.lineTo(470, y + 24); c.stroke(); }
    c.fillStyle = '#e8eef5'; c.font = '700 30px Inter'; c.fillText('KINETIQ  MC-1', 24, h - 20);
  });
  const edge = new THREE.MeshStandardMaterial({ color: '#0b346e', roughness: 0.5 });
  add(B, new THREE.BoxGeometry(1.2, 0.04, 0.8), [edge, edge, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.7 }), edge, edge, edge], [0, 0.02, 0]);
  add(B, new THREE.BoxGeometry(0.32, 0.05, 0.32), mat.plastic('#15181b', 0.5), [-0.1, 0.065, 0.02]);
  add(B, new THREE.BoxGeometry(0.18, 0.04, 0.12), mat.plastic('#15181b', 0.5), [0.32, 0.06, 0.14]);
  add(B, new THREE.BoxGeometry(0.05, 0.03, 0.03), mat.glow('#3fbf7f', 2), [0.4, 0.055, 0.3]);
  add(B, new THREE.BoxGeometry(0.05, 0.03, 0.03), mat.glow('#ff9a2e', 2), [0.48, 0.055, 0.3]);
  for (let i = 0; i < 6; i++) {
    const x = -0.45 + i * 0.18;
    add(B, new RoundedBoxGeometry(0.17, 0.16, 0.2, 2, 0.02), mat.plastic('#2f9d63', 0.45), [x, 0.12, -0.28]);
    add(B, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), mat.metal('#c7ccd0', 0.3), [x, 0.205, -0.25]);
  }
  B.updateMatrixWorld(true);
  const port = (i) => { const v = B.localToWorld(new THREE.Vector3(-0.45 + i * 0.18, 0.13, -0.39)); return [v.x, v.y, v.z]; };

  // cables: soft curves lying on the floor into the terminal block
  const cab = (pts, r = 0.035) => tube(S.scene, pts, r, wire, 200);
  const p0 = port(0), p1 = port(1), p2 = port(2), p3 = port(3);
  cab([[tipX - 1.3, sy, sz], [tipX - 1.55, 0.5, sz], [tipX - 1.6, 0.04, sz - 0.4], [-3.0, 0.04, -1.6], [-1.2, 0.04, -2.05], [0.3, 0.04, -2.3], [2.4, 0.04, -1.9], [p0[0] - 0.1, 0.04, p0[2] - 0.5], p0]);
  cab([[ex + 0.42, 0.95, ez], [ex + 0.62, 0.6, ez + 0.05], [ex + 0.72, 0.04, ez + 0.3], [p1[0] - 0.05, 0.04, p1[2] - 0.45], p1]);
  tube(S.scene, [[mx - 0.08, 0.14, mz + 0.43], [mx - 0.05, 0.05, mz + 0.65], [mx + 0.6, 0.03, mz + 0.8], [p2[0] - 0.2, 0.03, p2[2] - 0.35], p2], 0.022, mat.plastic('#b3262f', 0.5), 200);
  tube(S.scene, [[mx + 0.08, 0.14, mz + 0.43], [mx + 0.12, 0.05, mz + 0.62], [mx + 0.7, 0.03, mz + 0.72], [p3[0] - 0.2, 0.03, p3[2] - 0.35], p3], 0.022, mat.plastic('#1a1c1e', 0.5), 200);
  S.finish();
}
