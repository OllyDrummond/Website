import { studio, THREE, mat, add } from '../studio.js';
import { unit2, probe2, cable, coilPoints } from '../unit.js';
import { filtrationUnit, dosingSet } from '../products.js';
// Kinetiq product family on a dark stage: filtration, tank monitor, acid dosing
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 2400), h: +(q.get('h') || 1200), bg: '#1b2126', floor: '#1f262c', fogNear: 30, fogFar: 80,
    cam: [0, 7.2, 26], target: [0.2, +(q.get('ty') || 4.6), 0], shift: +(q.get('shift') || 0), fov: 26, aperture: 0.05, softness: 2.2,
    key: [6, 16, 12], keyIntensity: 2.6, rim: [-10, 8, -9], rimIntensity: 2.6, rimColor: '#8fc2ff',
    envIntensity: 0.4, fillIntensity: 0.18, shadowSize: 16, samples: +(q.get('n') || 40) });
  // maroon back light for brand colour on the edges
  const back = new THREE.DirectionalLight('#c2384f', 1.6); back.position.set(8, 6, -12); S.scene.add(back);
  const podium = (x, r) => {
    add(S.scene, new THREE.CylinderGeometry(r, r + 0.15, 0.5, 96), new THREE.MeshPhysicalMaterial({ color: '#2a3238', roughness: 0.35, clearcoat: 0.6 }), [x, 0.25, 0]);
    add(S.scene, new THREE.TorusGeometry(r + 0.02, 0.025, 8, 160), mat.glow('#9b2335', 1.4), [x, 0.5, 0], [Math.PI / 2, 0, 0], false);
  };
  podium(-8.4, 3.1); podium(0, 3.0); podium(8.4, 3.1);
  // left: smart filtration
  const f = filtrationUnit(); f.scale.setScalar(0.6); f.position.set(-8.7, 0.5, 0.6); f.rotation.y = 0.32; S.scene.add(f);
  // centre: tank monitor with its probe and cable
  const c = new THREE.Group(); c.position.set(0, 0.5, 0.4); S.scene.add(c);
  const u = unit2(); u.scale.setScalar(2.1); u.rotation.y = -0.35; u.position.set(-0.3, 0, -0.6); c.add(u);
  u.updateMatrixWorld(true);
  const gl = c.worldToLocal(u.localToWorld(u.userData.glandOut.clone()));
  const pts = coilPoints(0.6, 1.1, 1.9, 1.15, 3, 0.09);
  cable(c, [[gl.x, gl.y, gl.z], [gl.x - 0.3, 0.12, gl.z + 0.4], [-1.6, 0.1, 1.0], ...pts], 0.07);
  const end = pts[pts.length - 1];
  const p = probe2(); p.scale.setScalar(2); p.rotation.z = -Math.PI / 2; p.rotation.y = 0.5; p.position.set(end[0] - 0.05, 0.22, end[2]); c.add(p);
  // right: acid dosing
  const d = dosingSet(); d.scale.setScalar(0.68); d.position.set(8.3, 0.5, 0.4); d.rotation.y = -0.3; S.scene.add(d);
  S.finish();
}
