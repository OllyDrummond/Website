import { studio, THREE, mat, contactShadow, rectShadow } from '../studio.js';
import { pumpController } from '../devices.js';
import { cable } from '../unit.js';
// The pump controller standing upright, screen showing "TANK RUNNING", with the
// pump cable leaving its gland
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 12, fogFar: 30,
    cam: [1.8, 1.35, 6.2], target: [-0.1, 1.0, 0.2], fov: 28, aperture: 0.02, softness: 1.1,
    key: [3, 8, 6], keyIntensity: 2.2, envIntensity: 0.9, fillIntensity: 0.45, samples: +(q.get('n') || 40) });
  const c = pumpController({ upright: true, screen: ['TANK', 'RUNNING'] }); c.rotation.y = -0.2; S.scene.add(c);
  c.updateMatrixWorld(true);
  const gl = c.localToWorld(c.userData.glandOut.clone());
  cable(S.scene, [[gl.x + 0.05, gl.y, gl.z], [gl.x - 0.25, gl.y - 0.1, gl.z + 0.05], [gl.x - 0.45, 0.06, gl.z + 0.5], [gl.x - 0.9, 0.05, gl.z + 1.5], [gl.x - 1.7, 0.05, gl.z + 2.4]], 0.06);
  const d = c.userData.depth;
  rectShadow(c, 1.66, d + 0.06, 0.6, 0.16, [0, 0.004, d / 2]); rectShadow(c, 1.62, d, 0.85, 0.04, [0, 0.005, d / 2]);
  S.finish();
}
