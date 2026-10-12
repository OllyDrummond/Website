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

function receiverScreenWide() {
  return canvasTex(800, 600, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#101a23'); bg.addColorStop(1, '#0a1016');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = '#eef3f6'; c.font = '700 30px Inter'; c.fillText('House tank', 36, 58);
    c.fillStyle = '#8b99a3'; c.font = '500 22px Inter'; c.textAlign = 'right'; c.fillText('Updated 2 min ago', w - 66, 56); c.textAlign = 'left';
    c.fillStyle = '#3fbf7f'; c.beginPath(); c.arc(w - 42, 49, 9, 0, 7); c.fill();
    c.fillStyle = '#22303b'; c.fillRect(36, 82, w - 72, 2);
    // tank graphic filling to the level
    const tx = 40, ty = 116, tw = 170, th = 250, lvl = 0.68;
    c.save(); c.beginPath(); c.moveTo(tx, ty + 30); c.quadraticCurveTo(tx, ty, tx + tw / 2, ty); c.quadraticCurveTo(tx + tw, ty, tx + tw, ty + 30); c.lineTo(tx + tw, ty + th); c.lineTo(tx, ty + th); c.closePath();
    c.fillStyle = '#18242e'; c.fill(); c.clip();
    c.fillStyle = '#3d8fe0'; c.fillRect(tx, ty + th * (1 - lvl), tw, th * lvl);
    c.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 1; k < 4; k++) c.fillRect(tx, ty + (th * k) / 4, tw, 2);
    c.restore();
    c.strokeStyle = '#cfdbe4'; c.lineWidth = 4; c.beginPath(); c.moveTo(tx, ty + 30); c.quadraticCurveTo(tx, ty, tx + tw / 2, ty); c.quadraticCurveTo(tx + tw, ty, tx + tw, ty + 30); c.lineTo(tx + tw, ty + th); c.lineTo(tx, ty + th); c.closePath(); c.stroke();
    // big reading
    c.fillStyle = '#eef3f6'; c.font = '800 128px Inter'; c.fillText('68%', 240, 228);
    c.fillStyle = '#8b99a3'; c.font = '500 28px Inter'; c.fillText('15,000 L of 22,000 L', 246, 274);
    // two figures
    const stat = (x, k, v) => { c.fillStyle = '#8b99a3'; c.font = '500 22px Inter'; c.fillText(k, x, 330); c.fillStyle = '#eef3f6'; c.font = '700 38px Inter'; c.fillText(v, x, 372); };
    stat(246, 'Days left', '23'); stat(430, 'Today', '612 L'); stat(610, 'Pump', 'Off');
    // usage bars
    c.fillStyle = '#22303b'; c.fillRect(36, 404, w - 72, 2);
    c.fillStyle = '#8b99a3'; c.font = '500 22px Inter'; c.fillText('Daily use, last 7 days', 40, 444);
    const vals = [58, 72, 49, 80, 66, 61, 75], days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    vals.forEach((v, i) => { const x = 40 + i * 104, bh = v * 1.05; c.fillStyle = i === 6 ? '#5aa6e6' : '#2c5f8c'; c.fillRect(x, 548 - bh, 70, bh);
      c.fillStyle = '#6f7d87'; c.font = '500 18px Inter'; c.fillText(days[i], x + 28, 576); });
  });
}

// The receiver turned on its side: wide screen, buttons left and right.
export function receiverWide() {
  const g = new THREE.Group();
  const W = 1.15, H = 0.7, T = 0.3;
  const white = mat.plastic('#eef0f0', 0.42);
  add(g, new RoundedBoxGeometry(W, H, T, 8, 0.08), white, [0, H / 2, 0]);
  add(g, new THREE.BoxGeometry(0.66, 0.5, 0.012), mat.plastic('#0b0d0f', 0.3), [0, H * 0.5, T / 2 + 0.002], [0, 0, 0], false);
  const tex = receiverScreenWide();
  const scr = new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  add(g, new THREE.PlaneGeometry(0.62, 0.465), scr, [0, H * 0.5, T / 2 + 0.01], [0, 0, 0], false);
  for (const x of [-0.45, 0.45]) {
    add(g, new THREE.CylinderGeometry(0.062, 0.062, 0.03, 32), white, [x, H * 0.5, T / 2 + 0.015], [Math.PI / 2, 0, 0]);
    const dome = new THREE.SphereGeometry(0.062, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.55, 1);
    add(g, dome, white, [x, H * 0.5, T / 2 + 0.03], [Math.PI / 2, 0, 0]);
  }
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

// A phone showing the Kinetiq app with the same reading as the receiver.
function appScreen() {
  return canvasTex(560, 1160, (c, w, h) => {
    c.fillStyle = '#0d141a'; c.fillRect(0, 0, w, h);
    // status bar
    c.fillStyle = '#eef3f6'; c.font = '600 26px Inter'; c.fillText('9:41', 44, 58);
    c.fillRect(w - 100, 40, 46, 20); c.fillStyle = '#0d141a'; c.fillRect(w - 98, 42, 10, 16);
    // header
    c.fillStyle = '#e8a3ad'; c.font = '700 26px Inter'; c.fillText('Kinetiq', 44, 128);
    c.fillStyle = '#eef3f6'; c.font = '800 46px Inter'; c.fillText('House tank', 44, 184);
    c.fillStyle = '#8b99a3'; c.font = '500 24px Inter'; c.fillText('Updated 2 min ago', 44, 222);
    c.fillStyle = '#3fbf7f'; c.beginPath(); c.arc(w - 60, 176, 11, 0, 7); c.fill();
    // level card
    const card = (x, y, cw, ch) => { c.fillStyle = '#16212a'; c.beginPath(); c.roundRect(x, y, cw, ch, 26); c.fill(); };
    card(32, 256, w - 64, 330);
    const tx = 64, ty = 296, tw = 150, th = 250;
    c.save(); c.beginPath(); c.moveTo(tx, ty + 28); c.quadraticCurveTo(tx, ty, tx + tw / 2, ty); c.quadraticCurveTo(tx + tw, ty, tx + tw, ty + 28); c.lineTo(tx + tw, ty + th); c.lineTo(tx, ty + th); c.closePath();
    c.fillStyle = '#1f2d38'; c.fill(); c.clip(); c.fillStyle = '#3d8fe0'; c.fillRect(tx, ty + th * 0.32, tw, th); c.restore();
    c.strokeStyle = '#cfdbe4'; c.lineWidth = 4; c.beginPath(); c.moveTo(tx, ty + 28); c.quadraticCurveTo(tx, ty, tx + tw / 2, ty); c.quadraticCurveTo(tx + tw, ty, tx + tw, ty + 28); c.lineTo(tx + tw, ty + th); c.lineTo(tx, ty + th); c.closePath(); c.stroke();
    c.fillStyle = '#eef3f6'; c.font = '800 112px Inter'; c.fillText('68%', 240, 420);
    c.fillStyle = '#8b99a3'; c.font = '500 25px Inter'; c.fillText('15,000 L of 22,000 L', 244, 466);
    c.fillStyle = '#5aa6e6'; c.font = '700 25px Inter'; c.fillText('23 days left', 244, 520);
    // two small cards
    card(32, 612, (w - 80) / 2, 150); card(48 + (w - 80) / 2, 612, (w - 80) / 2, 150);
    c.fillStyle = '#8b99a3'; c.font = '500 24px Inter'; c.fillText('Today', 60, 660); c.fillText('Fill pump', 76 + (w - 80) / 2, 660);
    c.fillStyle = '#eef3f6'; c.font = '700 44px Inter'; c.fillText('612 L', 60, 724); c.fillText('Off', 76 + (w - 80) / 2, 724);
    c.fillStyle = '#2b3a46'; c.beginPath(); c.roundRect(w - 140, 690, 76, 40, 20); c.fill(); c.fillStyle = '#8b99a3'; c.beginPath(); c.arc(w - 120, 710, 15, 0, 7); c.fill();
    // usage chart
    card(32, 788, w - 64, 250);
    c.fillStyle = '#eef3f6'; c.font = '700 28px Inter'; c.fillText('Daily use', 60, 840);
    c.fillStyle = '#8b99a3'; c.font = '500 22px Inter'; c.fillText('Last 7 days', w - 190, 840);
    const vals = [58, 72, 49, 80, 66, 61, 75];
    vals.forEach((v, i) => { const x = 66 + i * 62, bh = v * 1.6; c.fillStyle = i === 6 ? '#5aa6e6' : '#2c5f8c'; c.beginPath(); c.roundRect(x, 1008 - bh, 38, bh, 6); c.fill(); });
    // tab bar
    c.fillStyle = '#16212a'; c.fillRect(0, 1070, w, 90);
    ['#5aa6e6', '#56636d', '#56636d', '#56636d'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.roundRect(70 + i * 128, 1098, 36, 30, 8); c.fill(); });
  });
}

export function phone() {
  const g = new THREE.Group();
  const W = 0.74, H = 1.52, T = 0.08;
  add(g, new RoundedBoxGeometry(W, H, T, 8, 0.1), mat.metal('#3a4046', 0.35), [0, 0, 0]);
  add(g, new RoundedBoxGeometry(W - 0.02, H - 0.02, T + 0.004, 8, 0.09), new THREE.MeshPhysicalMaterial({ color: '#05070a', roughness: 0.05, clearcoat: 1 }), [0, 0, 0.002]);
  const tex = appScreen();
  add(g, new THREE.PlaneGeometry(W - 0.07, H - 0.07), new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 }), [0, 0, T / 2 + 0.006], [0, 0, 0], false);
  add(g, new RoundedBoxGeometry(0.16, 0.045, 0.01, 2, 0.02), mat.plastic('#000', 0.3), [0, H / 2 - 0.08, T / 2 + 0.008], [0, 0, 0], false);
  return g;
}

// Simple desk stand for the phone (origin on the floor)
export function phoneStand() {
  const g = new THREE.Group();
  const m = mat.plastic('#d9dde0', 0.4);
  add(g, new RoundedBoxGeometry(0.7, 0.05, 0.6, 3, 0.02), m, [0, 0.025, 0]);
  add(g, new RoundedBoxGeometry(0.62, 0.7, 0.05, 3, 0.02), m, [0, 0.36, -0.12], [-0.32, 0, 0]);
  add(g, new RoundedBoxGeometry(0.62, 0.08, 0.1, 3, 0.02), m, [0, 0.09, 0.14]);
  return g;
}
