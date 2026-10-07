import { studio, THREE, mat, add, canvasTex, contactShadow } from '../studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function () {
  const S = studio({ w: 1600, h: 1200, bg: '#e7eaec', floor: '#e4e7e9', cam: [3.4, 3.0, 6.6], target: [0, 0.95, 0], fov: 25,
    aperture: 0.03, softness: 1.2, key: [4, 9, 5], keyIntensity: 2.2, envIntensity: 0.55, fillIntensity: 0.35, samples: 48 });
  const g = new THREE.Group(); g.rotation.y = -0.32; S.scene.add(g);
  // wedge body
  const shape = new THREE.Shape(); shape.moveTo(-0.9, 0); shape.lineTo(0.9, 0); shape.lineTo(0.55, 1.5); shape.lineTo(0.15, 1.5); shape.lineTo(-0.9, 0.25); shape.closePath();
  const body = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 6 });
  body.translate(0, 0, -1.3);
  const b = add(g, body, mat.plastic('#2a2f34', 0.4), [0, 0.08, 0], [0, Math.PI / 2, 0]);
  // screen on sloped face
  const ui = canvasTex(1200, 720, (c, w, h) => {
    c.fillStyle = '#0d1419'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '500 40px Inter'; c.fillText('Tank 1 · House', 60, 90);
    c.fillStyle = '#eef3f6'; c.font = '800 190px Inter'; c.fillText('62%', 54, 300);
    c.fillStyle = '#8b99a3'; c.font = '500 38px Inter'; c.fillText('13,640 L · 21 days left', 60, 370);
    const vals = [52, 61, 48, 70, 66, 58, 74, 63, 55, 68, 72, 60, 57, 65];
    vals.forEach((v, i) => { c.fillStyle = i === vals.length - 1 ? '#5aa6e6' : '#2f6fa8'; const bh = v * 3; c.fillRect(60 + i * 78, 660 - bh, 56, bh); });
    c.strokeStyle = '#7a1f2b'; c.lineWidth = 6; c.beginPath(); c.arc(1060, 150, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.62); c.stroke();
  });
  const screenMat = new THREE.MeshStandardMaterial({ map: ui, emissiveMap: ui, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.15 });
  // sloped face from (-0.9,0.25)->(0.15,1.5) in shape coords; after rotation y=PI/2, shape x maps to -z
  const len = Math.hypot(1.05, 1.25), ang = Math.atan2(1.25, 1.05);
  const scr = add(g, new THREE.PlaneGeometry(2.2, len * 0.8), screenMat, [0, 0.08 + 0.875 + 0.11 * 0.64, 0.375 + 0.11 * 0.77], [-(Math.PI / 2 - ang), 0, 0], false);
  // bezel glass
  add(g, new THREE.PlaneGeometry(2.4, len * 0.92), new THREE.MeshPhysicalMaterial({ color: '#000', roughness: 0.05, transparent: true, opacity: 0.25, clearcoat: 1 }), [0, 0.08 + 0.875 + 0.115 * 0.64, 0.375 + 0.115 * 0.77], [-(Math.PI / 2 - ang), 0, 0], false);
  // antenna
  add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.12, 32), mat.metal(), [1.05, 1.65, -0.45]);
  add(g, new THREE.CylinderGeometry(0.045, 0.065, 1.4, 32), mat.rubber(), [1.05, 2.35, -0.45]);
  // maroon status strip
  add(g, new THREE.BoxGeometry(2.0, 0.04, 0.02), mat.glow('#7a1f2b', 0.5), [0, 0.2, 0.99], [0, 0, 0], false);
  contactShadow(S.scene, 4.4, 3.4, 0.5);
  S.finish();
}
