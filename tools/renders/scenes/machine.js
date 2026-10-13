// Custom machine design service image, several takes (?v=1..5), all in the
// shared dark service studio with no base plate.
import { studio, THREE, mat, add, gearGeo } from '../studio.js';
import { SERVICE_STUDIO } from '../service-studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const steel = () => mat.metal('#c4cacd', 0.32);
const maroon = () => new THREE.MeshStandardMaterial({ color: '#7a1f2b', metalness: 0.7, roughness: 0.35 });
const dark = () => mat.metal('#5d666c', 0.45);

// Internal (ring) gear: outer circle with a toothed hole
function ringGeo(teeth, rOut, rTip, rRoot, depth) {
  const s = new THREE.Shape(); s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const h = new THREE.Path(), step = (Math.PI * 2) / teeth;
  for (let i = 0; i <= teeth; i++) { const a = i * step;
    const pts = [[a, rTip], [a + step * 0.3, rTip], [a + step * 0.45, rRoot], [a + step * 0.8, rRoot], [a + step * 0.95, rTip]];
    pts.forEach(([t, r], k) => (i === 0 && k === 0 ? h.moveTo : h.lineTo).call(h, Math.cos(t) * r, Math.sin(t) * r)); }
  s.holes.push(h);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 64 });
}

const V = {
  // 1. the current gear train, standing on the floor without the plate
  1: (S) => {
    const st = steel(), mr = maroon();
    const gear = (t, ro, rr, x, z, y, m, rot) => {
      add(S.scene, gearGeo(t, ro, rr, 0.22, 0.14), m, [x, y, z], [-Math.PI / 2, 0, rot]);
      add(S.scene, new THREE.CylinderGeometry(0.14, 0.14, y + 0.3, 32), st, [x, (y + 0.3) / 2, z]);
      add(S.scene, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 6), st, [x, y + 0.17, z]);
    };
    gear(36, 1.42, 1.3, -0.9, 0, 0.7, st, 0); gear(18, 0.76, 0.64, 1.18, 0.05, 0.7, mr, 0.08); gear(24, 1.0, 0.88, 1.45, -1.55, 0.4, st, 0.1);
    return { cam: [0.6, 4.2, 6.4], target: [0.0, 0.4, -0.4] };
  },
  // 2. planetary gear set lying flat: ring, sun, three planets on a maroon carrier
  2: (S) => {
    const st = steel(), y = 0.3;
    add(S.scene, ringGeo(60, 2.4, 1.97, 2.1, 0.35), dark(), [0, y, 0], [-Math.PI / 2, 0, 0]);
    add(S.scene, gearGeo(18, 0.68, 0.54, 0.3, 0.16), st, [0, y + 0.03, 0], [-Math.PI / 2, 0, 0.1]);
    const carrier = new THREE.Group(); carrier.position.y = y + 0.42; S.scene.add(carrier);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.3, r = 1.33;
      add(S.scene, gearGeo(21, 0.78, 0.64, 0.3, 0.12), st, [Math.cos(a) * r, y + 0.03, Math.sin(a) * r], [-Math.PI / 2, 0, a * 2]);
      add(carrier, new THREE.CylinderGeometry(0.13, 0.13, 0.5, 24), st, [Math.cos(a) * r, -0.2, Math.sin(a) * r]);
      add(carrier, new THREE.BoxGeometry(r, 0.12, 0.42), maroon(), [Math.cos(a) * r / 2, 0.02, Math.sin(a) * r / 2], [0, -a, 0]);
    }
    add(carrier, new THREE.CylinderGeometry(0.45, 0.45, 0.16, 48), maroon(), [0, 0.02, 0]);
    add(carrier, new THREE.CylinderGeometry(0.18, 0.18, 0.9, 32), st, [0, 0.45, 0]);
    return { cam: [1.0, 5.2, 5.6], target: [0.1, 0.2, 0.1] };
  },
  // 3. a two-axis robot arm with servo joints
  3: (S) => {
    const st = steel(), mr = maroon(), body = mat.plastic('#dfe3e6', 0.4), blk = mat.plastic('#22272b', 0.5);
    add(S.scene, new THREE.CylinderGeometry(0.9, 1.0, 0.3, 48), blk, [0, 0.15, 0]);
    add(S.scene, new THREE.CylinderGeometry(0.7, 0.75, 0.35, 48), mr, [0, 0.47, 0]);
    const sh = new THREE.Group(); sh.position.set(0, 0.65, 0); sh.rotation.y = 0.5; S.scene.add(sh);
    add(sh, new RoundedBoxGeometry(0.55, 0.9, 0.6, 4, 0.08), body, [0, 0.45, 0]);
    const j1 = new THREE.Group(); j1.position.set(0, 0.8, 0); j1.rotation.z = 0.35; sh.add(j1);
    add(j1, new THREE.CylinderGeometry(0.34, 0.34, 0.7, 40), mr, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(j1, new RoundedBoxGeometry(0.42, 2.0, 0.42, 4, 0.1), body, [0, 1.0, 0]);
    const j2 = new THREE.Group(); j2.position.set(0, 2.0, 0); j2.rotation.z = -1.75; j1.add(j2);
    add(j2, new THREE.CylinderGeometry(0.28, 0.28, 0.6, 40), mr, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(j2, new RoundedBoxGeometry(0.34, 1.6, 0.34, 4, 0.08), body, [0, 0.8, 0]);
    const w = new THREE.Group(); w.position.set(0, 1.6, 0); j2.add(w);
    add(w, new THREE.CylinderGeometry(0.2, 0.2, 0.3, 32), blk, [0, 0.1, 0]);
    add(w, new THREE.BoxGeometry(0.5, 0.08, 0.2), st, [0, 0.3, 0]);
    for (const s of [-1, 1]) add(w, new THREE.BoxGeometry(0.06, 0.35, 0.14), st, [s * 0.2, 0.48, 0]);
    return { cam: [3.0, 7.0, 7.6], target: [-0.3, 1.3, 0] };
  },
  // 4. exploded shaft assembly: shaft, bearing, gear, spacer, keyed hub, nut
  4: (S) => {
    const st = steel(), g = new THREE.Group(); g.position.y = 1.0; g.rotation.y = -0.45; S.scene.add(g);
    add(g, new THREE.CylinderGeometry(0.16, 0.16, 5.6, 40), st, [0, 0, 0], [0, 0, Math.PI / 2]);
    add(g, new THREE.BoxGeometry(0.9, 0.05, 0.08), dark(), [0.6, 0.17, 0]);
    const part = (x, geo, m, rot = [0, 0, Math.PI / 2]) => add(g, geo, m, [x, 0, 0], rot);
    part(-2.3, new THREE.TorusGeometry(0.42, 0.14, 24, 48), st, [0, Math.PI / 2, 0]);
    part(-2.3, new THREE.CylinderGeometry(0.3, 0.3, 0.26, 40, 1, true), dark());
    part(-1.2, gearGeo(30, 1.15, 1.04, 0.3, 0.17), maroon(), [0, Math.PI / 2, 0]);
    part(-0.3, new THREE.CylinderGeometry(0.3, 0.3, 0.3, 40), dark());
    part(0.6, new THREE.CylinderGeometry(0.55, 0.55, 0.5, 48), st);
    part(1.6, gearGeo(18, 0.7, 0.6, 0.26, 0.17), st, [0, Math.PI / 2, 0]);
    part(2.5, new THREE.CylinderGeometry(0.32, 0.32, 0.22, 6), st);
    return { cam: [1.0, 4.2, 6.6], target: [0, 0.8, 0] };
  },
  // 5. a pick-and-place linear module: rail, carriage, stepper motor, timing belt
  5: (S) => {
    const st = steel(), alu = mat.metal('#b8bfc4', 0.35), blk = mat.plastic('#22272b', 0.5), g = new THREE.Group(); g.rotation.y = -0.35; S.scene.add(g);
    add(g, new THREE.BoxGeometry(5.2, 0.4, 0.8), alu, [0, 0.2, 0]);
    for (const z of [-0.3, 0.3]) add(g, new THREE.BoxGeometry(5.0, 0.12, 0.12), st, [0, 0.46, z]);
    add(g, new THREE.BoxGeometry(5.0, 0.04, 0.1), blk, [0, 0.42, 0]);
    add(g, new RoundedBoxGeometry(1.0, 0.3, 1.0, 4, 0.05), maroon(), [0.6, 0.67, 0]);
    add(g, new RoundedBoxGeometry(0.8, 0.8, 0.8, 4, 0.06), blk, [-3.0, 0.4, 0]);
    add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32), st, [-3.0, 0.4, 0.46], [Math.PI / 2, 0, 0]);
    // vertical Z axis on the carriage
    add(g, new THREE.BoxGeometry(0.5, 2.0, 0.3), alu, [0.6, 1.8, -0.2]);
    add(g, new RoundedBoxGeometry(0.6, 0.5, 0.4, 4, 0.05), maroon(), [0.6, 1.3, 0.1]);
    add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.6, 24), st, [0.6, 0.85, 0.15]);
    add(g, new THREE.CylinderGeometry(0.22, 0.1, 0.15, 32), blk, [0.6, 0.5, 0.15]);
    return { cam: [1.8, 6.4, 6.6], target: [-0.2, 0.8, 0] };
  },
};

export default function () {
  const q = new URLSearchParams(location.search);
  const v = +(q.get('v') || 1);
  // camera comes from the variant, so build the scene first with a placeholder then set it
  const S = studio({ ...SERVICE_STUDIO, w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), cam: [0, 3, 6], target: [0, 0.8, 0], aperture: 0.05, samples: +(q.get('n') || 56) });
  const view = V[v](S);
  S.camPos.set(...view.cam); S.target.set(...view.target);
  S.finish();
}
