import { studio, THREE, contactShadow, rectShadow } from '../studio.js';
import { unit2, probe2, cable, coilPoints } from '../unit.js';
import { receiverWide } from '../devices.js';
// Product card: the tank monitor (tank unit + probe) and the receiver turned on its side, 4:3
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: [0.9, 3.4, 7.4], target: [-0.05, 0.85, -0.1], fov: 28, aperture: 0.02, softness: 1.3,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);
  const u = unit2(); u.position.set(-1.05, 0, -0.85); u.rotation.y = 0.4; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());
  const pts = coilPoints(-1.15, 0.85, 0.9, 0.55, 3);
  cable(root, [[gl.x, gl.y, gl.z], [gl.x + 0.1, 0.05, gl.z - 0.3], [0.4, 0.04, -1.3], [0.3, 0.04, 0.3], ...pts]);
  const end = pts[pts.length - 1];
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = 1.15; p.position.set(end[0] + 0.02, 0.105, end[2]); root.add(p);
  const r = receiverWide(); r.position.set(1.25, 0, 0.75); r.rotation.y = -0.32; r.rotation.x = -0.08; root.add(r);
  rectShadow(u, 1.45, 1.12, 0.55, 0.18); rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  rectShadow(r, 1.15, 0.3, 0.6, 0.12, [0, 0.005, -0.02]);
  contactShadow(root, 8, 4, 0.2, [0, 0.003, 0.2]);
  S.finish();
}
