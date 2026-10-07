import { studio, THREE, mat, add, corrugatedCylinder, sensorUnit } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const S = studio({ w: 2400, h: 1300, bg: '#1b2126', floorY: -3.2, floor: '#232a30', fogNear: 12, fogFar: 40,
    cam: [3.6, 3.3, 12.6], target: [0.2, 1.2, 3.5], shift: -7, fov: 24, aperture: 0.05, softness: 1.2,
    key: [7, 10, 8], keyIntensity: 3.0, rim: [-8, 5, -3], rimIntensity: 2.6, rimColor: '#8fc2ff',
    envIntensity: 0.3, fillIntensity: 0.2, shadowSize: 8, samples: 48 });
  const steel = new THREE.MeshStandardMaterial({ color: '#a3acb1', metalness: 0.85, roughness: 0.5 });
  add(S.scene, corrugatedCylinder(5, 3.2), steel, [0, -1.6, 0]);
  const slope = Math.atan(0.7 / 5.1);
  add(S.scene, new THREE.ConeGeometry(5.1, 0.7, 160, 1, true), steel, [0, 0.35, 0]);
  // roof seams
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const rib = new THREE.Group(); rib.rotation.y = a; S.scene.add(rib);
    add(rib, new THREE.BoxGeometry(0.05, 0.04, 5.1), mat.metal('#9ba4a9', 0.45), [0, 0.37, 2.55], [slope, 0, 0]);
  }
  add(S.scene, new THREE.TorusGeometry(5.05, 0.06, 12, 200), mat.metal('#9aa3a8', 0.35), [0, 0.0, 0], [Math.PI / 2, 0, 0]);
  const mount = new THREE.Group();
  const r = 3.5, h = 0.7 * (1 - r / 5.1);
  mount.position.set(0, h + 0.02, r);
  mount.rotation.x = slope;
  S.scene.add(mount);
  add(mount, new THREE.CylinderGeometry(0.95, 0.95, 0.1, 64), mat.plastic('#3a4147', 0.6), [0, 0.03, 0]);
  const unit = sensorUnit(RoundedBoxGeometry);
  unit.position.y = 0.08; unit.rotation.y = -0.35;
  mount.add(unit);
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.85, 0.48, 0.45), new THREE.Vector3(-1.3, 0.2, 0.7), new THREE.Vector3(-2.4, 0.1, 0.6), new THREE.Vector3(-3.8, 0.08, 1.2),
  ]);
  add(mount, new THREE.TubeGeometry(cable, 80, 0.04, 12), mat.rubber('#111417'));
  S.finish();
}
