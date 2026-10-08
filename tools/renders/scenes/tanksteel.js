import { studio, THREE, mat, add, corrugatedCylinder } from '../studio.js';
import { unit, probe, cable } from '../unit.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const R = 2.4, H = 2.6, CUT = 0.75, LVL = 0.62;
  const S = studio({ w: 1200, h: 900, bg: '#1b2126', floor: '#232a30', fogNear: 14, fogFar: 34,
    cam: [0, 4.2, 11.5], target: [-0.2, 1.75, 0], fov: 31, aperture: 0.03, softness: 1.4,
    key: [6, 11, 7], keyIntensity: 3.0, rim: [-8, 5, -3], rimIntensity: 2.2, rimColor: '#8fc2ff',
    envIntensity: 0.4, fillIntensity: 0.25, shadowSize: 7, samples: +(q.get('n') || 16) });
  const steel = new THREE.MeshStandardMaterial({ color: '#a3acb1', metalness: 0.85, roughness: 0.48, side: THREE.DoubleSide });
  const inside = new THREE.MeshStandardMaterial({ color: '#7d878c', metalness: 0.6, roughness: 0.6, side: THREE.BackSide });
  const t0 = CUT, tl = Math.PI * 2 - CUT * 2;
  add(S.scene, new THREE.CylinderGeometry(R + 0.35, R + 0.45, 0.2, 80), mat.plastic('#6d757a', 0.85), [0, 0.1, 0]);
  add(S.scene, corrugatedCylinder(R, H, 0.07, 0.016, t0, tl), steel, [0, 0.2 + H / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(R - 0.02, R - 0.02, H, 120, 1, true, t0, tl), inside, [0, 0.2 + H / 2, 0]);
  add(S.scene, new THREE.CylinderGeometry(R, R, 0.02, 120, 1, false), mat.plastic('#5e676c', 0.8), [0, 0.21, 0]);
  // cut edges (wall thickness)
  for (const th of [t0, t0 + tl]) add(S.scene, new THREE.BoxGeometry(0.05, H, 0.05), mat.metal('#c9cfd2', 0.3), [Math.sin(th) * R, 0.2 + H / 2, Math.cos(th) * R]);
  // roof (cone, same cut) and rim
  const rh = 0.55;
  add(S.scene, new THREE.ConeGeometry(R + 0.05, rh, 120, 1, true, t0, tl), steel, [0, 0.2 + H + rh / 2, 0]);
  add(S.scene, new THREE.TorusGeometry(R + 0.02, 0.04, 10, 160, tl), mat.metal('#9aa3a8', 0.35), [0, 0.2 + H, 0], [Math.PI / 2, 0, Math.PI / 2 - t0 - tl]);
  // water
  const wh = H * LVL;
  const water = new THREE.MeshPhysicalMaterial({ color: '#2a7cc0', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82, clearcoat: 1 });
  add(S.scene, new THREE.CylinderGeometry(R - 0.03, R - 0.03, wh, 120, 1, false, t0, tl), water, [0, 0.22 + wh / 2, 0], [0, 0, 0], false);
  for (const th of [t0, t0 + tl]) {
    const p = new THREE.PlaneGeometry(R - 0.03, wh); p.translate((R - 0.03) / 2, 0, 0);
    add(S.scene, p, new THREE.MeshPhysicalMaterial({ color: '#2a7cc0', roughness: 0.1, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), [0, 0.22 + wh / 2, 0], [0, th - Math.PI / 2, 0], false);
  }
  // unit on the roof, with the cable dropping in through a hatch
  const hatchA = -1.05, hr = 1.55, roofY = (r) => 0.2 + H + rh * (1 - r / (R + 0.05));
  const hx = Math.sin(hatchA) * hr, hz = Math.cos(hatchA) * hr;
  add(S.scene, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 40), mat.plastic('#3a4147', 0.6), [hx, roofY(hr) + 0.02, hz]);
  const u = unit(); u.scale.setScalar(0.42); u.position.set(hx + 0.05, roofY(hr) + 0.14, hz); u.rotation.y = 0.55; S.scene.add(u);
  const px = Math.sin(-0.32) * 1.35, pz = Math.cos(-0.32) * 1.35;
  const p = probe(); p.scale.setScalar(0.42); p.position.set(px, 0.22 + 0.62, pz); S.scene.add(p);
  cable(S.scene, [[hx + 0.2, roofY(hr) + 0.08, hz + 0.05], [hx + 0.25, roofY(hr) - 0.3, hz + 0.1], [hx * 0.7, 1.9, hz * 0.8 + 0.3], [px, 1.3, pz], [px, 0.22 + 0.62, pz]], 0.018);
  const frames = +(q.get('frames') || 1);
  S.turntable(frames, (i, cp, tg) => {
    const t = frames === 1 ? 0.5 : i / (frames - 1);
    const a = -0.85 + t * 1.7;
    cp.set(Math.sin(a) * 11.5, 4.2, Math.cos(a) * 11.5);
  });
}
