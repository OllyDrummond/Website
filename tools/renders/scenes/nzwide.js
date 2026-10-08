import { studio, THREE, mat, add } from '../studio.js';
import { unit2, cable } from '../unit.js';
import { sky, terrain, ranges, cabbageTree, fence, polyTank, groundY, grassTufts } from '../nz.js';
// Wide farm shot: poly tank in the paddock with the monitor on the lid, ranges behind
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 2400), h: +(q.get('h') || 1100), bg: '#c9d4dc', floorY: null,
    cam: [-46, 13, 72], target: [-4, 15, 0], shift: -8, fov: 40, aperture: 0.12, softness: 4,
    key: [0, 0, 0], keyIntensity: 4.2, keyColor: '#ffe2bd', rim: [-30, 20, -40], rimIntensity: 0.5, rimColor: '#bcd6ff',
    envIntensity: 0.9, fillIntensity: 0.15, shadowSize: 60, exposure: 1.0, samples: +(q.get('n') || 40) });
  S.camera.near = 1; S.camera.far = 700000; S.camera.updateProjectionMatrix();
  const sun = sky(S, { elevation: 28, azimuth: 300 });
  S.key.position.copy(S.target).addScaledVector(sun, 600);
  S.scene.fog = new THREE.Fog('#cddbe5', 5000, 240000);
  terrain(S, 160000, 380);
  ranges(S, { dist: 90000, height: 10000, dir: 0.35, width: 300000 });
  ranges(S, { dist: 45000, height: 2600, dir: -0.1, width: 200000 });
  const tank = polyTank(S.scene, { R: 17.5, H: 21 });
  // monitor on the lid: scaled up a little so it reads at this distance
  const r = 10, phi = -0.55, y = tank.roofY(r);
  const holder = new THREE.Group(); holder.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r); holder.rotation.y = phi; S.scene.add(holder);
  const tilt = new THREE.Group(); tilt.rotation.x = tank.roofSlope(r); holder.add(tilt);
  const u = unit2(); u.scale.setScalar(1.3); u.rotation.y = 0.6; tilt.add(u);
  add(S.scene, new THREE.CylinderGeometry(20, 20.5, 1, 64), mat.plastic('#b9bab4', 0.9), [0, -0.4, 0]);
  grassTufts(S, -40, 60, 110, 26000);
  grassTufts(S, 0, 0, 40, 3000, 9);
  fence(S, -900, -160, 700, -40, 32);
  fence(S, -400, 300, -420, -160, 32);
  [[-420, -700, 1.1], [-260, -1500, 1.3], [520, -980, 1.0], [880, -2200, 1.4], [-1200, -2600, 1.2], [200, -3400, 1.3], [-650, -420, 0.9]].forEach(([x, z, s], i) => cabbageTree(S, x, z, s, i + 1));
  S.finish();
}
