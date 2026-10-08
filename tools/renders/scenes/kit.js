import { studio, THREE, mat, add, contactShadow } from '../studio.js';
import { unit, probe, cable, coilPoints } from '../unit.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1200), h: +(q.get('h') || 900), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 16, fogFar: 34,
    cam: [0, 4.4, 9.6], target: [0, 1.0, 0], fov: 28, aperture: 0.03, softness: 1.3,
    key: [4, 10, 6], keyIntensity: 2.3, envIntensity: 0.6, fillIntensity: 0.4, samples: +(q.get('n') || 16) });
  const root = new THREE.Group(); S.scene.add(root);
  const u = unit(); u.position.set(-0.6, 0.18, -0.6); u.rotation.y = 0.35; root.add(u);
  // the coil and probe lying in front
  const pts = coilPoints(0.6, 1.2, 1.5, 1.0, 4);
  cable(root, [[-0.25, 0.08, -0.55], [-0.1, 0.05, 0.1], ...pts.slice(0, 1)].concat(pts.slice(1)));
  const p = probe(); p.rotation.z = Math.PI / 2 * 0.98; p.rotation.y = 0.5; p.position.set(-0.3, 0.14, 1.6); root.add(p);
  cable(root, [pts[pts.length - 1], [pts[pts.length - 1][0] - 0.3, 0.06, pts[pts.length - 1][2] + 0.2], [-0.3, 0.14, 1.6]]);
  contactShadow(root, 5.5, 4.5, 0.3, [0.1, 0.003, 0.4]); contactShadow(root, 2.6, 2.2, 0.5, [-0.6, 0.004, -0.6]);
  const frames = +(q.get('frames') || 1);
  S.turntable(frames, (i) => { root.rotation.y = (i / frames) * Math.PI * 2; });
}
