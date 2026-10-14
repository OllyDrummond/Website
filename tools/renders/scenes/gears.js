// Custom machine design service image (gears.webp): the three-gear train on
// the lit studio floor. gearsStudio() holds its exact studio, light and camera
// so the PCB and PLC images can share this background pixel for pixel.
import { THREE, mat, add, gearGeo } from '../studio.js';
import { gearsStudio } from '../service-studio.js';

export default function () {
  const S = gearsStudio(new URLSearchParams(location.search));
  const st = mat.metal('#c4cacd', 0.32);
  const mr = new THREE.MeshStandardMaterial({ color: '#7a1f2b', metalness: 0.7, roughness: 0.35 });
  const gear = (t, ro, rr, x, z, y, m, rot) => {
    add(S.scene, gearGeo(t, ro, rr, 0.22, 0.14), m, [x, y, z], [-Math.PI / 2, 0, rot]);
    add(S.scene, new THREE.CylinderGeometry(0.14, 0.14, y + 0.3, 32), st, [x, (y + 0.3) / 2, z]);
    add(S.scene, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 6), st, [x, y + 0.17, z]);
  };
  gear(36, 1.42, 1.3, -0.9, 0, 0.7, st, 0); gear(18, 0.76, 0.64, 1.18, 0.05, 0.7, mr, 0.08); gear(24, 1.0, 0.88, 1.45, -1.55, 0.4, st, 0.1);
  if (new URLSearchParams(location.search).get('empty')) S.scene.children.filter((o) => o.isMesh && o !== S.floor).forEach((o) => S.scene.remove(o));
  S.finish();
}
