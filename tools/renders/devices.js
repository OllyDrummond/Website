// The other two parts of the tank monitor system, modelled on the owner's photos:
// - receiver(): small white portrait case with a colour touch screen and a round
//   button above and below it. Sits in the house and uploads over Wi-Fi.
// - pumpController(): gloss black die-cast box with four recessed lid screws, a
//   cable gland on one end for the pump wiring, an antenna on the long edge and a
//   small window over the radio board's display.
// Units: 1 = 100 mm. Origins at the centre of the base.
import { THREE, mat, add, canvasTex } from './studio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { whip } from './unit.js';

function receiverScreen() {
  return canvasTex(480, 640, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0f1820'); bg.addColorStop(1, '#0a1016');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b99a3'; c.font = '600 26px Inter'; c.fillText('House tank', 30, 52);
    c.fillStyle = '#3fbf7f'; c.beginPath(); c.arc(w - 40, 43, 8, 0, 7); c.fill();
    // level ring
    const cx = w / 2, cy = 230, r = 120;
    c.lineWidth = 22; c.lineCap = 'round';
    c.strokeStyle = '#1d2a35'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#4a9be0'; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.68); c.stroke();
    c.fillStyle = '#eef3f6'; c.font = '800 84px Inter'; c.textAlign = 'center'; c.fillText('68%', cx, cy + 22);
    c.fillStyle = '#8b99a3'; c.font = '500 24px Inter'; c.fillText('17,000 L', cx, cy + 60);
    c.textAlign = 'left';
    // usage bars
    const vals = [58, 72, 49, 80, 66, 61, 75];
    vals.forEach((v, i) => { c.fillStyle = i === 6 ? '#5aa6e6' : '#2c5f8c'; const bh = v * 1.3; c.fillRect(40 + i * 58, 540 - bh, 38, bh); });
    c.fillStyle = '#8b99a3'; c.font = '500 20px Inter'; c.fillText('Daily use, last 7 days', 40, 580);
    c.fillStyle = '#7a1f2b'; c.fillRect(30, 600, w - 60, 4);
  });
}

export function receiver() {
  const g = new THREE.Group();
  const W = 0.7, H = 1.15, T = 0.3;
  const white = mat.plastic('#eef0f0', 0.42);
  add(g, new RoundedBoxGeometry(W, H, T, 8, 0.08), white, [0, H / 2, 0]);
  // front bezel recess and screen
  add(g, new THREE.BoxGeometry(0.5, 0.64, 0.012), mat.plastic('#0b0d0f', 0.3), [0, H * 0.5, T / 2 + 0.002], [0, 0, 0], false);
  const scr = new THREE.MeshPhysicalMaterial({ map: receiverScreen(), emissiveMap: receiverScreen(), emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  add(g, new THREE.PlaneGeometry(0.46, 0.6), scr, [0, H * 0.5 + 0.01, T / 2 + 0.01], [0, 0, 0], false);
  // round buttons above and below the screen
  for (const y of [H * 0.5 + 0.43, H * 0.5 - 0.43]) {
    add(g, new THREE.CylinderGeometry(0.062, 0.062, 0.03, 32), white, [0, y, T / 2 + 0.015], [Math.PI / 2, 0, 0]);
    const dome = new THREE.SphereGeometry(0.062, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.55, 1);
    add(g, dome, white, [0, y, T / 2 + 0.03], [Math.PI / 2, 0, 0]);
  }
  // USB-C power on the bottom edge
  add(g, new RoundedBoxGeometry(0.1, 0.03, 0.04, 2, 0.012), mat.plastic('#2a2f34', 0.5), [0, 0.012, 0], [0, 0, 0], false);
  return g;
}

function oledTexture() {
  return canvasTex(256, 200, (c, w, h) => {
    c.fillStyle = '#0a0c10'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#cfe6ff'; c.font = '700 30px Inter'; c.fillText('PUMP', 18, 52);
    c.fillStyle = '#7fd6a2'; c.fillText('RUN', 120, 52);
    c.fillStyle = '#cfe6ff'; c.font = '500 22px Inter'; c.fillText('Tank 68%', 18, 100); c.fillText('Auto  RSSI -92', 18, 140);
    c.strokeStyle = '#cfe6ff'; c.lineWidth = 3; c.strokeRect(18, 160, 200, 18); c.fillStyle = '#cfe6ff'; c.fillRect(18, 160, 136, 18);
  });
}

export function pumpController() {
  const g = new THREE.Group();
  const W = 1.62, D = 0.98, Hb = 0.42, Hl = 0.1;
  const black = new THREE.MeshPhysicalMaterial({ color: '#0b0c0e', roughness: 0.22, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.18 });
  add(g, new RoundedBoxGeometry(W, Hb, D, 6, 0.06), black, [0, Hb / 2, 0]);
  add(g, new RoundedBoxGeometry(W + 0.02, Hl, D + 0.02, 6, 0.05), black, [0, Hb + Hl / 2 + 0.006, 0]);
  add(g, new THREE.BoxGeometry(W - 0.02, 0.012, D - 0.02), mat.rubber('#020203'), [0, Hb + 0.003, 0], [0, 0, 0], false);
  const top = Hb + Hl + 0.006;
  // recessed corner screws
  for (const [x, z] of [[-0.7, -0.38], [0.7, -0.38], [-0.7, 0.38], [0.7, 0.38]]) {
    add(g, new THREE.CylinderGeometry(0.058, 0.05, 0.02, 24), mat.rubber('#030304'), [x, top - 0.006, z], [0, 0, 0], false);
    add(g, new THREE.CylinderGeometry(0.032, 0.032, 0.01, 6), mat.metal('#2a2c2f', 0.4), [x, top - 0.012, z], [0, 0, 0], false);
  }
  // window over the radio board's OLED
  add(g, new THREE.BoxGeometry(0.4, 0.012, 0.32), mat.metal('#3a3d40', 0.3), [-0.32, top + 0.001, 0.04], [0, 0, 0], false);
  const oled = new THREE.MeshStandardMaterial({ map: oledTexture(), emissiveMap: oledTexture(), emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.1 });
  add(g, new THREE.PlaneGeometry(0.34, 0.27), oled, [-0.32, top + 0.008, 0.04], [-Math.PI / 2, 0, 0], false);
  add(g, new THREE.PlaneGeometry(0.38, 0.3), new THREE.MeshPhysicalMaterial({ color: '#000', roughness: 0.02, transparent: true, opacity: 0.18, clearcoat: 1 }), [-0.32, top + 0.011, 0.04], [-Math.PI / 2, 0, 0], false);
  // cable gland on the left end for the pump wiring
  const gl = new THREE.Group(); gl.position.set(-W / 2, Hb * 0.55, 0.05); gl.rotation.z = Math.PI / 2; g.add(gl);
  add(gl, new THREE.CylinderGeometry(0.11, 0.11, 0.06, 6), mat.plastic('#141618', 0.5), [0, 0.03, 0]);
  add(gl, new THREE.CylinderGeometry(0.1, 0.1, 0.14, 28), mat.plastic('#141618', 0.6), [0, 0.13, 0]);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; add(gl, new THREE.BoxGeometry(0.012, 0.13, 0.02), mat.plastic('#0f1012', 0.6), [Math.cos(a) * 0.1, 0.13, Math.sin(a) * 0.1], [0, -a, 0], false); }
  add(gl, new THREE.CylinderGeometry(0.075, 0.095, 0.1, 28), mat.plastic('#141618', 0.6), [0, 0.25, 0]);
  g.userData.glandOut = new THREE.Vector3(-W / 2 - 0.27, Hb * 0.55, 0.05);
  // SMA antenna on the back long edge, near the right
  const ant = whip(1.9); ant.position.set(0.52, Hb * 0.62, -D / 2); ant.rotation.x = -Math.PI / 2; g.add(ant);
  ant.userData.rod.rotation.x = Math.PI / 2;
  return g;
}
