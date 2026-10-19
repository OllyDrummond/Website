import { studio, THREE, contactShadow } from '../studio.js';
import { receiverWide } from '../devices.js';
// The in-house receiver, landscape, standing on a bench
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 10, fogFar: 26,
    cam: [1.05, 0.95, 3.5], target: [0, 0.36, 0], fov: 24, aperture: 0.02, softness: 1.0,
    key: [3, 7, 5], keyIntensity: 2.2, envIntensity: 0.7, fillIntensity: 0.45, samples: +(q.get('n') || 40) });
  const r = receiverWide(); r.rotation.y = -0.28; r.rotation.x = -0.1; r.position.z = 0.05; S.scene.add(r);
  contactShadow(S.scene, 1.9, 0.9, 0.5, [0, 0.003, -0.05]);
  S.finish();
}
