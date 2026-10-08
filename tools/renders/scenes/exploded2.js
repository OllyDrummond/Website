import { studio, THREE, mat, add, canvasTex } from '../studio.js';
import { unit2, probe2, cable } from '../unit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1200), bg: '#1b2126', floor: '#232a30', fogNear: 12, fogFar: 30,
    cam: [3.2, 3.4, 8.2], target: [0.2, 1.6, 0], fov: 30, aperture: 0.03, softness: 1.2,
    key: [5, 10, 6], keyIntensity: 2.8, rim: [-6, 4, -5], rimIntensity: 2.4, rimColor: '#8fc2ff',
    envIntensity: 0.45, fillIntensity: 0.2, shadowSize: 6, samples: +(q.get('n') || 40) });
  const root = new THREE.Group(); root.rotation.y = -0.35; S.scene.add(root);
  const u = unit2({ lidOffset: 0.9, panelLift: 0.8 }); u.position.y = 0.5; root.add(u);
  const pcbTex = canvasTex(512, 384, (c, w, h) => { c.fillStyle = '#0d4a33'; c.fillRect(0, 0, w, h); c.strokeStyle = '#17694a'; c.lineWidth = 6;
    for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(Math.random() * w, Math.random() * h); c.lineTo(Math.random() * w, Math.random() * h); c.stroke(); }
    c.fillStyle = '#e8ece9'; c.font = '700 26px Inter'; c.fillText('KINETIQ TM-1', 20, h - 20); });
  const pcb = new THREE.Group(); pcb.position.set(0, 0.5 + 1.15, 0); root.add(pcb);
  const g = mat.plastic('#0d4a33');
  add(pcb, new THREE.BoxGeometry(1.15, 0.04, 0.9), [g, g, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.35 }), g, g, g]);
  add(pcb, new THREE.BoxGeometry(0.28, 0.06, 0.28), mat.plastic('#15181b'), [-0.25, 0.05, 0.1]);
  add(pcb, new THREE.BoxGeometry(0.36, 0.08, 0.3), mat.metal('#cfd4d7', 0.25), [0.28, 0.06, -0.12]);
  add(pcb, new THREE.CylinderGeometry(0.05, 0.05, 0.25, 16), mat.metal('#c9a64e', 0.25), [0.56, 0.06, 0.3], [0, 0, Math.PI / 2]);
  const bat = new THREE.Group(); bat.position.set(0, 0.5 + 0.95, 0); root.add(bat);
  add(bat, new RoundedBoxGeometry(0.9, 0.22, 0.5, 4, 0.04), mat.plastic('#2f6fb2', 0.5));
  const p = probe2(); p.position.set(-1.6, 1.6, 0.4); root.add(p);
  u.updateMatrixWorld(true);
  const gl = root.worldToLocal(u.localToWorld(u.userData.glandOut.clone()));
  cable(root, [[gl.x, gl.y, gl.z], [gl.x - 0.3, gl.y - 0.1, gl.z + 0.1], [-1.4, 0.4, 0.5], [-1.9, 0.9, 0.45], [-1.6, 1.6, 0.4]], 0.035);
  S.finish();
}
