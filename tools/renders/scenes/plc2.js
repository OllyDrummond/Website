// Compact PLC (owner's reference: a light grey brick PLC seen from above at an
// angle): vented grey housing with DIN mounting ears, two rows of green
// pluggable terminal blocks across the top, a stepped front panel with a small
// LCD, status LEDs and keys, and a lower terminal row. Dark studio to match the
// other service images.
import { studio, THREE, mat, add, canvasTex, rectShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  // dark studio, like the gears and PCB service images
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), bg: '#161b20', floor: '#1d2329', fogNear: 9, fogFar: 22,
    cam: [-4.6, 4.2, 6.6], target: [0.3, 0.95, 0.2], fov: 30, aperture: 0.04, softness: 1.2,
    key: [-2, 8, 5], keyIntensity: 2.6, rim: [5, 4, -5], rimIntensity: 2.4, rimColor: '#8fc2ff',
    envIntensity: 0.5, fillIntensity: 0.18, shadowSize: 5, samples: +(q.get('n') || 56) });

  const shell = mat.plastic('#dfe3e6', 0.45), panel = mat.plastic('#cdd2d6', 0.42), dark = mat.plastic('#3b4248', 0.45);
  const green = mat.plastic('#2f4a3c', 0.5), slot = mat.plastic('#1a1f1c', 0.6), brass = mat.metal('#c9a64e', 0.3);
  const g = new THREE.Group(); g.rotation.y = 0.12; S.scene.add(g);
  const W = 3.2, D = 1.9, H = 2.0;            // housing: width (x), depth (z), height (y)

  // main housing and the stepped front module
  add(g, new RoundedBoxGeometry(W, H, D, 6, 0.1), shell, [0, H / 2, -0.15]);
  add(g, new RoundedBoxGeometry(W - 0.05, H * 0.62, 0.55, 6, 0.08), panel, [0, H * 0.31, D / 2 - 0.05]);
  // mounting ears on the back plate, left and right
  for (const x of [-W / 2 - 0.18, W / 2 + 0.18]) for (const y of [0.35, H - 0.35]) {
    add(g, new RoundedBoxGeometry(0.42, 0.42, 0.08, 4, 0.06), shell, [x, y, -D / 2 - 0.08]);
    add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.1, 20), mat.plastic('#8b9399', 0.5), [x, y, -D / 2 - 0.07], [Math.PI / 2, 0, 0]);
  }
  add(g, new RoundedBoxGeometry(W + 0.5, H - 0.2, 0.08, 4, 0.05), shell, [0, H / 2, -D / 2 - 0.1]);
  // side vents
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) for (const zc of [-0.55, 0.1])
    add(g, new THREE.BoxGeometry(0.02, 0.06, 0.42), dark, [s * (W / 2 + 0.005), 0.45 + k * 0.17, zc], [0, 0, 0], false);
  // top vents on the rear half
  for (let k = 0; k < 9; k++) add(g, new THREE.BoxGeometry(1.0, 0.02, 0.06), dark, [-0.85, H + 0.005, -0.85 + k * 0.1], [0, 0, 0], false);
  for (let k = 0; k < 9; k++) add(g, new THREE.BoxGeometry(1.0, 0.02, 0.06), dark, [0.55, H + 0.005, -0.85 + k * 0.1], [0, 0, 0], false);

  // two rows of green terminal blocks across the top front edge
  const block = (x, y, z) => {
    add(g, new RoundedBoxGeometry(0.34, 0.3, 0.36, 3, 0.03), green, [x, y, z]);
    add(g, new THREE.BoxGeometry(0.16, 0.12, 0.02), slot, [x, y + 0.02, z + 0.185], [0, 0, 0], false);
    add(g, new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), brass, [x, y + 0.16, z - 0.05]);
    add(g, new THREE.BoxGeometry(0.09, 0.012, 0.02), slot, [x, y + 0.177, z - 0.05], [0, 0.7, 0], false);
  };
  for (let i = 0; i < 8; i++) { block(-1.2 + i * 0.34, H + 0.15, 0.32); block(-1.2 + i * 0.34, H * 0.62 + 0.15, 0.82); }
  // lower terminal row along the bottom of the front module
  for (let i = 0; i < 8; i++) add(g, new RoundedBoxGeometry(0.3, 0.16, 0.12, 2, 0.02), mat.plastic('#2a2f33', 0.5), [-1.2 + i * 0.34, 0.12, D / 2 + 0.24]);

  // front panel: LCD, LEDs, keys, a hinged cover and a light-grey label strip
  const fz = D / 2 + 0.23;
  const lcd = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#9fc4e6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f3a56'; c.font = '700 44px Inter'; c.fillText('RUN', 26, 66); c.font = '600 34px Inter';
    c.fillText('I0.0-0.7  10110010', 26, 128); c.fillText('Q0.0-0.5  010110', 26, 184); c.fillText('KINETIQ  PLC', 26, 236);
  });
  add(g, new THREE.PlaneGeometry(0.95, 0.46), new THREE.MeshPhysicalMaterial({ map: lcd, emissiveMap: lcd, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.1, clearcoat: 1 }), [0.6, 0.86, fz + 0.003], [0, 0, 0], false);
  add(g, new THREE.PlaneGeometry(1.02, 0.53), mat.plastic('#3b4248', 0.3), [0.6, 0.86, fz + 0.001], [0, 0, 0], false);
  // keys to the right of the display
  for (let k = 0; k < 4; k++) add(g, new RoundedBoxGeometry(0.12, 0.1, 0.05, 2, 0.02), mat.plastic('#b9bfc4', 0.4), [1.33, 1.02 - k * 0.15, fz + 0.02]);
  // status LEDs with labels
  [['#e9d24a', 1.4], ['#9aa2a8', 0], ['#9aa2a8', 0]].forEach(([c, k], i) => {
    add(g, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), k ? mat.glow(c, k) : mat.plastic('#6d757b', 0.4), [-0.42, 0.98 - i * 0.16, fz + 0.015], [Math.PI / 2, 0, 0]);
    add(g, new THREE.BoxGeometry(0.22, 0.03, 0.005), mat.plastic('#8f979d', 0.5), [-0.22, 0.98 - i * 0.16, fz + 0.003], [0, 0, 0], false);
  });
  // hinged cover over the port, with a split line
  add(g, new RoundedBoxGeometry(0.62, 0.62, 0.05, 3, 0.03), mat.plastic('#c4c9cd', 0.45), [-1.05, 0.72, fz + 0.03]);
  add(g, new THREE.BoxGeometry(0.62, 0.012, 0.01), mat.plastic('#9aa1a6', 0.5), [-1.05, 0.62, fz + 0.058], [0, 0, 0], false);
  // small square indicators across the front edge (I/O status)
  for (let i = 0; i < 12; i++) add(g, new THREE.BoxGeometry(0.06, 0.06, 0.012), i % 3 === 1 ? mat.glow('#3fbf7f', 1.2) : mat.plastic('#eef0f1', 0.4), [-1.3 + i * 0.235, H * 0.62 - 0.08, fz + 0.005]);
  const brand = canvasTex(256, 64, (c) => { c.fillStyle = '#cdd2d6'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#7a1f2b'; c.font = '800 40px Inter'; c.fillText('KINETIQ', 18, 46); });
  add(g, new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: brand }), [0.45, 0.42, fz + 0.002], [0, 0, 0], false);

  rectShadow(g, W + 0.5, D + 0.7, 0.55, 0.22, [0, 0.004, 0.1]);
  S.finish();
}
