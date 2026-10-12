import { studio, THREE, contactShadow, rectShadow } from '../studio.js';
import { unit2, probe2, cable } from '../unit.js';
import { receiverWide, phone } from '../devices.js';
// Product card: the tank monitor (tank unit + probe), the receiver on its side,
// and a phone showing the same reading in the app. 4:3.
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: [0.6, 4.6, 8.3], target: [0.3, 0.9, 0.0], fov: 30, aperture: 0.02, softness: 1.3,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);

  // tank unit
  const u = unit2(); u.position.set(-1.55, 0, -1.05); u.rotation.y = 0.4; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());

  // cable: neatly coiled like the product photo, with the probe lying off to the side
  const coil = [], turns = 4, cx = -0.95, cz = 0.85, rx = 0.72, rz = 0.46;
  for (let i = 0; i <= turns * 48; i++) {
    const t = (i / 48) * Math.PI * 2 - 1.2, k = i / (turns * 48);
    const grow = k * turns * 0.085, wob = 0.01 * Math.sin(t * 3);
    coil.push([cx + Math.cos(t) * (rx + grow + wob), 0.036 + 0.006 * Math.max(0, Math.sin(t * 2)), cz + Math.sin(t) * (rz + grow * 0.7 + wob)]);
  }
  const c0 = coil[0], c1 = coil[coil.length - 1];
  const lead = [[gl.x, gl.y, gl.z], [gl.x + 0.12, gl.y - 0.1, gl.z - 0.12], [gl.x + 0.3, 0.05, gl.z + 0.05], [c0[0] + 0.15, 0.04, c0[2] - 0.25]];
  const tail = [[c1[0] + 0.3, 0.045, c1[2] + 0.3], [0.05, 0.045, 1.75], [0.45, 0.045, 1.85]];
  cable(root, [...lead, ...coil, ...tail]);
  const last = tail[tail.length - 1];
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = 0.05; p.position.set(last[0], 0.105, last[2]); root.add(p);

  // receiver standing upright, a little larger
  const r = receiverWide(); r.scale.setScalar(1.4); r.position.set(0.9, 0, -0.35); r.rotation.y = -0.2; r.rotation.x = -0.08; root.add(r);

  // phone lying flat on the ground beside it, screen up
  const pg = new THREE.Group(); pg.position.set(2.4, 0, 0.85); pg.rotation.y = -0.3; root.add(pg);
  const ph = phone(); ph.rotation.x = -Math.PI / 2; ph.position.y = 0.04; pg.add(ph);

  rectShadow(u, 1.45, 1.12, 0.55, 0.18); rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  rectShadow(r, 1.15, 0.3, 0.6, 0.12, [0, 0.004, -0.02]);
  rectShadow(pg, 0.74, 1.52, 0.5, 0.06, [0, 0.005, 0]);
  contactShadow(root, 8, 4, 0.2, [0, 0.003, 0.2]);
  S.finish();
}
