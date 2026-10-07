import { studio, THREE, mat, add, canvasTex } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const S = studio({ w: 1600, h: 1000, bg: '#e7eaec', floorY: null, cam: [1.6, 0.9, 8.4], target: [-0.3, 0.3, 0], fov: 30,
    aperture: 0.05, softness: 1.2, key: [4, 6, 6], keyIntensity: 2.2, envIntensity: 0.6, fillIntensity: 0.35, samples: 48 });
  // back plate
  add(S.scene, new THREE.BoxGeometry(9, 6, 0.1), mat.metal('#d7dbde', 0.55), [0, 0, -0.35]);
  // ducts
  const duct = mat.plastic('#a9b0b5', 0.6);
  for (const y of [1.9, -1.4]) {
    add(S.scene, new THREE.BoxGeometry(8.6, 0.6, 0.5), duct, [0, y, -0.05]);
    for (let k = 0; k < 40; k++) add(S.scene, new THREE.BoxGeometry(0.06, 0.62, 0.52), new THREE.MeshStandardMaterial({ color: '#8f979c' }), [-4.2 + k * 0.215, y, -0.05], [0, 0, 0], false);
  }
  // DIN rail
  add(S.scene, new THREE.BoxGeometry(8.6, 0.35, 0.08), mat.metal('#c3c9cc', 0.25), [0, 0.25, -0.26]);
  // PLC CPU + IO modules
  const mod = (x, w, label, leds, c = '#eceeef') => {
    add(S.scene, new RoundedBoxGeometry(w, 2.0, 0.9, 4, 0.04), mat.plastic(c, 0.5), [x, 0.25, 0.2]);
    const t = canvasTex(256, 512, (g, W, H) => { g.fillStyle = c; g.fillRect(0, 0, W, H); g.fillStyle = '#7a1f2b'; g.fillRect(0, 0, W, 18);
      g.fillStyle = '#2a2f34'; g.font = '700 30px Inter'; g.fillText(label, 18, 64);
      for (let i = 0; i < leds; i++) { g.fillStyle = i % 3 ? '#3fbf7f' : '#2f3a33'; g.fillRect(24 + (i % 2) * 110, 100 + Math.floor(i / 2) * 34, 22, 14); g.fillStyle = '#5b646b'; g.font = '500 18px Inter'; g.fillText((i % 2 ? 'Q' : 'I') + '0.' + Math.floor(i / 2), 54 + (i % 2) * 110, 114 + Math.floor(i / 2) * 34); }
    });
    add(S.scene, new THREE.PlaneGeometry(w * 0.92, 1.84), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#fff', emissiveIntensity: 0.12, roughness: 0.5 }), [x, 0.25, 0.652], [0, 0, 0], false);
    // terminals top/bottom
    for (const ty of [1.12, -0.62]) add(S.scene, new THREE.BoxGeometry(w * 0.9, 0.2, 0.5), mat.plastic('#3a4147', 0.5), [x, ty, 0.3]);
  };
  mod(-3.2, 1.3, 'CPU 1214', 12, '#e4e7e9');
  mod(-1.85, 0.75, 'DI 16', 16);
  mod(-1.0, 0.75, 'DQ 16', 16);
  mod(-0.15, 0.75, 'AI 4', 8);
  // terminal blocks
  const cols = ['#9aa3a8', '#9aa3a8', '#2f6fb2', '#2f6fb2', '#c8b33a', '#9aa3a8', '#9aa3a8', '#2f6fb2', '#9aa3a8', '#9aa3a8', '#2f6fb2', '#2f6fb2'];
  cols.forEach((c, k) => add(S.scene, new THREE.BoxGeometry(0.12, 0.9, 0.8), mat.plastic(c, 0.45), [0.8 + k * 0.135, 0.25, 0.15]));
  // contactors
  for (const x of [2.8, 3.6]) {
    add(S.scene, new RoundedBoxGeometry(0.7, 1.3, 1.0, 4, 0.05), mat.plastic('#2a2f34', 0.45), [x, 0.25, 0.25]);
    add(S.scene, new THREE.BoxGeometry(0.4, 0.3, 0.1), mat.plastic('#9aa3a8', 0.5), [x, 0.3, 0.78]);
  }
  // wires into ducts
  const wire = (x0, c) => { const pts = [new THREE.Vector3(x0, 1.2, 0.35), new THREE.Vector3(x0, 1.45, 0.3), new THREE.Vector3(x0 + 0.05, 1.65, 0.1)]; add(S.scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.025, 8), mat.plastic(c, 0.5)); };
  for (let k = 0; k < 8; k++) { wire(-2.15 + k * 0.08, '#2f6fb2'); wire(-1.3 + k * 0.08, k % 2 ? '#9b2335' : '#2f6fb2'); }
  S.finish();
}
