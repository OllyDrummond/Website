import { studio, THREE, mat, add, canvasTex } from '../studio.js';
import { unit, probe, cable, solarPanel, BOX } from '../unit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: 1200, h: 900, bg: '#1b2126', floor: '#232a30', fogNear: 12, fogFar: 30,
    cam: [0, 3.2, 10.0], target: [0, 1.7, 0], fov: 30, aperture: 0.03, softness: 1.2,
    key: [5, 10, 6], keyIntensity: 2.8, rim: [-6, 4, -5], rimIntensity: 2.4, rimColor: '#8fc2ff',
    envIntensity: 0.45, fillIntensity: 0.2, shadowSize: 6, samples: +(q.get('n') || 16) });
  const root = new THREE.Group(); S.scene.add(root);
  // enclosure with the lid pulled forward and the panel lifted
  const u = unit({ lidOffset: 1.7, panelLift: 1.0, showLogo: true }); u.position.y = 1.2; root.add(u);
  // electronics inside: PCB and battery, pulled half out
  const pcbTex = canvasTex(512, 384, (c, w, h) => { c.fillStyle = '#0d4a33'; c.fillRect(0, 0, w, h); c.strokeStyle = '#17694a'; c.lineWidth = 6;
    for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(Math.random() * w, Math.random() * h); c.lineTo(Math.random() * w, Math.random() * h); c.stroke(); }
    c.fillStyle = '#e8ece9'; c.font = '700 26px Inter'; c.fillText('KINETIQ TM-1', 20, h - 20); });
  const pcb = new THREE.Group(); pcb.position.set(0, 1.2 + 0.6, 1.15); root.add(pcb);
  add(pcb, new THREE.BoxGeometry(1.2, 0.85, 0.04), [mat.plastic('#0d4a33'), mat.plastic('#0d4a33'), mat.plastic('#0d4a33'), mat.plastic('#0d4a33'), new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.35 }), mat.plastic('#0d4a33')]);
  add(pcb, new THREE.BoxGeometry(0.3, 0.3, 0.06), mat.plastic('#15181b'), [-0.25, 0.1, 0.05]);
  add(pcb, new THREE.BoxGeometry(0.4, 0.32, 0.08), mat.metal('#cfd4d7', 0.25), [0.3, 0.12, 0.06]);
  add(pcb, new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16), mat.metal('#c9a64e', 0.25), [0.62, 0.3, 0.05], [0, 0, Math.PI / 2]);
  const bat = new THREE.Group(); bat.position.set(0, 1.2 + 0.4, 0.85); root.add(bat);
  add(bat, new RoundedBoxGeometry(1.0, 0.36, 0.34, 4, 0.04), mat.plastic('#2f6fb2', 0.5));
  add(bat, new THREE.BoxGeometry(0.02, 0.37, 0.35), mat.plastic('#1c2227'), [0.2, 0, 0]);
  // probe and a short cable section below
  const p = probe(); p.position.set(0.35, 0.1 + 1.6, 0); p.scale.setScalar(0.9); root.add(p);
  p.position.y = 1.55; p.position.x = 1.9; p.position.z = 0.4;
  cable(root, [[0.35, 1.05, 0.05], [0.4, 0.6, 0.2], [1.2, 0.4, 0.5], [1.9, 1.0, 0.45], [1.9, 1.55, 0.4]], 0.035);
  const frames = +(q.get('frames') || 1);
  S.turntable(frames, (i) => { root.rotation.y = -0.5 + (i / frames) * Math.PI * 2; });
}
