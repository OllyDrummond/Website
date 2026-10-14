// AI battery concept (product card, 4:3): a slim wall-or-floor home battery in
// dark brushed metal, the Kinetiq mark engraved top left, and a thin status
// light near the base. Light studio to match the other product cards.
import { studio, THREE, mat, add, canvasTex, rectShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#e3e5e7', floor: '#e1e3e5', fogNear: 18, fogFar: 40,
    cam: [1.25, 2.0, 6.1], target: [0.05, 1.38, 0], fov: 30, aperture: 0.015, softness: 1.8,
    key: [-5, 7, 5], keyIntensity: 2.2, rim: [5, 4, -4], rimIntensity: 1.2, rimColor: '#ffffff',
    envIntensity: 0.9, fillIntensity: 0.45, samples: +(q.get('n') || 48) });

  const W = 1.55, H = 2.62, D = 0.26;
  const g = new THREE.Group(); g.rotation.y = -0.2; S.scene.add(g);

  // brushed aluminium front: a soft light-to-dark sheen across the face (like the
  // reference), fine vertical grain; darker anodised sides
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const face = canvasTex(1024, 1728, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#a3a6aa'); gr.addColorStop(0.18, '#8d9095'); gr.addColorStop(0.55, '#4a4d52'); gr.addColorStop(0.85, '#212327'); gr.addColorStop(1, '#141518');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(255,255,255,0.05)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.08)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.008 + r() * 0.014})`; c.fillRect(r() * w, 0, 1, h); }
  });
  const metal = new THREE.MeshPhysicalMaterial({ color: '#2b2d31', metalness: 0.8, roughness: 0.42, clearcoat: 0.2, clearcoatRoughness: 0.4 });
  const front = new THREE.MeshPhysicalMaterial({ map: face, metalness: 0.35, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.35 });
  const edge = new THREE.MeshPhysicalMaterial({ color: '#1d1f22', metalness: 0.7, roughness: 0.45 });
  add(g, new RoundedBoxGeometry(W, H, D, 6, 0.035), metal, [0, H / 2 + 0.06, 0]);
  add(g, new THREE.PlaneGeometry(W - 0.03, H - 0.03), front, [0, H / 2 + 0.06, D / 2 + 0.0012], [0, 0, 0], false);
  // recessed dark plinth so it floats a little off the floor
  add(g, new RoundedBoxGeometry(W - 0.12, 0.08, D - 0.08, 3, 0.02), edge, [0, 0.04, 0]);

  // engraved Kinetiq mark (bar + chevron) top left of the front face
  const logo = canvasTex(512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(10,11,13,0.9)'; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(70, 60); c.lineTo(70, 196); c.stroke();
    c.beginPath(); c.moveTo(170, 60); c.lineTo(108, 128); c.lineTo(170, 196); c.stroke();
    c.font = '600 64px Inter'; c.fillStyle = 'rgba(12,13,15,0.8)'; c.fillText('KINETIQ', 210, 150);
  });
  add(g, new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map: logo, transparent: true, metalness: 0.6, roughness: 0.5 }), [-W / 2 + 0.42, H - 0.14, D / 2 + 0.003], [0, 0, 0], false);

  // status light: a hairline slot near the base, lit about two thirds of the way
  add(g, new THREE.BoxGeometry(W * 0.5, 0.012, 0.004), new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.6 }), [0, 0.42, D / 2 + 0.003], [0, 0, 0], false);
  add(g, new THREE.BoxGeometry(W * 0.5 * 0.68, 0.01, 0.005), mat.glow('#cfe6ff', 1.6), [-W * 0.25 + W * 0.5 * 0.34, 0.42, D / 2 + 0.004], [0, 0, 0], false);

  rectShadow(g, W + 0.25, D + 0.5, 0.5, 0.25, [0, 0.003, 0.05]);
  rectShadow(g, W - 0.05, D, 0.7, 0.06, [0, 0.004, 0]);
  S.finish();
}
