import { studio, THREE, contactShadow, rectShadow, canvasTex } from '../studio.js';
import { unit2, probe2, cable } from '../unit.js';
import { receiverWide, phone } from '../devices.js';
// Product card: the tank monitor (tank unit + probe), the receiver on its side,
// and a phone showing the same reading in the app. 4:3.
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: [0.35, 4.4, 6.6], target: [0.05, 1.0, -0.3], fov: 32, aperture: 0.03, softness: 1.6,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);

  // tank unit (its cable gland is underneath, out of sight)
  const u = unit2(); u.position.set(-1.55, 0, -1.05); u.rotation.y = 0.4; root.add(u);
  u.updateMatrixWorld(true);
  const U = (x, z) => { const v = u.localToWorld(new THREE.Vector3(x, 0.036, z)); return [v.x, 0.036, v.z]; };

  // cable: comes out from under the front edge of the box, feeds into the outer
  // turn of a neat coil, and the end crosses back over the turns and runs off
  // to the probe lying to the left of the box
  const coil = [], t0 = -0.9, turns = 4 + (Math.PI - t0) / (Math.PI * 2), cx = -0.95, cz = 0.85, rxo = 1.0, rzo = 0.66, step = 0.082;
  const n = Math.round(turns * 56);
  for (let i = 0; i <= n; i++) {
    const k = i / n, t = t0 + k * turns * Math.PI * 2, shrink = k * turns * step, wob = 0.008 * Math.sin(t * 3 + 1);
    coil.push([cx + Math.cos(t) * (rxo - shrink + wob), 0.036, cz + Math.sin(t) * (rzo - shrink * 0.66 + wob)]);
  }
  const c0 = coil[0], c1 = coil[coil.length - 1];
  const tan = [-Math.sin(t0) * rxo, Math.cos(t0) * rzo], tl = Math.hypot(...tan);
  const lead = [U(0.25, 0.1), U(0.3, 0.45), U(0.32, 0.75),
    [c0[0] - (tan[0] / tl) * 0.45, 0.036, c0[2] - (tan[1] / tl) * 0.45], [c0[0] - (tan[0] / tl) * 0.15, 0.036, c0[2] - (tan[1] / tl) * 0.15]];
  // end of the coil (left side, inner turn) rides over the outer turns, then out to the probe
  const pa = [-2.6, 0.05], pb = [-2.68, -0.45];
  const tail = [[c1[0] - 0.12, 0.05, c1[2] - 0.03], [c1[0] - 0.25, 0.1, c1[2] - 0.06], [c1[0] - 0.4, 0.1, c1[2] - 0.1], [c1[0] - 0.56, 0.045, c1[2] - 0.15],
    [-2.35, 0.036, 0.45], [pa[0], 0.036, pa[1]], [pb[0], 0.036, pb[1]]];
  cable(root, [...lead, ...coil, ...tail]);
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = Math.atan2(-(pb[1] - pa[1]), pb[0] - pa[0]); p.position.set(pb[0], 0.105, pb[1]); root.add(p);

  // receiver standing upright, set back and to the right
  const r = receiverWide(); r.scale.setScalar(1.4); r.position.set(1.05, 0, -1.25); r.rotation.y = -0.22; r.rotation.x = -0.08; root.add(r);

  // phone lying on the ground at an angle, at the receiver's front corner
  const pg = new THREE.Group(); pg.position.set(2.1, 0, -0.3); pg.rotation.y = -0.62; root.add(pg);
  const ph = phone(); ph.rotation.x = -Math.PI / 2; ph.position.y = 0.04; pg.add(ph);

  rectShadow(u, 1.45, 1.12, 0.55, 0.18); rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  rectShadow(r, 1.15, 0.3, 0.6, 0.12, [0, 0.004, -0.02]);
  rectShadow(pg, 0.74, 1.52, 0.5, 0.06, [0, 0.005, 0]);
  contactShadow(root, 8, 4, 0.2, [0, 0.003, 0.2]);

  // a little more realism: satin rubber on the cable, a soft sheen on the floor,
  // and a faint glass reflection across both screens
  root.traverse((o) => { if (o.isMesh && o.geometry.type === 'TubeGeometry') o.material = new THREE.MeshPhysicalMaterial({ color: '#0b0c0e', roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 }); });
  S.floor.material.roughness = 0.62; S.floor.material.envMapIntensity = 0.6;
  const glare = (w, h) => { const t = canvasTex(256, 256, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.38, 'rgba(255,255,255,0.0)'); g.addColorStop(0.46, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.03)'); g.addColorStop(1, 'rgba(255,255,255,0.0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); };
  const rgl = glare(0.62, 0.465); rgl.position.set(0, 0.35, 0.165); r.add(rgl);
  const pgl = glare(0.67, 1.45); pgl.position.set(0, 0, 0.05); ph.add(pgl);
  S.finish();
}
