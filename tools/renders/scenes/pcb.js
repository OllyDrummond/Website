import { studio, THREE, mat, add, canvasTex } from '../studio.js';
export default function () {
  const S = studio({ w: 1600, h: 1000, bg: '#161b20', floor: '#1d2329', fogNear: 6, fogFar: 18, cam: [2.4, 2.6, 3.6], target: [0.1, 0.05, 0.1], fov: 30,
    aperture: 0.05, softness: 1.0, key: [3, 6, 2], keyIntensity: 2.6, rim: [-4, 3, -4], rimIntensity: 2.2, envIntensity: 0.35, fillIntensity: 0.15, shadowSize: 4, samples: 56 });
  const board = new THREE.Group(); board.rotation.y = -0.25; S.scene.add(board);
  const W = 3.2, D = 2.0;
  const tex = canvasTex(2048, 1280, (c, w, h) => {
    c.fillStyle = '#0d4a33'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#17694a'; c.lineCap = 'round';
    let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) { c.lineWidth = 4 + r() * 8; c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y);
      for (let k = 0; k < 3; k++) { if (r() > 0.5) x += (r() - 0.5) * 600; else y += (r() - 0.5) * 400; c.lineTo(x, y); } c.stroke(); }
    c.fillStyle = '#c9a54a'; for (let i = 0; i < 160; i++) { c.beginPath(); c.arc(r() * w, r() * h, 7, 0, 7); c.fill(); }
    c.fillStyle = '#e8ece9'; c.font = '700 54px Inter'; c.fillText('KINETIQ  LVL-01  REV C', 80, h - 80);
    c.font = '500 34px Inter'; c.fillText('U1', 820, 420); c.fillText('RF1', 1320, 330); c.fillText('J1', 1820, 900); c.fillText('C4', 460, 900);
    c.strokeStyle = '#e8ece9'; c.lineWidth = 4; c.strokeRect(1180, 360, 520, 420);
  });
  add(board, new THREE.BoxGeometry(W, 0.06, D), [
    new THREE.MeshStandardMaterial({ color: '#0d4a33', roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: '#0d4a33', roughness: 0.4 }),
    new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.3 }), new THREE.MeshStandardMaterial({ color: '#0d4a33' }),
    new THREE.MeshStandardMaterial({ color: '#0d4a33' }), new THREE.MeshStandardMaterial({ color: '#0d4a33' })], [0, 0.03, 0]);
  const top = 0.06;
  const ic = (w, d, h, x, z, c = '#15181b', m = 0) => add(board, new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: m ? 0.25 : 0.55, metalness: m }), [x - W / 2, top + h / 2, z - D / 2]);
  // MCU with pins
  ic(0.5, 0.5, 0.06, 1.25, 0.75);
  for (let k = 0; k < 10; k++) { for (const s of [-1, 1]) { ic(0.025, 0.08, 0.015, 1.04 + k * 0.045, 0.75 + s * 0.29, '#c7ccd0', 1); ic(0.08, 0.025, 0.015, 1.25 + s * 0.29, 0.54 + k * 0.045, '#c7ccd0', 1); } }
  // RF module can
  ic(0.75, 0.62, 0.1, 2.2, 0.6, '#cfd4d7', 1);
  // SMA connector
  add(board, new THREE.CylinderGeometry(0.1, 0.1, 0.35, 6), mat.metal('#d6b15a', 0.2), [W / 2 - 0.05, top + 0.12, -0.5], [0, 0, Math.PI / 2]);
  // caps & resistors
  for (let k = 0; k < 14; k++) ic(0.1, 0.05, 0.04, 0.5 + (k % 7) * 0.14, 1.35 + Math.floor(k / 7) * 0.12, k % 3 ? '#b58a52' : '#1b1e21');
  // electrolytic
  add(board, new THREE.CylinderGeometry(0.16, 0.16, 0.42, 32), mat.metal('#2c3a6b', 0.35), [0.55 - W / 2, top + 0.21, 0.6 - D / 2]);
  add(board, new THREE.CylinderGeometry(0.16, 0.16, 0.01, 32), mat.metal('#c3c8cb', 0.3), [0.55 - W / 2, top + 0.425, 0.6 - D / 2]);
  // header
  ic(1.1, 0.12, 0.12, 1.6, 1.8, '#111');
  for (let k = 0; k < 10; k++) add(board, new THREE.BoxGeometry(0.03, 0.3, 0.03), mat.metal('#d6b15a', 0.2), [1.6 - 0.495 + k * 0.11 - W / 2, top + 0.2, 1.8 - D / 2]);
  // JST battery connector
  ic(0.3, 0.22, 0.2, 2.8, 1.6, '#f1f1ec');
  S.finish();
}
