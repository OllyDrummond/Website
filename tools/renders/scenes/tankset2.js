import { studio, THREE, contactShadow, rectShadow, canvasTex } from '../studio.js';
import { unit2, probe2, cable } from '../unit.js';
import { receiverWide, phone, pumpController, fillPump } from '../devices.js';
// Tank monitor product shots, four layouts (?v=1..4). Same models and finish as
// tankset.js. Layout 4 adds the pump controller and the fill pump it switches.
const L = {
  1: { // receiver left, tank unit back right, coil in front of it, probe out to the left
    cam: [0.2, 4.6, 8.4], target: [0.15, 0.8, 0.0],
    unit: [1.6, -1.1, -0.45], coil: [1.25, 0.95, 2.0], probe: [[0.35, 1.85], [-0.05, 1.95]],
    rec: [-1.05, -0.5, 0.22], phone: [-1.15, 0.75, 0.45],
  },
  2: { // a diagonal line from back left to front right
    cam: [1.2, 4.5, 8.4], target: [0.45, 0.8, -0.1],
    unit: [-2.0, -1.5, 0.35], coil: [-0.85, 0.65, -1.2], probe: [[0.2, 1.55], [0.6, 1.62]],
    rec: [0.75, -0.45, -0.25], phone: [2.1, 0.75, -0.5],
  },
  3: { // tank unit front and centre, receiver and phone behind it on the right
    cam: [0.2, 4.4, 9.1], target: [-0.05, 0.75, -0.3],
    unit: [-0.7, 0.15, 0.25], coil: [-1.95, -0.95, 0.6], probe: [[-1.35, 1.45], [-0.95, 1.6]],
    rec: [1.55, -1.1, -0.35], phone: [2.05, 0.4, -0.45],
  },
  4: { // the current layout, with the pump controller and fill pump at the back
    cam: [1.05, 5.1, 9.4], target: [0.7, 0.8, -0.6],
    unit: [-2.05, -0.55, 0.4], coil: [-1.25, 1.15, -1.2], probe: [[-0.2, 1.95], [0.2, 2.05]],
    rec: [0.9, -0.3, -0.2], phone: [1.95, 0.6, -0.62], pump: true,
  },
};

export default function () {
  const q = new URLSearchParams(location.search);
  const v = L[+(q.get('v') || 1)];
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e7eaec', floor: '#e4e7e9', fogNear: 18, fogFar: 40,
    cam: v.cam, target: v.target, fov: 30, aperture: 0.055, softness: 1.6,
    key: [1.5, 12, 4], keyIntensity: 2.3, envIntensity: 0.75, fillIntensity: 0.4, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); S.scene.add(root);

  const u = unit2(); u.position.set(v.unit[0], 0, v.unit[1]); u.rotation.y = v.unit[2]; root.add(u);
  u.updateMatrixWorld(true);
  const gl = u.localToWorld(u.userData.glandOut.clone());

  // neat coil
  const [cx, cz, ph0] = v.coil, coil = [], turns = 4, rx = 0.72, rz = 0.46;
  for (let i = 0; i <= turns * 48; i++) {
    const t = (i / 48) * Math.PI * 2 + ph0, k = i / (turns * 48);
    const grow = k * turns * 0.085, wob = 0.01 * Math.sin(t * 3);
    coil.push([cx + Math.cos(t) * (rx + grow + wob), 0.036 + 0.006 * Math.max(0, Math.sin(t * 2)), cz + Math.sin(t) * (rz + grow * 0.7 + wob)]);
  }
  const c0 = coil[0], c1 = coil[coil.length - 1];
  const mid = [(gl.x + c0[0]) / 2, 0.045, (gl.z + c0[2]) / 2];
  const lead = [[gl.x, gl.y, gl.z], [gl.x + (c0[0] - gl.x) * 0.08, gl.y - 0.12, gl.z - 0.15], mid, [c0[0] + (mid[0] - c0[0]) * 0.3, 0.04, c0[2] + (mid[2] - c0[2]) * 0.3]];
  const out = [c1[0] + Math.cos(Math.atan2(v.probe[0][1] - c1[2], v.probe[0][0] - c1[0])) * 0.3, 0.045, c1[2] + Math.sin(Math.atan2(v.probe[0][1] - c1[2], v.probe[0][0] - c1[0])) * 0.3];
  const tail = [out, [v.probe[0][0], 0.045, v.probe[0][1]], [v.probe[1][0], 0.045, v.probe[1][1]]];
  cable(root, [...lead, ...coil, ...tail]);
  const pr = probe2(); pr.rotation.z = Math.PI / 2; pr.rotation.y = Math.atan2(-(v.probe[1][1] - v.probe[0][1]), v.probe[1][0] - v.probe[0][0]); pr.position.set(v.probe[1][0], 0.105, v.probe[1][1]); root.add(pr);

  const r = receiverWide(); r.scale.setScalar(1.4); r.position.set(v.rec[0], 0, v.rec[1]); r.rotation.y = v.rec[2]; r.rotation.x = -0.08; root.add(r);
  const pg = new THREE.Group(); pg.position.set(v.phone[0], 0, v.phone[1]); pg.rotation.y = v.phone[2]; root.add(pg);
  const ph = phone(); ph.rotation.x = -Math.PI / 2; ph.position.y = 0.04; pg.add(ph);

  if (v.pump) {
    const c = pumpController(); c.position.set(0.55, 0, -2.95); c.rotation.y = 0.1; root.add(c);
    const fp = fillPump(); fp.position.set(2.85, 0, -2.55); fp.rotation.y = -0.2; root.add(fp);
    c.updateMatrixWorld(true); fp.updateMatrixWorld(true);
    const cg = c.localToWorld(c.userData.glandOut.clone()), tb = fp.localToWorld(fp.userData.terminal.clone());
    // controller to pump: out of the gland, round the back, up into the terminal box
    cable(root, [[cg.x + 0.05, cg.y, cg.z], [cg.x - 0.25, 0.08, cg.z + 0.1], [cg.x - 0.2, 0.05, cg.z - 0.5], [1.6, 0.05, -3.5], [tb.x - 0.35, 0.05, tb.z + 0.15], [tb.x - 0.05, 0.35, tb.z + 0.12], [tb.x, tb.y, tb.z]], 0.05);
    // pump pipework: suction from the left, delivery up from the head and away
    const pvc = new THREE.MeshPhysicalMaterial({ color: '#5d6469', roughness: 0.4, clearcoat: 0.25 });
    const io = fp.localToWorld(fp.userData.inlet.clone()), oo = fp.localToWorld(fp.userData.outlet.clone());
    const pipe = (pts) => { const cv = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
      const m = new THREE.Mesh(new THREE.TubeGeometry(cv, 80, 0.08, 20), pvc); m.castShadow = true; root.add(m); };
    pipe([[io.x, io.y, io.z], [io.x + 0.6, io.y, io.z - 0.15], [io.x + 1.6, io.y, io.z - 0.4]]);
    pipe([[oo.x, oo.y - 0.05, oo.z], [oo.x, oo.y + 0.45, oo.z], [oo.x + 0.15, oo.y + 0.6, oo.z - 0.15], [oo.x + 1.5, oo.y + 0.62, oo.z - 0.6]]);
    rectShadow(c, 1.62, 0.98, 0.6, 0.16); rectShadow(fp, 1.5, 0.7, 0.55, 0.14);
  }

  rectShadow(u, 1.45, 1.12, 0.55, 0.18); rectShadow(u, 1.42, 1.1, 0.75, 0.04, [0, 0.005, 0]);
  rectShadow(r, 1.15, 0.3, 0.6, 0.12, [0, 0.004, -0.02]);
  rectShadow(pg, 0.74, 1.52, 0.5, 0.06, [0, 0.005, 0]);
  contactShadow(root, 9, 5, 0.2, [0, 0.003, 0]);

  root.traverse((o) => { if (o.isMesh && o.geometry.type === 'TubeGeometry' && o.material.color && o.material.color.getHexString() !== '5d6469') o.material = new THREE.MeshPhysicalMaterial({ color: '#0b0c0e', roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 }); });
  S.floor.material.roughness = 0.62; S.floor.material.envMapIntensity = 0.6;
  const glare = (w, h) => { const t = canvasTex(256, 256, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.38, 'rgba(255,255,255,0.0)'); g.addColorStop(0.46, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.03)'); g.addColorStop(1, 'rgba(255,255,255,0.0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); };
  const rgl = glare(0.62, 0.465); rgl.position.set(0, 0.35, 0.165); r.add(rgl);
  const pgl = glare(0.67, 1.45); pgl.position.set(0, 0, 0.05); ph.add(pgl);
  S.finish();
}
