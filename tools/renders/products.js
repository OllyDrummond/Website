// Reusable product models for group shots (from the filtration and dosing scenes)
import { THREE, mat, add, tube, canvasTex } from './studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function filtrationUnit() {
  const g = new THREE.Group();

  
  const pvc = mat.plastic('#d5d9dc', 0.35);
  // wall plate
  add(g, new RoundedBoxGeometry(6.6, 4.4, 0.12, 4, 0.05), mat.plastic('#f3f4f5', 0.6), [0.4, 2.4, -0.75]);
  // manifold
  add(g, new THREE.CylinderGeometry(0.16, 0.16, 6.8, 40), pvc, [0.2, 3.9, 0], [0, 0, Math.PI / 2]);
  const xs = [-2.0, -0.6, 0.8];
  const cartridges = ['#e9dfc2', '#3a3f43', '#dce9f2'];
  xs.forEach((x, i) => {
    add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 48), mat.plastic('#2a2f34', 0.4), [x, 3.55, 0]);
    add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24), pvc, [x, 3.82, 0]);
    // cartridge inside
    add(g, new THREE.CylinderGeometry(0.3, 0.3, 2.0, 40), mat.plastic(cartridges[i], 0.8), [x, 2.3, 0], [0, 0, 0], false);
    // clear bowl
    add(g, new THREE.CylinderGeometry(0.44, 0.4, 2.3, 48), mat.clear('#cfe4f5'), [x, 2.22, 0], [0, 0, 0], false);
    add(g, new THREE.SphereGeometry(0.4, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.clear('#cfe4f5'), [x, 1.07, 0], [0, 0, 0], false);
    // pressure sensor between stages
    if (i < 2) {
      const gx = x + 0.7;
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.35, 16), mat.metal(), [gx, 4.2, 0]);
      const face = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 4;
        for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k * Math.PI * 0.15; c.beginPath(); c.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); c.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115); c.stroke(); }
        c.strokeStyle = '#9b2335'; c.lineWidth = 7; const a = Math.PI * 0.75 + (i ? 0.6 : 0.35) * Math.PI * 1.5; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); c.stroke(); });
      add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 40), mat.metal('#c8ced1', 0.25), [gx, 4.55, 0], [Math.PI / 2, 0, 0]);
      add(g, new THREE.CircleGeometry(0.24, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.3 }), [gx, 4.55, 0.062], [0, 0, 0], false);
    }
  });
  // flow meter + outlet
  add(g, new THREE.CylinderGeometry(0.24, 0.24, 0.5, 40), mat.metal('#a8b0b4', 0.3), [2.1, 3.9, 0], [0, 0, Math.PI / 2]);
  // controller
  add(g, new RoundedBoxGeometry(1.3, 1.7, 0.4, 6, 0.08), mat.plastic('#2a2f34', 0.4), [2.75, 2.1, -0.45]);
  const ui = canvasTex(512, 400, (c, w, h) => { c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('Stage 2 · Carbon', 30, 60);
    c.fillStyle = '#eef3f6'; c.font = '800 96px Inter'; c.fillText('0.4 bar', 26, 175);
    c.fillStyle = '#2f6fa8'; c.fillRect(30, 230, 452, 26); c.fillStyle = '#5aa6e6'; c.fillRect(30, 230, 300, 26);
    c.fillStyle = '#8b99a3'; c.font = '500 28px Inter'; c.fillText('Change in ~24 days', 30, 320); });
  add(g, new THREE.PlaneGeometry(1.05, 0.82), new THREE.MeshStandardMaterial({ map: ui, emissiveMap: ui, emissive: '#fff', emissiveIntensity: 0.9 }), [2.75, 2.45, -0.245], [0, 0, 0], false);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), mat.glow('#3fbf7f', 2), [2.45, 1.6, -0.24], [Math.PI / 2, 0, 0], false);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), mat.glow('#9b2335', 0.3), [2.7, 1.6, -0.24], [Math.PI / 2, 0, 0], false);
    return g;
}

export function dosingSet() {
  const g = new THREE.Group();

  
  // 20 L drum
  const drum = new THREE.Group(); drum.position.set(-2.3, 0, 0.3); drum.rotation.y = 0.35; g.add(drum);
  add(drum, new RoundedBoxGeometry(1.6, 2.2, 1.1, 8, 0.2), mat.plastic('#2c6d96', 0.5), [0, 1.1, 0]);
  add(drum, new THREE.CylinderGeometry(0.22, 0.22, 0.25, 32), mat.plastic('#f2f2f2', 0.5), [0.45, 2.3, 0]);
  add(drum, new THREE.TorusGeometry(0.32, 0.08, 12, 32, Math.PI), mat.plastic('#2c6d96', 0.5), [-0.3, 2.2, 0], [0, 0, 0]);
  const lbl = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1f23'; c.font = '800 64px Inter'; c.fillText('ACID', 40, 100); c.font = '500 34px Inter'; c.fillText('Dairy plant wash', 40, 155);
    c.save(); c.translate(256, 330); c.rotate(Math.PI / 4); c.fillStyle = '#fff'; c.strokeStyle = '#c21d2a'; c.lineWidth = 16; c.fillRect(-90, -90, 180, 180); c.strokeRect(-90, -90, 180, 180); c.restore();
    c.fillStyle = '#1b1f23'; c.font = '800 90px Inter'; c.fillText('!', 238, 362); });
  add(drum, new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.6 }), [0, 1.1, 0.556], [0, 0, 0], false);
  // pump
  const pump = new THREE.Group(); pump.position.set(0.3, 0, 0); g.add(pump);
  add(pump, new RoundedBoxGeometry(1.4, 1.2, 1.1, 6, 0.1), mat.plastic('#2a2f34', 0.4), [0, 0.6, 0]);
  add(pump, new THREE.CylinderGeometry(0.48, 0.48, 0.3, 48), mat.plastic('#7a1f2b', 0.35), [0, 0.7, 0.65], [Math.PI / 2, 0, 0]);
  add(pump, new THREE.CylinderGeometry(0.42, 0.42, 0.06, 48), mat.clear('#ffffff'), [0, 0.7, 0.83], [Math.PI / 2, 0, 0], false);
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.3; add(pump, new THREE.CylinderGeometry(0.09, 0.09, 0.2, 24), mat.metal('#d0d5d8', 0.2), [Math.cos(a) * 0.25, 0.7 + Math.sin(a) * 0.25, 0.72], [Math.PI / 2, 0, 0]); }
  add(pump, new THREE.CylinderGeometry(0.08, 0.08, 0.24, 24), mat.metal('#d0d5d8', 0.2), [0, 0.7, 0.72], [Math.PI / 2, 0, 0]);
  // tubing
  const tm = new THREE.MeshPhysicalMaterial({ color: '#f1ead8', roughness: 0.35, transmission: 0.3, thickness: 0.1 });
  tube(g, [[-1.85, 2.35, 0.45], [-1.6, 2.9, 0.5], [-0.7, 2.4, 0.7], [-0.25, 1.1, 0.85], [0.0, 0.9, 0.9]], 0.06, tm);
  tube(g, [[0.6, 0.9, 0.9], [1.1, 1.05, 0.95], [1.5, 0.5, 0.7], [1.9, 0.08, 0.1], [2.1, 0.06, -0.6]], 0.06, tm);
  // wash line
  // controller
  const ctl = new THREE.Group(); ctl.position.set(2.4, 0, -0.2); ctl.rotation.y = -0.3; g.add(ctl);
  add(ctl, new RoundedBoxGeometry(1.2, 1.6, 0.4, 6, 0.08), mat.plastic('#eef0f1', 0.4), [0, 0.8, 0]);
  const ui = canvasTex(512, 400, (c, w, h) => { c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('AM wash · 06:12', 30, 60);
    c.fillStyle = '#eef3f6'; c.font = '800 100px Inter'; c.fillText('180 mL', 26, 180);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('pH 2.4   ·   62 °C', 30, 250);
    c.fillStyle = '#3fbf7f'; c.font = '700 32px Inter'; c.fillText('✓ Dosed', 30, 330); });
  add(ctl, new THREE.PlaneGeometry(0.95, 0.74), new THREE.MeshStandardMaterial({ map: ui, emissiveMap: ui, emissive: '#fff', emissiveIntensity: 0.9 }), [0, 1.0, 0.205], [0, 0, 0], false);
  const lg = canvasTex(256, 64, (c) => { c.fillStyle = '#eef0f1'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#7a1f2b'; c.font = '800 40px Inter'; c.fillText('KINETIQ', 20, 46); });
  add(ctl, new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: lg }), [0, 0.35, 0.205], [0, 0, 0], false);
    return g;
}
