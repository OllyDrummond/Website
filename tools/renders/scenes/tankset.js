import { studio, THREE, contactShadow, rectShadow, canvasTex } from '../studio.js';
import { unit2, probe2, cable } from '../unit.js';
import { receiverWide, phone } from '../devices.js';
// Product card: the tank monitor (tank unit + probe), the receiver on its side,
// and a phone showing the same reading in the app. 4:3.
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: [0.85, 4.5, 8.1], target: [0.4, 0.75, 0.0], fov: 30, aperture: 0.055, softness: 1.6,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);

  // tank unit
  const u = unit2({ gland: 'side' }); u.position.set(-1.55, 0, -1.05); u.rotation.y = 0.4; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());
  const gd = u.userData.glandDir.clone().applyQuaternion(u.quaternion);

  // cable: leaves the side gland, bends down to the floor and feeds in as the
  // outer turn of a neat coil; the turns wind inward and the end crosses back
  // over them to the probe, the way a hand-wound coil lies
  const coil = [], t0 = -0.2, turns = 4 + (Math.PI / 2 - t0) / (Math.PI * 2), cx = -0.95, cz = 0.85, rxo = 1.0, rzo = 0.66, step = 0.082;
  const n = Math.round(turns * 56);
  for (let i = 0; i <= n; i++) {
    const k = i / n, t = t0 + k * turns * Math.PI * 2, shrink = k * turns * step, wob = 0.008 * Math.sin(t * 3 + 1);
    coil.push([cx + Math.cos(t) * (rxo - shrink + wob), 0.036, cz + Math.sin(t) * (rzo - shrink * 0.66 + wob)]);
  }
  const c0 = coil[0], c1 = coil[coil.length - 1];
  const tan = [-Math.sin(t0) * rxo, Math.cos(t0) * rzo], tl = Math.hypot(...tan);
  const lead = [
    [gl.x, gl.y, gl.z],
    [gl.x + gd.x * 0.1, gl.y - 0.005, gl.z + gd.z * 0.1],
    [gl.x + gd.x * 0.24, 0.05, gl.z + gd.z * 0.24 + 0.05],
    [gl.x + gd.x * 0.36 + 0.08, 0.036, gl.z + 0.32],
    [c0[0] - (tan[0] / tl) * 0.55, 0.036, c0[2] - (tan[1] / tl) * 0.55],
    [c0[0] - (tan[0] / tl) * 0.2, 0.036, c0[2] - (tan[1] / tl) * 0.2],
  ];
  // the end rides up over the outer turns at the front, then lies flat to the probe
  const tail = [[c1[0] + 0.12, 0.05, c1[2] + 0.06], [c1[0] + 0.24, 0.1, c1[2] + 0.14], [c1[0] + 0.38, 0.1, c1[2] + 0.22], [c1[0] + 0.55, 0.045, c1[2] + 0.32], [0.05, 0.036, 1.75], [0.45, 0.036, 1.85]];
  cable(root, [...lead, ...coil, ...tail]);
  const last = tail[tail.length - 1];
  const p = probe2(); p.rotation.z = Math.PI / 2; p.rotation.y = 0.05; p.position.set(last[0], 0.105, last[2]); root.add(p);

  // receiver standing upright, a little larger
  const r = receiverWide(); r.scale.setScalar(1.4); r.position.set(0.9, 0, -0.35); r.rotation.y = -0.2; r.rotation.x = -0.08; root.add(r);

  // phone lying on the ground at an angle, right at the receiver's front corner
  const pg = new THREE.Group(); pg.position.set(1.95, 0, 0.55); pg.rotation.y = -0.62; root.add(pg);
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
