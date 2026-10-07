import { studio, THREE, mat, add, canvasTex, contactShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const S = studio({ w: 1600, h: 1200, bg: '#e7eaec', floor: '#e4e7e9', cam: [3.2, 3.6, 12.5], target: [0.4, 2.4, 0], fov: 27,
    aperture: 0.04, softness: 1.4, key: [5, 10, 7], keyIntensity: 2.3, envIntensity: 0.6, fillIntensity: 0.35, samples: 48 });
  const pvc = mat.plastic('#d5d9dc', 0.35);
  // wall plate
  add(S.scene, new RoundedBoxGeometry(6.6, 4.4, 0.12, 4, 0.05), mat.plastic('#f3f4f5', 0.6), [0.4, 2.4, -0.75]);
  // manifold
  add(S.scene, new THREE.CylinderGeometry(0.16, 0.16, 6.8, 40), pvc, [0.2, 3.9, 0], [0, 0, Math.PI / 2]);
  const xs = [-2.0, -0.6, 0.8];
  const cartridges = ['#e9dfc2', '#3a3f43', '#dce9f2'];
  xs.forEach((x, i) => {
    add(S.scene, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 48), mat.plastic('#2a2f34', 0.4), [x, 3.55, 0]);
    add(S.scene, new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24), pvc, [x, 3.82, 0]);
    // cartridge inside
    add(S.scene, new THREE.CylinderGeometry(0.3, 0.3, 2.0, 40), mat.plastic(cartridges[i], 0.8), [x, 2.3, 0], [0, 0, 0], false);
    // clear bowl
    add(S.scene, new THREE.CylinderGeometry(0.44, 0.4, 2.3, 48), mat.clear('#cfe4f5'), [x, 2.22, 0], [0, 0, 0], false);
    add(S.scene, new THREE.SphereGeometry(0.4, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.clear('#cfe4f5'), [x, 1.07, 0], [0, 0, 0], false);
    // pressure sensor between stages
    if (i < 2) {
      const gx = x + 0.7;
      add(S.scene, new THREE.CylinderGeometry(0.06, 0.06, 0.35, 16), mat.metal(), [gx, 4.2, 0]);
      const face = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 4;
        for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k * Math.PI * 0.15; c.beginPath(); c.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); c.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115); c.stroke(); }
        c.strokeStyle = '#9b2335'; c.lineWidth = 7; const a = Math.PI * 0.75 + (i ? 0.6 : 0.35) * Math.PI * 1.5; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); c.stroke(); });
      add(S.scene, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 40), mat.metal('#c8ced1', 0.25), [gx, 4.55, 0], [Math.PI / 2, 0, 0]);
      add(S.scene, new THREE.CircleGeometry(0.24, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.3 }), [gx, 4.55, 0.062], [0, 0, 0], false);
    }
  });
  // flow meter + outlet
  add(S.scene, new THREE.CylinderGeometry(0.24, 0.24, 0.5, 40), mat.metal('#a8b0b4', 0.3), [2.1, 3.9, 0], [0, 0, Math.PI / 2]);
  // controller
  add(S.scene, new RoundedBoxGeometry(1.3, 1.7, 0.4, 6, 0.08), mat.plastic('#2a2f34', 0.4), [2.75, 2.1, -0.45]);
  const ui = canvasTex(512, 400, (c, w, h) => { c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '500 30px Inter'; c.fillText('Stage 2 · Carbon', 30, 60);
    c.fillStyle = '#eef3f6'; c.font = '800 96px Inter'; c.fillText('0.4 bar', 26, 175);
    c.fillStyle = '#2f6fa8'; c.fillRect(30, 230, 452, 26); c.fillStyle = '#5aa6e6'; c.fillRect(30, 230, 300, 26);
    c.fillStyle = '#8b99a3'; c.font = '500 28px Inter'; c.fillText('Change in ~24 days', 30, 320); });
  add(S.scene, new THREE.PlaneGeometry(1.05, 0.82), new THREE.MeshStandardMaterial({ map: ui, emissiveMap: ui, emissive: '#fff', emissiveIntensity: 0.9 }), [2.75, 2.45, -0.245], [0, 0, 0], false);
  add(S.scene, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), mat.glow('#3fbf7f', 2), [2.45, 1.6, -0.24], [Math.PI / 2, 0, 0], false);
  add(S.scene, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), mat.glow('#9b2335', 0.3), [2.7, 1.6, -0.24], [Math.PI / 2, 0, 0], false);
  contactShadow(S.scene, 8, 2.5, 0.25, [0.4, 0.003, -0.4]);
  S.finish();
}
