import { studio, THREE, contactShadow, rectShadow } from '../studio.js';
import { unit2, probe2, cable, coilPoints } from '../unit.js';
import { receiver, pumpController } from '../devices.js';
// The whole system: tank unit + probe, receiver, pump controller
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 2000), h: +(q.get('h') || 1100), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: [0.6, 3.9, 9.4], target: [0.35, 0.85, 0.1], fov: 26, aperture: 0.02, softness: 1.3,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);
  const u = unit2(); u.position.set(-2.4, 0, -0.5); u.rotation.y = 0.35; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());
  const pts = coilPoints(-2.0, 1.25, 1.1, 0.7, 3);
  cable(root, [[gl.x, gl.y, gl.z], [gl.x + 0.1, 0.05, gl.z - 0.3], [-0.9, 0.04, -0.7], [-0.7, 0.04, 0.6], ...pts]);
  const end = pts[pts.length - 1];
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = 0.6; p.position.set(end[0] + 0.02, 0.105, end[2]); root.add(p);
  const r = receiver(); r.position.set(0.55, 0, -0.2); r.rotation.y = -0.15; r.rotation.x = -0.1; root.add(r);
  const c = pumpController(); c.position.set(2.75, 0, 0.1); c.rotation.y = -0.35; root.add(c);
  c.updateMatrixWorld(true);
  const cg = c.localToWorld(c.userData.glandOut.clone());
  cable(root, [[cg.x + 0.05, cg.y, cg.z], [cg.x - 0.25, 0.12, cg.z + 0.2], [cg.x - 0.4, 0.06, cg.z + 1.2], [cg.x - 0.3, 0.06, cg.z + 2.6], [cg.x - 0.6, 0.06, cg.z + 6]], 0.055);
  rectShadow(u, 1.45, 1.12, 0.55, 0.18); rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  contactShadow(root, 1.2, 0.8, 0.5, [0.55, 0.004, -0.25]);
  rectShadow(c, 1.62, 0.98, 0.6, 0.16); rectShadow(c, 1.6, 0.96, 0.8, 0.04, [0, 0.005, 0]);
  contactShadow(root, 8, 4, 0.2, [0, 0.003, 0.4]);
  S.finish();
}
