import { studio, THREE, mat, add } from '../studio.js';
import { unit2, probe2, cable } from '../unit.js';
import { polyTank } from '../nz.js';
// Cut-away NZ poly tank: monitor on the lid, probe on the floor (light studio)
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e2e6e8', fogNear: 300, fogFar: 900,
    cam: [0, 52, 118], target: [-1, 13, 0], fov: 30, aperture: 0.1, softness: 18,
    key: [60, 110, 80], keyIntensity: 2.4, envIntensity: 0.6, fillIntensity: 0.4, shadowSize: 45, samples: +(q.get('n') || 40) });
  S.camera.near = 0.5; S.camera.far = 2000; S.camera.updateProjectionMatrix();
  const CUT = 0.72, R = 17.5, H = 21, LVL = 0.58;
  const tank = polyTank(S.scene, { R, H, cut: CUT });
  const inside = new THREE.MeshStandardMaterial({ color: '#22362b', roughness: 0.8, side: THREE.BackSide });
  add(S.scene, new THREE.CylinderGeometry(R - 0.5, R - 0.5, H, 140, 1, true, CUT, Math.PI * 2 - CUT * 2), inside, [0, H / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(R - 0.5, R - 0.5, 0.4, 140), mat.plastic('#2a3f32', 0.8), [0, 0.3, 0]);
  for (const th of [CUT, Math.PI * 2 - CUT]) add(S.scene, new THREE.BoxGeometry(0.9, H, 0.9), mat.plastic('#2f4a3a', 0.7), [Math.sin(th) * (R - 0.2), H / 2, Math.cos(th) * (R - 0.2)]);
  const wh = H * LVL, water = new THREE.MeshPhysicalMaterial({ color: '#2a7cc0', roughness: 0.08, transparent: true, opacity: 0.8, clearcoat: 1 });
  add(S.scene, new THREE.CylinderGeometry(R - 0.6, R - 0.6, wh, 140, 1, false, CUT, Math.PI * 2 - CUT * 2), water, [0, 0.5 + wh / 2, 0], [0, 0, 0], false);
  for (const th of [CUT, Math.PI * 2 - CUT]) { const p = new THREE.PlaneGeometry(R - 0.6, wh); p.translate((R - 0.6) / 2, 0, 0); add(S.scene, p, new THREE.MeshPhysicalMaterial({ color: '#2a7cc0', roughness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), [0, 0.5 + wh / 2, 0], [0, th - Math.PI / 2, 0], false); }
  // monitor on the dome (scaled so it reads at this size)
  const r = 9.5, phi = -1.15, y = tank.roofY(r);
  const holder = new THREE.Group(); holder.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r); holder.rotation.y = phi; S.scene.add(holder);
  const tilt = new THREE.Group(); tilt.rotation.x = tank.roofSlope(r); holder.add(tilt);
  const u = unit2(); u.scale.setScalar(3); u.rotation.y = 1.1; tilt.add(u);
  const px = Math.sin(-0.3) * 9, pz = Math.cos(-0.3) * 9;
  const p = probe2(); p.scale.setScalar(3); p.position.set(px, 0.5 + 3.4, pz); S.scene.add(p);
  cable(S.scene, [[Math.sin(phi) * 6, y + 1.2, Math.cos(phi) * 6], [Math.sin(phi) * 5, H - 1, Math.cos(phi) * 5], [px * 0.6, H * 0.6, pz * 0.7], [px, 8, pz], [px, 0.5 + 3.4, pz]], 0.12);
  S.finish();
}
