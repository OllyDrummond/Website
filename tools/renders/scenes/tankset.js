import { studio, THREE, contactShadow, rectShadow } from '../studio.js';
import { unit2, probe2, cable, looseCoil } from '../unit.js';
import { receiverWide, phone, phoneStand } from '../devices.js';
// Product card: the tank monitor (tank unit + probe), the receiver on its side,
// and a phone showing the same reading in the app. 4:3.
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: [0.8, 3.5, 8.1], target: [0.25, 0.95, -0.15], fov: 29, aperture: 0.02, softness: 1.3,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);

  // tank unit
  const u = unit2(); u.position.set(-1.45, 0, -0.95); u.rotation.y = 0.4; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());

  // cable: drops from the gland behind the unit, comes round the side, lies in a loose coil, then runs out to the probe
  const coil = looseCoil(-1.05, 1.05, { loops: 2.5, r: 0.82, aspect: 0.58, phase: -0.9 });
  const start = coil[0], end = coil[coil.length - 1];
  const lead = [[gl.x, gl.y, gl.z], [gl.x + 0.12, gl.y - 0.1, gl.z - 0.12], [gl.x + 0.35, 0.05, gl.z - 0.05], [-0.25, 0.04, -0.55], [start[0] + 0.25, 0.04, start[2] - 0.35]];
  const tail = [[end[0] + 0.25, 0.05, end[2] + 0.2], [-0.3, 0.045, 1.5], [0.1, 0.045, 1.52]];
  cable(root, [...lead, ...coil, ...tail]);
  const last = tail[tail.length - 1];
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = 0.12; p.position.set(last[0] + 0.02, 0.105, last[2]); root.add(p);

  // receiver, a little larger and further back
  const r = receiverWide(); r.scale.setScalar(1.22); r.position.set(0.75, 0, 0.0); r.rotation.y = -0.22; r.rotation.x = -0.08; root.add(r);

  // phone on a stand beside the receiver
  const st = new THREE.Group(); st.position.set(2.15, 0, 0.3); st.rotation.y = -0.45; root.add(st);
  st.add(phoneStand());
  const ph = phone(); ph.rotation.x = -0.32; ph.position.set(0, 0.1 + 0.76 * Math.cos(0.32), 0.1 - 0.76 * Math.sin(0.32)); st.add(ph);

  rectShadow(u, 1.45, 1.12, 0.55, 0.18); rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  rectShadow(r, 1.15, 0.3, 0.6, 0.12, [0, 0.005 / 1.22, -0.02]);
  rectShadow(st, 0.7, 0.6, 0.55, 0.1, [0, 0.005, 0]);
  contactShadow(root, 8, 4, 0.2, [0, 0.003, 0.2]);
  S.finish();
}
