// Electronics & PCB design service image: the first version's composition
// (board at an angle with a microcontroller, RF can, header, electrolytic and a
// connector) on a blue board with much more detail: dense routed traces, vias,
// QFN/SOIC chips, passives, crystal, silkscreen. Shared dark service studio.
import { studio, THREE, mat, add, canvasTex } from '../studio.js';
import { SERVICE_STUDIO, servicePlate } from '../service-studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  // Same lit studio floor and camera direction/distance as the custom machine (gears) image
  const S = studio({ ...SERVICE_STUDIO, backdrop: null, w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), cam: [0.7, 2.75, 5.2], target: [0, 0.1, 0],
    aperture: 0.045, samples: +(q.get('n') || 56) });
  const board = new THREE.Group(); board.rotation.y = -0.25; S.scene.add(board);
  const W = 3.2, D = 2.0, PX = 2048 / W;   // texture pixels per unit
  let seed = 9; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // component footprints (board units, origin at the board's top-left corner)
  const parts = {
    mcu: [1.25, 0.75, 0.5], rf: [2.2, 0.6, 0.72], soic: [[0.55, 1.05], [0.9, 0.45], [2.6, 1.35], [1.85, 1.55]],
    qfn: [[1.7, 1.1], [2.75, 0.25]], cap: [0.55, 0.6], header: [1.6, 1.8], xtal: [1.0, 1.25],
  };
  const bumps = [];
  const tex = canvasTex(2048, 1280, (c, w, h) => {
    const P = (x) => x * PX;
    c.fillStyle = '#163f86'; c.fillRect(0, 0, w, h);
    // ground pour hatch, slightly lighter
    c.fillStyle = '#18438c'; for (let i = 0; i < 40; i++) c.fillRect(r() * w, r() * h, 120 + r() * 300, 60 + r() * 200);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const trace = (pts, wdt = 5) => { c.strokeStyle = '#1c4a96'; c.lineWidth = wdt + 3; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(P(x), P(y)) : c.moveTo(P(x), P(y))); c.stroke();
      c.strokeStyle = '#2556a6'; c.lineWidth = wdt; c.stroke(); bumps.push([pts, wdt]); };
    const via = (x, y) => { c.fillStyle = '#c4a25a'; c.beginPath(); c.arc(P(x), P(y), 8, 0, 7); c.fill(); c.fillStyle = '#0a2d5e'; c.beginPath(); c.arc(P(x), P(y), 3.5, 0, 7); c.fill(); };
    // fan-out from the MCU on all four sides
    const [mx, my, ms] = parts.mcu;
    for (let i = 0; i < 12; i++) {
      const o = -ms * 0.42 + i * (ms * 0.84 / 11), sp = (o / (ms * 0.42));
      for (const s of [-1, 1]) {
        const L = 0.08 + r() * 0.06, B = 0.12 + Math.abs(sp) * 0.18, E = 0.15 + r() * 0.5;
        let a = [mx + o, my + s * (ms / 2 + 0.05)], b = [a[0], a[1] + s * L], d = [b[0] + sp * B, b[1] + s * B], e = [d[0], d[1] + s * E];
        trace([a, b, d, e], 4); if (r() > 0.4) via(...e);
        a = [mx + s * (ms / 2 + 0.05), my + o]; b = [a[0] + s * L, a[1]]; d = [b[0] + s * B, b[1] + sp * B]; e = [d[0] + s * E, d[1]];
        trace([a, b, d, e], 4); if (r() > 0.4) via(...e);
      }
    }
    // buses and long routes across the board
    for (let k = 0; k < 60; k++) {
      const x0 = r() * W, y0 = r() * D, horiz = r() > 0.5, L1 = 0.2 + r() * 0.7, s = r() > 0.5 ? 1 : -1, L2 = 0.1 + r() * 0.3, L3 = 0.2 + r() * 0.6;
      const p1 = horiz ? [x0 + L1, y0] : [x0, y0 + L1], p2 = horiz ? [p1[0] + L2, p1[1] + s * L2] : [p1[0] + s * L2, p1[1] + L2], p3 = horiz ? [p2[0] + L3, p2[1]] : [p2[0], p2[1] + L3];
      trace([[x0, y0], p1, p2, p3], r() > 0.85 ? 9 : 4); via(x0, y0); if (r() > 0.5) via(...p3);
    }
    // power traces
    trace([[0.2, 1.9], [1.0, 1.9], [1.2, 1.7], [2.9, 1.7]], 14); trace([[0.25, 0.2], [0.25, 1.6]], 14);
    // pads under passives and the RF can, gold
    c.fillStyle = '#c4a25a';
    for (let k = 0; k < 160; k++) { const x = r() * W, y = r() * D, v = r() > 0.5; c.fillRect(P(x), P(y), v ? 10 : 22, v ? 22 : 10); c.fillRect(P(x) + (v ? 0 : 34), P(y) + (v ? 34 : 0), v ? 10 : 22, v ? 22 : 10); }
    // silkscreen
    c.strokeStyle = '#e8eef5'; c.fillStyle = '#e8eef5'; c.lineWidth = 3; c.font = '600 30px Inter';
    const sbox = (x, y, sw, sh, t) => { c.strokeRect(P(x - sw / 2), P(y - sh / 2), P(sw), P(sh)); if (t) c.fillText(t, P(x - sw / 2), P(y - sh / 2) - 8); };
    sbox(mx, my, ms + 0.22, ms + 0.22, 'U1'); sbox(parts.rf[0], parts.rf[1], 0.82, 0.7, 'RF1');
    parts.soic.forEach(([x, y], i) => sbox(x, y, 0.42, 0.34, 'U' + (i + 2))); parts.qfn.forEach(([x, y], i) => sbox(x, y, 0.3, 0.3, 'U' + (i + 6)));
    for (let k = 0; k < 30; k++) { c.font = '500 22px Inter'; c.fillText(['R', 'C', 'L', 'D'][k % 4] + (k + 1), r() * w, r() * h); }
    c.font = '700 54px Inter'; c.fillText('KINETIQ  LVL-01  REV D', 80, h - 70);
    // mounting holes
    for (const [x, y] of [[0.12, 0.12], [W - 0.12, 0.12], [0.12, D - 0.12], [W - 0.12, D - 0.12]]) { c.fillStyle = '#c4a25a'; c.beginPath(); c.arc(P(x), P(y), 34, 0, 7); c.fill(); c.fillStyle = '#0a1a33'; c.beginPath(); c.arc(P(x), P(y), 20, 0, 7); c.fill(); }
  });
  const bump = canvasTex(2048, 1280, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [pts, wdt] of bumps) { c.lineWidth = wdt + 2; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * PX, y * PX) : c.moveTo(x * PX, y * PX)); c.stroke(); }
  });
  // satin solder mask: soft sheen, no mirror glare; traces slightly raised underneath
  const edge = new THREE.MeshStandardMaterial({ color: '#0f2f63', roughness: 0.6 });
  const mask = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: bump, bumpScale: 1.2, roughness: 0.58, clearcoat: 0.2, clearcoatRoughness: 0.55, envMapIntensity: 0.7 });
  add(board, new THREE.BoxGeometry(W, 0.06, D), [edge, edge, mask, edge, edge, edge], [0, 0.03, 0]);

  const top = 0.06, black = new THREE.MeshStandardMaterial({ color: '#15181b', roughness: 0.5 }), pinM = mat.metal('#c7ccd0', 0.25);
  const at = (x, z) => [x - W / 2, z - D / 2];
  const box = (w, d, h, x, z, m) => { const [px, pz] = at(x, z); return add(board, new THREE.BoxGeometry(w, h, d), m, [px, top + h / 2, pz]); };
  // MCU (LQFP) with legs on four sides
  const [mx, mz, ms] = parts.mcu; box(ms, ms, 0.06, mx, mz, black);
  for (let k = 0; k < 12; k++) { const o = -ms * 0.42 + k * (ms * 0.84 / 11); for (const s of [-1, 1]) { box(0.022, 0.07, 0.014, mx + o, mz + s * (ms / 2 + 0.03), pinM); box(0.07, 0.022, 0.014, mx + s * (ms / 2 + 0.03), mz + o, pinM); } }
  // RF shield can with a lid seam
  box(0.75, 0.62, 0.1, parts.rf[0], parts.rf[1], mat.metal('#cfd4d7', 0.3)); box(0.7, 0.57, 0.004, parts.rf[0], parts.rf[1] + 0.0, mat.metal('#b9bfc3', 0.35)).position.y = top + 0.102;
  // SOICs with gull-wing legs
  parts.soic.forEach(([x, z]) => { box(0.32, 0.22, 0.05, x, z, black); for (let k = 0; k < 4; k++) for (const s of [-1, 1]) box(0.03, 0.06, 0.012, x - 0.12 + k * 0.08, z + s * 0.14, pinM); });
  parts.qfn.forEach(([x, z]) => box(0.22, 0.22, 0.035, x, z, black));
  // crystal
  { const [px, pz] = at(...parts.xtal); add(board, new RoundedBoxGeometry(0.32, 0.08, 0.12, 3, 0.04), mat.metal('#d8dde0', 0.25), [px, top + 0.04, pz]); }
  // passives scattered
  for (let k = 0; k < 90; k++) { const x = 0.15 + r() * (W - 0.3), z = 0.15 + r() * (D - 0.3); if (Math.abs(x - mx) < 0.4 && Math.abs(z - mz) < 0.4) continue;
    const v = r() > 0.5, w = v ? 0.035 : 0.07, d = v ? 0.07 : 0.035; box(w, d, 0.03, x, z, new THREE.MeshStandardMaterial({ color: r() > 0.4 ? '#2a2c2f' : '#9c8f78', roughness: 0.5 })); }
  // SMA connector on the right edge, electrolytic, header, JST
  add(board, new THREE.CylinderGeometry(0.1, 0.1, 0.35, 6), mat.metal('#d6b15a', 0.2), [W / 2 - 0.05, top + 0.12, -0.5], [0, 0, Math.PI / 2]);
  { const [px, pz] = at(...parts.cap); add(board, new THREE.CylinderGeometry(0.16, 0.16, 0.42, 32), mat.metal('#2c3a6b', 0.35), [px, top + 0.21, pz]); add(board, new THREE.CylinderGeometry(0.16, 0.16, 0.01, 32), mat.metal('#c3c8cb', 0.3), [px, top + 0.425, pz]); }
  box(1.1, 0.12, 0.12, parts.header[0], parts.header[1], new THREE.MeshStandardMaterial({ color: '#111' }));
  for (let k = 0; k < 10; k++) { const [px, pz] = at(parts.header[0] - 0.495 + k * 0.11, parts.header[1]); add(board, new THREE.BoxGeometry(0.03, 0.3, 0.03), mat.metal('#d6b15a', 0.2), [px, top + 0.2, pz]); }
  box(0.3, 0.22, 0.2, 2.8, 1.65, new THREE.MeshStandardMaterial({ color: '#f1f1ec', roughness: 0.5 }));
  S.finish();
}
