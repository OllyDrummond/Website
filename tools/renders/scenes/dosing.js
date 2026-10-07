import { studio, THREE, mat, add, tube, canvasTex, contactShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const S = studio({ w: 1600, h: 1200, bg: '#e7eaec', floor: '#e4e7e9', cam: [3.0, 4.2, 10.5], target: [0.3, 1.3, 0], fov: 26,
    aperture: 0.04, softness: 1.4, key: [5, 10, 7], keyIntensity: 2.3, envIntensity: 0.6, fillIntensity: 0.35, samples: 48 });
  // 20 L drum
  const drum = new THREE.Group(); drum.position.set(-2.3, 0, 0.3); drum.rotation.y = 0.35; S.scene.add(drum);
  add(drum, new RoundedBoxGeometry(1.6, 2.2, 1.1, 8, 0.2), mat.plastic('#2c6d96', 0.5), [0, 1.1, 0]);
  add(drum, new THREE.CylinderGeometry(0.22, 0.22, 0.25, 32), mat.plastic('#f2f2f2', 0.5), [0.45, 2.3, 0]);
  add(drum, new THREE.TorusGeometry(0.32, 0.08, 12, 32, Math.PI), mat.plastic('#2c6d96', 0.5), [-0.3, 2.2, 0], [0, 0, 0]);
  const lbl = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1f23'; c.font = '800 64px Inter'; c.fillText('ACID', 40, 100); c.font = '500 34px Inter'; c.fillText('Dairy plant wash', 40, 155);
    c.save(); c.translate(256, 330); c.rotate(Math.PI / 4); c.fillStyle = '#fff'; c.strokeStyle = '#c21d2a'; c.lineWidth = 16; c.fillRect(-90, -90, 180, 180); c.strokeRect(-90, -90, 180, 180); c.restore();
    c.fillStyle = '#1b1f23'; c.font = '800 90px Inter'; c.fillText('!', 238, 362); });
  add(drum, new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.6 }), [0, 1.1, 0.556], [0, 0, 0], false);
  // pump
  const pump = new THREE.Group(); pump.position.set(0.3, 0, 0); S.scene.add(pump);
  add(pump, new RoundedBoxGeometry(1.4, 1.2, 1.1, 6, 0.1), mat.plastic('#2a2f34', 0.4), [0, 0.6, 0]);
  add(pump, new THREE.CylinderGeometry(0.48, 0.48, 0.3, 48), mat.plastic('#7a1f2b', 0.35), [0, 0.7, 0.65], [Math.PI / 2, 0, 0]);
  add(pump, new THREE.CylinderGeometry(0.42, 0.42, 0.06, 48), mat.clear('#ffffff'), [0, 0.7, 0.83], [Math.PI / 2, 0, 0], false);
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.3; add(pump, new THREE.CylinderGeometry(0.09, 0.09, 0.2, 24), mat.metal('#d0d5d8', 0.2), [Math.cos(a) * 0.25, 0.7 + Math.sin(a) * 0.25, 0.72], [Math.PI / 2, 0, 0]); }
  add(pump, new THREE.CylinderGeometry(0.08, 0.08, 0.24, 24), mat.metal('#d0d5d8', 0.2), [0, 0.7, 0.72], [Math.PI / 2, 0, 0]);
  // tubing
  const tm = new THREE.MeshPhysicalMaterial({ color: '#f1ead8', roughness: 0.35, transmission: 0.3, thickness: 0.1 });
  tube(S.scene, [[-1.85, 2.35, 0.45], [-1.6, 2.9, 0.5], [-0.7, 2.4, 0.7], [-0.25, 1.1, 0.85], [0.0, 0.9, 0.9]], 0.06, tm);
  tube(S.scene, [[0.6, 0.9, 0.9], [1.0, 1.4, 0.8], [1.6, 2.6, 0.3], [2.4, 3.15, 0.0], [3.1, 3.3, -0.3]], 0.06, tm);
  // wash line
  add(S.scene, new THREE.CylinderGeometry(0.22, 0.22, 3.4, 40), mat.metal('#c9cfd2', 0.22), [4.6, 3.3, -0.4], [0, 0, Math.PI / 2]);
  // controller
  const ctl = new THREE.Group(); ctl.position.set(2.4, 0, -0.2); ctl.rotation.y = -0.3; S.scene.add(ctl);
  add(ctl, new RoundedBoxGeometry(1.2, 1.6, 0.4, 6, 0.08), mat.plastic('#eef0f1', 0.4), [0, 0.8, 0]);
  const ui = canvasTex(512, 400, (c, w, h) => { c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('AM wash · 06:12', 30, 60);
    c.fillStyle = '#eef3f6'; c.font = '800 100px Inter'; c.fillText('180 mL', 26, 180);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('pH 2.4   ·   62 °C', 30, 250);
    c.fillStyle = '#3fbf7f'; c.font = '700 32px Inter'; c.fillText('✓ Dosed', 30, 330); });
  add(ctl, new THREE.PlaneGeometry(0.95, 0.74), new THREE.MeshStandardMaterial({ map: ui, emissiveMap: ui, emissive: '#fff', emissiveIntensity: 0.9 }), [0, 1.0, 0.205], [0, 0, 0], false);
  const lg = canvasTex(256, 64, (c) => { c.fillStyle = '#eef0f1'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#7a1f2b'; c.font = '800 40px Inter'; c.fillText('KINETIQ', 20, 46); });
  add(ctl, new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: lg }), [0, 0.35, 0.205], [0, 0, 0], false);
  contactShadow(S.scene, 9, 3, 0.3, [0.2, 0.003, 0.2]);
  S.finish();
}
