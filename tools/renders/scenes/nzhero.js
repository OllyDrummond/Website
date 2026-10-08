import { studio, THREE, mat, add } from '../studio.js';
import { unit2, cable } from '../unit.js';
import { sky, terrain, ranges, cabbageTree, fence, polyTank } from '../nz.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const W = +(q.get('w') || 2400), H = +(q.get('h') || 1300);
  // unit on the dome, on the side facing the camera
  const r = 11.5, phi = 0.18;
  const S = studio({ w: W, h: H, bg: '#c9d4dc', floorY: null, fogNear: 3000, fogFar: 120000,
    cam: [Math.sin(phi) * r + 4.2, 26.4, Math.cos(phi) * r + 5.4], target: [Math.sin(phi) * r - 0.9, 24.9, Math.cos(phi) * r - 1.4], shift: -6, fov: 44,
    aperture: +(q.get('ap') || 0.035), softness: 0.6, key: [0, 0, 0], keyIntensity: 4.2, keyColor: '#ffe2bd',
    rim: [-30, 20, -40], rimIntensity: 0.6, rimColor: '#bcd6ff', envIntensity: 0.9, fillIntensity: 0.15,
    shadowSize: 30, exposure: 1.0, samples: +(q.get('n') || 40) });
  S.camera.near = 0.3; S.camera.far = 700000; S.camera.updateProjectionMatrix();
  const sun = sky(S, { elevation: 26, azimuth: 322 });
  S.key.position.copy(S.target).addScaledVector(sun, 400);
  // studio() jitters key around this point for soft shadows
  S.scene.fog = new THREE.Fog('#cddbe5', 5000, 240000);
  terrain(S, 160000, 380);
  ranges(S, { dist: 90000, height: 10000, dir: 0.15, width: 300000 });
  ranges(S, { dist: 45000, height: 2600, dir: -0.35, width: 200000 });
  const tank = polyTank(S.scene, { R: 17.5, H: 21 });
  // the unit sitting on the dome, tilted to its slope
  const y = tank.roofY(r);
  const slope = tank.roofSlope(r);
  const holder = new THREE.Group(); holder.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r); holder.rotation.y = phi; S.scene.add(holder);
  const tilt = new THREE.Group(); tilt.rotation.x = slope; holder.add(tilt);
  const u = unit2(); u.rotation.y = -0.55; u.position.y = 0.02; tilt.add(u);
  u.updateMatrixWorld(true);
  const gl = tilt.worldToLocal(u.localToWorld(u.userData.glandOut.clone()));
  cable(tilt, [[gl.x, gl.y, gl.z], [gl.x - 0.4, 0.05, gl.z - 0.2], [-1.6, 0.03, -1.2], [-2.6, 0.03, -3.4]], 0.035);
  // small cable entry gland on the dome
  add(tilt, new THREE.CylinderGeometry(0.22, 0.26, 0.18, 24), mat.plastic('#1d2420', 0.6), [-2.6, 0.08, -3.5]);
  // farm surroundings
  fence(S, -900, -260, 700, -140, 32);
  [[-420, -700, 1.1], [-260, -1500, 1.3], [520, -980, 1.0], [880, -2200, 1.4], [-1200, -2600, 1.2], [200, -3400, 1.3]].forEach(([x, z, s], i) => cabbageTree(S, x, z, s, i + 1));
  S.finish();
}
