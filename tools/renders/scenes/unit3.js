import { studio, THREE, contactShadow, rectShadow } from '../studio.js';
import { unit2, probe2, cable, coilPoints } from '../unit.js';
// Studio shot of the tank unit with its probe cable coiled in front (like the product photo)
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 16, fogFar: 34,
    cam: [2.4, 4.4, 8.6], target: [0.25, 0.85, 0.2], fov: 26, aperture: 0.03, softness: 1.3,
    key: [1.5, 12, 3.5], keyIntensity: 2.3, envIntensity: 0.7, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);
  const u = unit2(); u.position.set(-0.6, 0, -0.9); u.rotation.y = 0.35; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());
  const pts = coilPoints(0.55, 1.15, 1.35, 0.9, 4);
  cable(root, [[gl.x, gl.y, gl.z], [gl.x + 0.1, 0.05, gl.z - 0.35], [1.0, 0.04, -1.0], [2.0, 0.04, 0.2], ...pts]);
  const end = pts[pts.length - 1];
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = 1.25; p.position.set(end[0] + 0.02, 0.105, end[2]); root.add(p);
  contactShadow(root, 5, 3.6, 0.22, [0.2, 0.003, 0.4]);
  rectShadow(u, 1.45, 1.12, 0.55, 0.18);
  rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  S.finish();
}
