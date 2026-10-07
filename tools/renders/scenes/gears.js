import { studio, THREE, mat, add, gearGeo } from '../studio.js';
export default function () {
  const S = studio({ w: 1600, h: 1000, bg: '#161b20', floor: '#1d2329', fogNear: 8, fogFar: 22, cam: [0.8, 3.4, 6.2], target: [0.2, 0.7, 0], fov: 30,
    aperture: 0.08, softness: 1.0, key: [3, 7, 3], keyIntensity: 2.8, rim: [-5, 3, -4], rimIntensity: 2.4, envIntensity: 0.45, fillIntensity: 0.15, shadowSize: 5, samples: 56 });
  const steel = mat.metal('#c4cacd', 0.32);
  const maroon = new THREE.MeshStandardMaterial({ color: '#7a1f2b', metalness: 0.7, roughness: 0.35 });
  // base plate
  add(S.scene, new THREE.BoxGeometry(6, 0.2, 3.6), mat.metal('#5d666c', 0.5), [0.2, 0.1, -0.2]);
  for (const [x, z] of [[-2.5, -1.7], [2.9, -1.7], [-2.5, 1.3], [2.9, 1.3]]) add(S.scene, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 6), steel, [x, 0.23, z]);
  const gear = (t, ro, rr, x, z, y, m, rot) => {
    add(S.scene, gearGeo(t, ro, rr, 0.22, 0.14), m, [x, y, z], [-Math.PI / 2, 0, rot]);
    add(S.scene, new THREE.CylinderGeometry(0.14, 0.14, y + 0.3, 32), steel, [x, (y + 0.3) / 2, z]);
    add(S.scene, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 6), steel, [x, y + 0.17, z]);
  };
  gear(36, 1.42, 1.3, -0.9, 0, 0.9, steel, 0);
  gear(18, 0.76, 0.64, 1.18, 0.05, 0.9, maroon, 0.08);
  gear(24, 1.0, 0.88, 1.45, -1.55, 0.6, steel, 0.1);
  // bearing block
  add(S.scene, new THREE.BoxGeometry(0.7, 0.5, 0.6), mat.metal('#8d969b', 0.4), [2.6, 0.45, 0.8]);
  add(S.scene, new THREE.CylinderGeometry(0.1, 0.1, 2.4, 24), steel, [2.0, 0.55, 0.8], [0, 0, Math.PI / 2]);
  S.finish();
}
