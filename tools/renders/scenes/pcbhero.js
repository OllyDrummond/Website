// Homepage hero: a dark blue circuit board running to a glowing horizon.
// Traces are real geometry, and the visible ones are projected to screen space
// (window.traces) so the site can animate light pulses along them.
import { studio, THREE, mat, add, canvasTex } from '../studio.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function () {
  const q = new URLSearchParams(location.search);
  const W = +(q.get('w') || 2400), H = +(q.get('h') || 1100);
  const CAM = [-0.2, 1.55, 4.6], TGT = [0.9, 0, -2.4];
  const S = studio({ w: W, h: H, bg: '#060c16', floor: '#0c1d33', floorY: null, fogNear: 7, fogFar: 26,
    cam: CAM, target: TGT, fov: 38, aperture: +(q.get('ap') || 0.012), softness: 0.8,
    key: [2, 9, 6], keyIntensity: 1.6, keyColor: '#dfe9ff', rim: [0, 1.2, -30], rimIntensity: 2.6, rimColor: '#5aa6ff',
    envIntensity: 0.9, fillIntensity: 0.12, shadowSize: 9, exposure: 1.05, samples: +(q.get('n') || 40) });
  S.camera.far = 400; S.camera.updateProjectionMatrix();
  S.scene.fog = new THREE.Fog('#2f78c8', 6, 30);

  // Background: deep navy, bright blue band at the horizon
  S.scene.background = canvasTex(16, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#02050a'); g.addColorStop(0.1, '#050e1c'); g.addColorStop(0.2, '#0f3566'); g.addColorStop(0.255, '#5aa8f2');
    g.addColorStop(0.28, '#2f78c8'); g.addColorStop(1, '#2f78c8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  // Environment for reflections: dark room with a glowing band behind the board
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#05080d');
  const band = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), new THREE.MeshBasicMaterial({ color: '#6fb4ff' }));
  band.position.set(0, 2, -60); envScene.add(band);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: '#c9d3dc' }));
  top.position.set(0, 30, 0); top.rotation.x = Math.PI / 2; envScene.add(top);
  for (const sx of [-1, 1]) { const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshBasicMaterial({ color: '#7d8a96' })); wall.position.set(sx * 40, 8, 10); wall.rotation.y = -sx * Math.PI / 2; envScene.add(wall); }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(50, 12), new THREE.MeshBasicMaterial({ color: '#59636d' })); front.position.set(0, 10, 50); front.rotation.y = Math.PI; envScene.add(front);
  // bright ring at camera height so vertical metal (caps, crystal) picks up highlights
  const ringGeo = new THREE.CylinderGeometry(45, 45, 6, 48, 1, true);
  const ringM = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#b8c4cf', side: THREE.BackSide })); ringM.position.y = 2; envScene.add(ringM);
  S.scene.environment = new THREE.PMREMGenerator(S.renderer).fromScene(envScene, 0.02).texture;

  let seed = +(q.get('seed') || 11);
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---- board ----
  const boardTex = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#0e2a4c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.035})`; c.fillRect(r() * w, r() * h, 2, 2); }
  });
  boardTex.wrapS = boardTex.wrapT = THREE.RepeatWrapping; boardTex.repeat.set(20, 20);
  const boardMat = new THREE.MeshPhysicalMaterial({ map: boardTex, color: '#ffffff', roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 });
  const board = add(S.scene, new THREE.PlaneGeometry(80, 80), boardMat, [0, 0, -30], [-Math.PI / 2, 0, 0]);
  board.castShadow = false;

  // ---- traces (merged strips with round pads) ----
  const traceGeos = [], padGeos = [], silkGeos = [];
  const T = 0.004; // trace thickness
  const traces = [];
  function strip(a, b, w) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const g = new THREE.BoxGeometry(len + w, T, w);
    g.rotateY(-Math.atan2(dz, dx)); g.translate((a[0] + b[0]) / 2, T / 2 + 0.001, (a[1] + b[1]) / 2);
    traceGeos.push(g);
  }
  function pad(p, rad) { const g = new THREE.CylinderGeometry(rad, rad, T * 1.6, 20); g.translate(p[0], T, p[1]); padGeos.push(g); }
  function ring(p, rad) { const g = new THREE.TorusGeometry(rad, rad * 0.28, 6, 20); g.rotateX(Math.PI / 2); g.translate(p[0], T * 1.5, p[1]); padGeos.push(g); }
  function route(pts, w = 0.026, endPad = true) {
    for (let i = 1; i < pts.length; i++) strip(pts[i - 1], pts[i], w);
    if (endPad) { ring(pts[0], w * 1.7); ring(pts[pts.length - 1], w * 1.7); }
    traces.push(pts);
  }
  // A bus: n parallel traces that run straight, bend 45 degrees, run on
  function bus(x, z, dir, n, len1, bendSign, len2, pitch = 0.075, w = 0.024) {
    const d = dir === 'x' ? [1, 0] : [0, -1];
    const perp = [-d[1], d[0]];
    const b = [(d[0] + perp[0] * bendSign) / Math.SQRT2, (d[1] + perp[1] * bendSign) / Math.SQRT2];
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * pitch;
      const p0 = [x + perp[0] * o, z + perp[1] * o];
      const l1 = len1 + (bendSign > 0 ? -i : i) * pitch * 0.414;
      const p1 = [p0[0] + d[0] * l1, p0[1] + d[1] * l1];
      const p2 = [p1[0] + b[0] * 0.5, p1[1] + b[1] * 0.5];
      const p3 = [p2[0] + d[0] * len2, p2[1] + d[1] * len2];
      route([p0, p1, p2, p3], w);
    }
  }
  function silkBox(x, z, w, d, lw = 0.012) {
    const c = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
    for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      const g = new THREE.BoxGeometry(len + lw, T, lw); g.rotateY(-Math.atan2(dz, dx)); g.translate((a[0] + b[0]) / 2, T, (a[1] + b[1]) / 2); silkGeos.push(g); }
  }
  const labels = [];
  function label(text, x, z, size = 0.12) { labels.push([text, x, z, size]); }

  // ---- components ----
  const black = new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.5, metalness: 0.1 });
  const pinMat = mat.metal('#d9dee3', 0.22);
  const alu = new THREE.MeshPhysicalMaterial({ color: '#d5dbe0', metalness: 0.75, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.15 });
  const ceramic = new THREE.MeshStandardMaterial({ color: '#23272c', roughness: 0.5 });
  const pinBoxes = [];
  function pin(x, y, z, sx, sy, sz) { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); pinBoxes.push(g); }

  function chipText(t, w, d) {
    return canvasTex(512, Math.round(512 * d / w), (c, cw, ch) => {
      c.fillStyle = '#16191d'; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(200,210,220,0.35)'; c.font = `700 ${Math.round(cw * 0.1)}px Inter`; c.textAlign = 'center'; c.fillText(t, cw / 2, ch * 0.5);
      c.font = `500 ${Math.round(cw * 0.05)}px Inter`; c.fillText('LQFP-100  2638', cw / 2, ch * 0.66);
      c.beginPath(); c.arc(cw * 0.1, ch * 0.85, cw * 0.025, 0, 7); c.fillStyle = 'rgba(200,210,220,0.25)'; c.fill();
    });
  }
  function qfp(x, z, s = 1, text = 'KINETIQ') {
    const h = 0.1 * s;
    const topMat = new THREE.MeshStandardMaterial({ map: chipText(text, s, s), roughness: 0.55 });
    add(S.scene, new THREE.BoxGeometry(s, h, s), [black, black, topMat, black, black, black], [x, 0.03 + h / 2, z]);
    const n = Math.round(22 * s), pitch = (s * 0.86) / n;
    for (let i = 0; i < n; i++) {
      const o = -s * 0.43 + (i + 0.5) * pitch;
      for (const sg of [-1, 1]) {
        pin(x + o, 0.035, z + sg * (s / 2 + 0.05), pitch * 0.5, 0.012, 0.1);
        pin(x + sg * (s / 2 + 0.05), 0.035, z + o, 0.1, 0.012, pitch * 0.5);
      }
    }
    silkBox(x, z, s + 0.36, s + 0.36);
  }
  function soic(x, z, w = 0.55, d = 0.36, n = 6, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; S.scene.add(g);
    add(g, new THREE.BoxGeometry(w, 0.12, d), black, [0, 0.09, 0]);
    const pitch = w / n;
    for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
      add(g, new THREE.BoxGeometry(pitch * 0.42, 0.014, 0.09), pinMat, [-w / 2 + (i + 0.5) * pitch, 0.1, sg * (d / 2 + 0.04)]);
      add(g, new THREE.BoxGeometry(pitch * 0.42, 0.09, 0.014), pinMat, [-w / 2 + (i + 0.5) * pitch, 0.055, sg * (d / 2 + 0.085)]);
      add(g, new THREE.BoxGeometry(pitch * 0.42, 0.014, 0.08), pinMat, [-w / 2 + (i + 0.5) * pitch, 0.012, sg * (d / 2 + 0.12)]);
    }
  }
  function cap(x, z, rad = 0.17, h = 0.36) {
    add(S.scene, new THREE.BoxGeometry(rad * 2.15, 0.06, rad * 2.15), ceramic, [x, 0.03, z]);
    add(S.scene, new THREE.CylinderGeometry(rad, rad, h, 40), alu, [x, 0.06 + h / 2, z]);
    add(S.scene, new THREE.TorusGeometry(rad * 0.98, 0.012, 8, 40), alu, [x, 0.06 + h * 0.18, z], [Math.PI / 2, 0, 0]);
    add(S.scene, new THREE.CylinderGeometry(rad * 0.97, rad, 0.02, 40), mat.metal('#aeb6bd', 0.35), [x, 0.07 + h, z]);
    add(S.scene, new THREE.BoxGeometry(rad * 0.9, 0.004, 0.02), mat.metal('#7f8890', 0.4), [x, 0.081 + h, z], [0, 0.7, 0]);
  }
  function crystal(x, z) {
    const sh = new THREE.Shape(); const w = 0.9, d = 0.32, rr = 0.16;
    sh.moveTo(-w / 2 + rr, -d / 2); sh.lineTo(w / 2 - rr, -d / 2); sh.absarc(w / 2 - rr, 0, rr, -Math.PI / 2, Math.PI / 2); sh.lineTo(-w / 2 + rr, d / 2); sh.absarc(-w / 2 + rr, 0, rr, Math.PI / 2, Math.PI * 1.5);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
    g.rotateX(-Math.PI / 2); add(S.scene, g, alu, [x, 0.04, z]);
    const lt = canvasTex(512, 160, (c, cw, ch) => { c.fillStyle = '#c3cad0'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#3a4148'; c.font = '600 64px Inter'; c.textAlign = 'center'; c.fillText('16.000 KQ', cw / 2, 100); });
    add(S.scene, new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshStandardMaterial({ map: lt, metalness: 0.6, roughness: 0.35 }), [x, 0.205, z], [-Math.PI / 2, 0, 0], false);
    add(S.scene, new THREE.BoxGeometry(w * 1.12, 0.03, d * 1.2), ceramic, [x, 0.015, z]);
  }
  function resArray(x, z, cols = 4, rows = 2) {
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = x + (i - (cols - 1) / 2) * 0.22, pz = z + (j - (rows - 1) / 2) * 0.2;
      add(S.scene, new THREE.BoxGeometry(0.045, 0.055, 0.1), pinMat, [px - 0.065, 0.028, pz]);
      add(S.scene, new THREE.BoxGeometry(0.085, 0.05, 0.095), black, [px, 0.026, pz]);
      add(S.scene, new THREE.BoxGeometry(0.045, 0.055, 0.1), pinMat, [px + 0.065, 0.028, pz]);
    }
    silkBox(x, z, cols * 0.22 + 0.16, rows * 0.2 + 0.14);
  }
  function small(x, z, w, d, h = 0.07) { add(S.scene, new THREE.BoxGeometry(w, h, d), black, [x, h / 2 + 0.01, z]); }

  // Hand-placed foreground (the camera sits at x=0, looking right of centre)
  qfp(0.55, -0.55, 1.15);
  bus(1.25, -0.1, 'x', 8, 0.9, 1, 1.6);
  bus(0.0, -1.25, 'y', 9, 0.6, -1, 1.4);
  bus(-0.3, 0.35, 'x', 6, -0.2, -1, 0.1, 0.07);
  cap(-1.05, 0.7); cap(-0.62, 0.95, 0.15, 0.32);
  cap(3.05, 0.35, 0.19, 0.4); cap(3.55, 0.15, 0.19, 0.4);
  crystal(-0.35, 1.55);
  resArray(1.15, 0.85, 4, 2); label('R14', 1.15, 1.23);
  resArray(2.35, 1.35, 5, 2); label('R15', 2.35, 1.75);
  soic(2.6, -0.35, 0.62, 0.4, 7);
  soic(2.0, 0.55, 0.5, 0.32, 5);
  route([[2.6, 0.12], [2.6, 0.35], [2.9, 0.65], [3.6, 0.65]]);
  route([[1.7, 1.25], [1.7, 1.6], [1.4, 1.9], [0.4, 1.9]]);
  bus(3.3, -0.9, 'x', 5, 0.5, -1, 2.0);

  // Procedural mid and far field
  for (let gz = -2; gz > -26; gz -= 1.1) {
    for (let gx = -9; gx < 12; gx += 1.1) {
      if (gz > -2.6 && gx > -1.6 && gx < 4.2) continue;
      const x = gx + (r() - 0.5) * 0.5, z = gz + (r() - 0.5) * 0.5, k = r();
      if (k < 0.18) soic(x, z, 0.45 + r() * 0.3, 0.3 + r() * 0.12, 4 + Math.floor(r() * 4), r() > 0.7 ? Math.PI / 2 : 0);
      else if (k < 0.3) cap(x, z, 0.13 + r() * 0.05, 0.26 + r() * 0.12);
      else if (k < 0.42) resArray(x, z, 3 + Math.floor(r() * 3), 1 + Math.floor(r() * 2));
      else if (k < 0.5) qfp(x, z, 0.55 + r() * 0.4, 'KQ-' + Math.floor(r() * 90 + 10));
      else if (k < 0.72) small(x, z, 0.2 + r() * 0.4, 0.15 + r() * 0.25);
      if (r() < 0.55) bus(x + 0.4, z, r() > 0.5 ? 'x' : 'y', 3 + Math.floor(r() * 6), 0.3 + r() * 0.6, r() > 0.5 ? 1 : -1, 0.3 + r() * 0.9);
    }
  }

  const traceMat = new THREE.MeshPhysicalMaterial({ color: '#d4e0ec', metalness: 0.4, roughness: 0.35, clearcoat: 0.6, emissive: '#3a5878', emissiveIntensity: 0.35 });
  const padMat = mat.metal('#dfe5ea', 0.25);
  const silkMat = new THREE.MeshStandardMaterial({ color: '#e9eef3', roughness: 0.6 });
  const merged = (list, m, flat = true) => { if (!list.length) return; const mesh = add(S.scene, mergeGeometries(list), m); mesh.castShadow = false; mesh.userData.flat = flat; };
  merged(traceGeos, traceMat); merged(padGeos, padMat); merged(silkGeos, silkMat); merged(pinBoxes, pinMat, false);
  for (const [t, x, z, size] of labels) {
    const lt = canvasTex(256, 96, (c, cw, ch) => { c.fillStyle = '#e9eef3'; c.font = '700 64px Inter'; c.textAlign = 'center'; c.fillText(t, cw / 2, 72); });
    add(S.scene, new THREE.PlaneGeometry(size * 2.6, size), new THREE.MeshBasicMaterial({ map: lt, transparent: true, color: '#cfd8e2' }), [x, 0.006, z], [-Math.PI / 2, 0, 0], false);
  }

  S.finish();

  // Project the visible traces to image pixels for the pulse animation
  const cam = S.camera;
  cam.position.set(...CAM); cam.lookAt(...TGT); cam.clearViewOffset(); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const out = [];
  const ray = new THREE.Raycaster();
  const solids = [];
  S.scene.traverse((o) => { if (o.isMesh && o !== board && !o.userData.flat && o.geometry.type !== 'PlaneGeometry') solids.push(o); });
  const hidden = (x, z) => {
    const p = new THREE.Vector3(x, 0.006, z), dir = p.clone().sub(cam.position), dist = dir.length();
    ray.set(cam.position, dir.normalize()); ray.far = dist - 0.02;
    return ray.intersectObjects(solids, false).some((h) => h.point.y > 0.012);
  };
  // Split each trace into the stretches the camera can actually see
  const visibleRuns = (pts) => {
    const runs = []; let cur = [];
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.04));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) {
        const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
        if (hidden(x, z)) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push([x, z]);
      }
    }
    if (cur.length > 1) runs.push(cur);
    return runs;
  };
  const simplify = (run) => run.filter((p, i) => {
    if (i === 0 || i === run.length - 1) return true;
    const [a, b, c] = [run[i - 1], p, run[i + 1]];
    return Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 1e-6;
  });
  for (const pts of traces) {
    const mid = pts[Math.floor(pts.length / 2)];
    if (mid[1] < -9 || mid[1] > 2.6) continue;
    for (const run of visibleRuns(pts)) {
      const sp = simplify(run).map(([x, z]) => { const v = new THREE.Vector3(x, 0.01, z).project(cam); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H, v.z]; });
      if (sp.some((p) => p[2] > 1 || p[0] < -200 || p[0] > W + 200 || p[1] < 0 || p[1] > H + 200)) continue;
      const len = sp.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - sp[i][0], p[1] - sp[i][1]), 0);
      if (len < 120) continue;
      out.push({ d: sp.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '), len: Math.round(len), depth: mid[1] });
    }
  }
  window.traces = out;
}
