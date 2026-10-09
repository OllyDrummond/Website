import { studio, THREE, mat, contactShadow, rectShadow } from '../studio.js';
import { pumpController } from '../devices.js';
import { cable } from '../unit.js';
// The pump controller, with the pump cable leaving its gland
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 12, fogFar: 30,
    cam: [2.6, 3.0, 5.6], target: [-0.15, 0.95, 0], fov: 30, aperture: 0.02, softness: 1.1,
    key: [3, 8, 5], keyIntensity: 2.2, envIntensity: 0.9, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const c = pumpController(); c.rotation.y = 0.25; S.scene.add(c);
  c.updateMatrixWorld(true);
  const gl = c.localToWorld(c.userData.glandOut.clone());
  cable(S.scene, [[gl.x + 0.05, gl.y, gl.z], [gl.x - 0.2, 0.15, gl.z + 0.1], [gl.x - 0.7, 0.05, gl.z + 0.8], [gl.x - 1.6, 0.05, gl.z + 1.4]], 0.06);
  rectShadow(c, 1.62, 0.98, 0.6, 0.16); rectShadow(c, 1.6, 0.96, 0.8, 0.04, [0, 0.005, 0]);
  S.finish();
}
