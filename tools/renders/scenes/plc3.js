// PLC programming service image: a compact dark-grey smart relay / PLC (after
// the owner's reference) — stepped DIN-rail housing, screw terminals with
// labels along the top and bottom, a backlit LCD showing ladder logic, arrow
// keys and a teal OK key, and a memory cartridge slot. Dark studio to match
// the other service images.
import { studio, THREE, mat, add, canvasTex, rectShadow } from '../studio.js';
import { gearsStudio } from '../service-studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  // Exactly the gears image's studio, light and camera, so the background matches it
  const S = gearsStudio(q);

  const body = new THREE.MeshPhysicalMaterial({ color: '#eceeef', roughness: 0.5, clearcoat: 0.15 });
  const bodyDark = new THREE.MeshPhysicalMaterial({ color: '#cfd3d6', roughness: 0.55 });
  const blue = mat.plastic('#2f7d4f', 0.45), screw = mat.metal('#c8ccd0', 0.3), hole = mat.plastic('#121417', 0.7);
  // scaled to sit at the same size and camera distance as the gears and PCB
  const g = new THREE.Group(); g.rotation.y = -0.28; g.scale.setScalar(0.6); g.position.set(-0.05, 0, 0.45); S.scene.add(g);
  const W = 4.2, H = 2.9;

  // stepped housing: back (deepest) at the top and bottom terminal strips, raised centre
  add(g, new RoundedBoxGeometry(W, H, 0.7, 5, 0.06), bodyDark, [0, H / 2, -0.35]);
  add(g, new RoundedBoxGeometry(W - 0.1, H - 0.9, 0.5, 5, 0.06), body, [0, H / 2, 0.15]);
  add(g, new RoundedBoxGeometry(W - 0.2, 0.55, 0.3, 4, 0.05), body, [0, H - 0.3, 0.02]);   // top terminal ridge
  add(g, new RoundedBoxGeometry(W - 0.2, 0.45, 0.3, 4, 0.05), body, [0, 0.25, 0.02]);      // bottom terminal ridge
  // blue DIN latches at the ends
  for (const s of [-1, 1]) for (const y of [0.35, H - 0.35]) add(g, new RoundedBoxGeometry(0.12, 0.5, 0.6, 3, 0.03), blue, [s * (W / 2 + 0.03), y, -0.3]);
  // vent slots along the top edge
  for (let i = 0; i < 26; i++) add(g, new THREE.BoxGeometry(0.08, 0.02, 0.18), hole, [-W / 2 + 0.2 + i * 0.147, H + 0.005, -0.2], [0, 0, 0], false);

  const terminal = (x, y, z) => {
    add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.03, 24), hole, [x, y, z], [Math.PI / 2, 0, 0]);
    add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.04, 24), screw, [x, y, z + 0.015], [Math.PI / 2, 0, 0]);
    add(g, new THREE.BoxGeometry(0.11, 0.018, 0.01), hole, [x, y, z + 0.037], [0, 0, 0.6], false);
  };
  // top: + - then I1..IG
  const topLabels = ['+', '−', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'IA', 'IB', 'IC', 'ID', 'IE', 'IF', 'IG', '−'];
  const tx = (i) => -W / 2 + 0.3 + i * ((W - 0.6) / (topLabels.length - 1));
  topLabels.forEach((_, i) => terminal(tx(i) + (i > 1 ? 0.12 : 0), H - 0.38, 0.175));
  // bottom: relay outputs in pairs
  for (let i = 0; i < 10; i++) for (const d of [-0.09, 0.09]) terminal(-W / 2 + 0.45 + i * 0.37 + d, 0.22, 0.175);

  // printed labels on the front faces
  const label = (w, h, draw, pos) => { const t = canvasTex(1024, Math.round(1024 * h / w), draw);
    add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6 }), pos, [0, 0, 0], false); };
  label(W - 0.3, 0.2, (c, cw, ch) => { c.fillStyle = '#3a4046'; c.font = '600 30px Inter';
    topLabels.forEach((t, i) => { c.textAlign = 'center'; c.fillText(t, ((tx(i) + (i > 1 ? 0.12 : 0) + (W - 0.3) / 2) / (W - 0.3)) * cw, ch * 0.8); }); }, [0, H - 0.17, 0.176]);
  label(W - 0.3, 0.42, (c, cw, ch) => { c.fillStyle = '#3a4046'; c.font = '600 40px Inter';
    c.font = '600 26px Inter'; c.fillText('24VDC', 40, 60); c.fillText('Inputs I1…IA  24VDC', 260, 60); c.fillText('IB…IG  Analog or 24VDC', 680, 60); }, [0, H - 0.68, 0.402]);
  label(W - 0.3, 0.16, (c, cw, ch) => { c.fillStyle = '#3a4046'; c.font = '600 40px Inter';
    c.font = '600 26px Inter'; c.fillText('Outputs   Q1…Q8 : Relay 8A    Q9…QA : Relay 5A', 40, 30); }, [0, 0.53, 0.402]);

  // brand and model
  label(1.1, 0.14, (c) => { c.fillStyle = '#7a1f2b'; c.font = '700 70px Inter'; c.fillText('KINETIQ', 0, 92); }, [-1.25, 2.1, 0.402]);
  label(0.9, 0.12, (c) => { c.fillStyle = '#4b555c'; c.font = '600 60px Inter'; c.fillText('KQ-PLC 26', 0, 90); }, [1.05, 2.1, 0.402]);

  // backlit LCD with ladder logic
  const lcd = canvasTex(1024, 640, (c, w, h) => {
    c.fillStyle = '#cfe6d6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f5a3a'; c.fillRect(0, 0, w, 70); c.fillStyle = '#eef7f1'; c.font = '700 44px Inter';
    c.fillText('MAIN   Ladder Logic', 24, 50); c.textAlign = 'right'; c.fillText('RUN', w - 24, 50); c.textAlign = 'left';
    c.strokeStyle = '#1f5a3a'; c.fillStyle = '#1f5a3a'; c.lineWidth = 5; c.font = '600 34px Inter';
    c.beginPath(); c.moveTo(130, 90); c.lineTo(130, 560); c.moveTo(w - 40, 90); c.lineTo(w - 40, 560); c.stroke();
    const rows = [['I1', 'I2', 'Q1'], ['I3', 'M1', 'Q2'], ['I4', 'T1', 'Q3'], ['M1', 'I5', 'T1']];
    rows.forEach((r, i) => { const y = 150 + i * 110; c.fillText('00' + (i + 1), 20, y + 12);
      c.beginPath(); c.moveTo(130, y); c.lineTo(w - 40, y); c.stroke();
      [[230, r[0]], [430, r[1]]].forEach(([x, t]) => { c.clearRect(x - 18, y - 30, 36, 60); c.fillStyle = '#cfe6d6'; c.fillRect(x - 18, y - 30, 36, 60); c.fillStyle = '#1f5a3a';
        c.beginPath(); c.moveTo(x - 18, y - 28); c.lineTo(x - 18, y + 28); c.moveTo(x + 18, y - 28); c.lineTo(x + 18, y + 28); c.stroke(); c.fillText(t, x - 20, y - 38); });
      c.fillStyle = '#cfe6d6'; c.fillRect(w - 170, y - 32, 70, 64); c.fillStyle = '#1f5a3a';
      c.beginPath(); c.arc(w - 135, y, 30, Math.PI * 0.6, Math.PI * 1.4); c.stroke(); c.beginPath(); c.arc(w - 135, y, 30, -Math.PI * 0.4, Math.PI * 0.4); c.stroke();
      c.fillText(r[2], w - 160, y - 38); });
    c.fillStyle = '#1f5a3a'; c.fillRect(0, h - 70, w, 70); c.fillStyle = '#eef7f1'; c.font = '600 38px Inter';
    ['Menu', 'Edit', 'Monitor', '>>'].forEach((t, i) => c.fillText(t, 50 + i * 250, h - 22));
  });
  add(g, new THREE.BoxGeometry(1.9, 1.05, 0.03), bodyDark, [-0.75, 1.52, 0.405]);
  add(g, new THREE.PlaneGeometry(1.76, 0.96), new THREE.MeshPhysicalMaterial({ map: lcd, emissiveMap: lcd, emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.08, clearcoat: 1 }), [-0.75, 1.52, 0.423], [0, 0, 0], false);
  // keys: four arrows, teal OK, grey key
  const key = (x, c) => { add(g, new THREE.CylinderGeometry(0.11, 0.12, 0.08, 32), mat.plastic(c, 0.4), [x, 0.8, 0.44], [Math.PI / 2, 0, 0]); };
  [-1.5, -1.12, -0.74, -0.36].forEach((x) => key(x, '#a9b0b5')); key(0.05, '#2f9d63'); key(0.5, '#6d757b');
  // cartridge slot
  add(g, new THREE.BoxGeometry(0.42, 0.8, 0.03), hole, [0.95, 1.52, 0.41]);
  add(g, new THREE.BoxGeometry(0.36, 0.72, 0.02), bodyDark, [0.95, 1.52, 0.425]);
  // dot pattern on the blank right panel
  for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.01, 12), hole, [1.4 + i * 0.25, 1.85 - j * 0.28, 0.405], [Math.PI / 2, 0, 0], false);

  rectShadow(g, W + 0.3, 1.2, 0.6, 0.18, [0, 0.006, -0.1]);
  S.finish();
}
