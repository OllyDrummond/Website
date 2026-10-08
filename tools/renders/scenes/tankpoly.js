import { studio, THREE, mat, add, corrugatedCylinder } from '../studio.js';
import { unit, probe, cable } from '../unit.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const R = 2.2, H = 2.5, CUT = 0.75, LVL = 0.48;
  const S = studio({ w: 1200, h: 900, bg: '#e7eaec', floor: '#dfe3e5', fogNear: 15, fogFar: 34,
    cam: [0, 4.0, 10.5], target: [-0.1, 1.5, 0], fov: 30, aperture: 0.03, softness: 1.5,
    key: [5, 11, 7], keyIntensity: 2.5, envIntensity: 0.6, fillIntensity: 0.4, shadowSize: 7, samples: +(q.get('n') || 16) });
  const poly = new THREE.MeshPhysicalMaterial({ color: '#3f5a48', roughness: 0.55, clearcoat: 0.2, side: THREE.DoubleSide });
  const inside = new THREE.MeshStandardMaterial({ color: '#2f4537', roughness: 0.7, side: THREE.BackSide });
  const t0 = CUT, tl = Math.PI * 2 - CUT * 2;
  add(S.scene, new THREE.CylinderGeometry(R + 0.4, R + 0.5, 0.15, 80), mat.plastic('#b9c0c3', 0.9), [0, 0.075, 0]);
  add(S.scene, corrugatedCylinder(R, H, 0.42, 0.05, t0, tl), poly, [0, 0.15 + H / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(R - 0.06, R - 0.06, H, 120, 1, true, t0, tl), inside, [0, 0.15 + H / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(R, R, 0.02, 120), mat.plastic('#2f4537', 0.8), [0, 0.16, 0]);
  for (const th of [t0, t0 + tl]) add(S.scene, new THREE.BoxGeometry(0.1, H, 0.1), poly, [Math.sin(th) * (R - 0.03), 0.15 + H / 2, Math.cos(th) * (R - 0.03)]);
  // domed top
  const dome = new THREE.SphereGeometry(R, 96, 24, t0 - Math.PI / 2, tl, 0, Math.PI / 2);
  const d = add(S.scene, dome, poly, [0, 0.15 + H, 0]); d.scale.y = 0.22;
  // inlet with strainer
  add(S.scene, new THREE.CylinderGeometry(0.3, 0.3, 0.18, 40), mat.plastic('#2a2f34', 0.6), [-0.4, 0.15 + H + 0.42, -0.4]);
  // water
  const wh = H * LVL;
  const water = new THREE.MeshPhysicalMaterial({ color: '#2a7cc0', roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1 });
  add(S.scene, new THREE.CylinderGeometry(R - 0.08, R - 0.08, wh, 120, 1, false, t0, tl), water, [0, 0.17 + wh / 2, 0], [0, 0, 0], false);
  for (const th of [t0, t0 + tl]) {
    const p = new THREE.PlaneGeometry(R - 0.08, wh); p.translate((R - 0.08) / 2, 0, 0);
    add(S.scene, p, new THREE.MeshPhysicalMaterial({ color: '#2a7cc0', roughness: 0.1, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), [0, 0.17 + wh / 2, 0], [0, th - Math.PI / 2, 0], false);
  }
  // unit on a bracket on the tank wall
  const a = -1.15, ux = Math.sin(a) * (R + 0.3), uz = Math.cos(a) * (R + 0.3);
  add(S.scene, new THREE.BoxGeometry(0.5, 0.06, 0.55), mat.metal('#9aa2a7', 0.35), [ux, H - 0.35, uz], [0, a, 0]);
  const u = unit(); u.scale.setScalar(0.42); u.position.set(ux, H - 0.32, uz); u.rotation.y = a + 0.3; S.scene.add(u);
  const px = Math.sin(-0.3) * 1.2, pz = Math.cos(-0.3) * 1.2;
  const p = probe(); p.scale.setScalar(0.42); p.position.set(px, 0.17 + 0.62, pz); S.scene.add(p);
  cable(S.scene, [[ux + 0.1, H - 0.4, uz], [ux * 0.95, H + 0.1, uz * 0.95], [ux * 0.8, H + 0.35, uz * 0.8], [Math.sin(a) * (R - 0.3), H + 0.2, Math.cos(a) * (R - 0.3)], [px - 0.2, 1.8, pz], [px, 0.17 + 0.62, pz]], 0.018);
  const frames = +(q.get('frames') || 1);
  S.turntable(frames, (i, cp) => {
    const t = frames === 1 ? 0.5 : i / (frames - 1);
    const ang = -0.85 + t * 1.7;
    cp.set(Math.sin(ang) * 10.5, 4.0, Math.cos(ang) * 10.5);
  });
}
