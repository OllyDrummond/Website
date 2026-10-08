import { studio, THREE, contactShadow } from '../studio.js';
import { unit2, probe2, cable, coilPoints } from '../unit.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 16, fogFar: 34,
    cam: [2.2, 3.6, 7.6], target: [0.15, 0.75, 0.3], fov: 27, aperture: 0.03, softness: 1.3,
    key: [4, 10, 6], keyIntensity: 2.3, envIntensity: 0.65, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);
  const u = unit2(); u.position.set(-0.4, 0, -0.5); u.rotation.y = 0.3; root.add(u);
  u.updateMatrixWorld(true);
  const gland = u.localToWorld(u.userData.glandOut.clone());
  const pts = coilPoints(0.7, 1.15, 1.45, 0.95, 4);
  cable(root, [[gland.x, gland.y, gland.z], [gland.x - 0.25, 0.06, gland.z + 0.3], [-1.0, 0.04, 0.9], ...pts]);
  const end = pts[pts.length - 1];
  const p = probe2(); p.rotation.x = -Math.PI / 2; p.rotation.y = -0.15; p.position.set(end[0], 0.105, end[2] + 0.02); root.add(p);
  contactShadow(root, 6, 4.4, 0.28, [0.2, 0.003, 0.5]);
  contactShadow(root, 2.4, 2.1, 0.45, [-0.4, 0.004, -0.5]);
  S.finish();
}
