import { studio, THREE, mat, add, sensorUnit, contactShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const S = studio({ w: 1600, h: 1200, bg: '#e7eaec', floor: '#e4e7e9', fogNear: 14, fogFar: 30,
    cam: [4.2, 3.0, 6.0], target: [0, 1.15, 0], fov: 25, aperture: 0.03, softness: 1.2,
    key: [4, 9, 5], keyIntensity: 2.4, rim: [-6, 4, -5], rimIntensity: 1.2, envIntensity: 0.55, fillIntensity: 0.35, samples: 48 });
  const u = sensorUnit(RoundedBoxGeometry); u.rotation.y = -0.25; S.scene.add(u);
  contactShadow(S.scene, 2.6, 2.6, 0.55);
  S.finish();
}
