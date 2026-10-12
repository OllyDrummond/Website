// Electronics & PCB design service image: a blue board close up, dense copper
// traces fanning out from a central QFP to smaller chips and passives. Dark
// studio lighting to match the other service images.
import { studio, THREE, mat, add, canvasTex } from '../studio.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function () {
  const q = new URLSearchParams(location.search);
  const S = studio({ w: +(q.get('w') || 1600), h: +(q.get('h') || 1000), bg: '#161b20', floor: '#1d2329', fogNear: 7, fogFar: 18,
    cam: [0.9, 2.3, 3.6], target: [0.15, 0, -0.1], fov: 34, aperture: 0.045, softness: 1.0,
    key: [2.5, 6, 2.5], keyIntensity: 2.4, keyColor: '#e6efff', rim: [-4, 2.5, -5], rimIntensity: 2.6, rimColor: '#7fb8ff',
    envIntensity: 0.55, fillIntensity: 0.16, shadowSize: 4, samples: +(q.get('n') || 56) });
  S.scene.fog.color.set('#141c27');

  let seed = 21; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const BW = 7, BD = 5;             // board size
  const T = 0.004;                  // copper thickness

  // board: deep blue solder mask with a faint weave
  const maskTex = canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = '#0c4aa8'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.04})`; c.fillRect(r() * w, r() * h, 2, 2); } });
  maskTex.wrapS = maskTex.wrapT = THREE.RepeatWrapping; maskTex.repeat.set(3, 3);
  const mask = new THREE.MeshPhysicalMaterial({ map: maskTex, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 0.6 });
  const edge = new THREE.MeshStandardMaterial({ color: '#123f78', roughness: 0.6 });
  add(S.scene, new THREE.BoxGeometry(BW, 0.08, BD), [edge, edge, mask, edge, edge, edge], [0, -0.04, 0]);

  const traces = [], pads = [], silk = [];
  const strip = (a, b, w) => { const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); const g = new THREE.BoxGeometry(len + w, T, w);
    g.rotateY(-Math.atan2(dz, dx)); g.translate((a[0] + b[0]) / 2, T / 2, (a[1] + b[1]) / 2); traces.push(g); };
  const via = (p, rad = 0.028) => { const g = new THREE.TorusGeometry(rad, rad * 0.32, 6, 18); g.rotateX(Math.PI / 2); g.translate(p[0], T, p[1]); pads.push(g); };
  const route = (pts, w = 0.016, v = true) => { for (let i = 1; i < pts.length; i++) strip(pts[i - 1], pts[i], w); if (v) via(pts[pts.length - 1]); };
  const box = (x, z, w, d, lw = 0.008) => { const c = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
    for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      const g = new THREE.BoxGeometry(len + lw, T, lw); g.rotateY(-Math.atan2(dz, dx)); g.translate((a[0] + b[0]) / 2, T, (a[1] + b[1]) / 2); silk.push(g); } };

  // central QFP with traces fanning out on all four sides (bend at 45 degrees)
  const black = new THREE.MeshStandardMaterial({ color: '#15181c', roughness: 0.5 });
  const pin = mat.metal('#d9dee3', 0.22);
  const pinGeos = [];
  function qfp(x, z, s, fan) {
    const top = canvasTex(512, 512, (c, w) => { c.fillStyle = '#15181c'; c.fillRect(0, 0, w, w); c.beginPath(); c.arc(70, 440, 16, 0, 7); c.fillStyle = 'rgba(200,210,220,0.25)'; c.fill(); });
    add(S.scene, new THREE.BoxGeometry(s, 0.08, s), [black, black, fan ? new THREE.MeshStandardMaterial({ map: top, roughness: 0.7, envMapIntensity: 0.3 }) : black, black, black, black], [x, 0.045, z]);
    const n = Math.round(s * 24), pitch = (s * 0.88) / n;
    for (let i = 0; i < n; i++) {
      const o = -s * 0.44 + (i + 0.5) * pitch;
      for (const sg of [-1, 1]) {
        for (const [px, pz, sx, sz] of [[x + o, z + sg * (s / 2 + 0.04), pitch * 0.45, 0.08], [x + sg * (s / 2 + 0.04), z + o, 0.08, pitch * 0.45]]) {
          const g = new THREE.BoxGeometry(sx, 0.01, sz); g.translate(px, 0.012, pz); pinGeos.push(g);
        }
        if (!fan) continue;
        // fan-out: straight out, 45-degree bend away from the centre line, then straight to a via
        const spread = (o / (s * 0.44));
        const L1 = 0.12 + r() * 0.05, L2 = 0.25 + Math.abs(spread) * 0.35, L3 = 0.35 + r() * 0.9;
        const vx = [x + o, z + sg * (s / 2 + 0.08)], dz2 = sg;
        const a1 = [vx[0], vx[1] + dz2 * L1], a2 = [a1[0] + spread * L2, a1[1] + dz2 * L2], a3 = [a2[0], a2[1] + dz2 * L3];
        route([vx, a1, a2, a3], 0.014, r() > 0.35);
        const hx = [x + sg * (s / 2 + 0.08), z + o];
        const b1 = [hx[0] + sg * L1, hx[1]], b2 = [b1[0] + sg * L2, b1[1] + spread * L2], b3 = [b2[0] + sg * L3, b2[1]];
        route([hx, b1, b2, b3], 0.014, r() > 0.35);
      }
    }
  }
  qfp(0, 0, 1.0, true);
  qfp(-2.5, -1.55, 0.7, false); qfp(2.45, -1.7, 0.75, false); qfp(2.7, 1.55, 0.6, false);

  // small ICs, passives and pad arrays scattered round the board
  const soic = (x, z, rot = 0, n = 4) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; S.scene.add(g);
    add(g, new THREE.BoxGeometry(0.34, 0.07, 0.24), black, [0, 0.045, 0]);
    for (let i = 0; i < n; i++) for (const sg of [-1, 1]) add(g, new THREE.BoxGeometry(0.035, 0.012, 0.09), pin, [-0.13 + i * (0.26 / (n - 1)), 0.014, sg * 0.15]); };
  const passive = (x, z, rot, col) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; S.scene.add(g);
    add(g, new THREE.BoxGeometry(0.08, 0.04, 0.05), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }), [0, 0.022, 0]);
    for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.03, 0.045, 0.055), pin, [sx * 0.05, 0.023, 0]); };
  for (let k = 0; k < 22; k++) { const x = (r() - 0.5) * (BW - 0.8), z = (r() - 0.5) * (BD - 0.6);
    if (Math.abs(x) < 1.6 && Math.abs(z) < 1.6) continue; soic(x, z, r() > 0.5 ? Math.PI / 2 : 0, 3 + Math.floor(r() * 3)); }
  for (let k = 0; k < 70; k++) { const x = (r() - 0.5) * (BW - 0.4), z = (r() - 0.5) * (BD - 0.4);
    if (Math.abs(x) < 0.7 && Math.abs(z) < 0.7) continue; passive(x, z, r() > 0.5 ? Math.PI / 2 : 0, r() > 0.35 ? '#24272b' : '#8d877c'); }
  // silkscreen outlines and labels
  for (const [x, z, w, d] of [[-2.5, -1.55, 1.1, 1.1], [2.45, -1.7, 1.15, 1.15], [2.7, 1.55, 1.0, 1.0], [-1.9, 1.4, 0.9, 0.5], [1.4, 0.2, 0.6, 0.4]]) box(x, z, w, d);
  // extra free traces between parts, and mounting holes
  for (let k = 0; k < 40; k++) { const x0 = (r() - 0.5) * BW * 0.9, z0 = (r() - 0.5) * BD * 0.9, dir = r() > 0.5 ? 1 : -1, L = 0.3 + r();
    route([[x0, z0], [x0 + L, z0], [x0 + L + 0.2, z0 + dir * 0.2], [x0 + L + 0.2 + r() * 0.6, z0 + dir * 0.2]], 0.014); }
  for (const [x, z] of [[-3.2, -2.2], [3.2, -2.2], [-3.2, 2.2], [3.2, 2.2]]) { const g = new THREE.TorusGeometry(0.12, 0.05, 8, 28); g.rotateX(Math.PI / 2); g.translate(x, T, z); pads.push(g); }

  const copper = new THREE.MeshPhysicalMaterial({ color: '#cfe0f2', metalness: 0.45, roughness: 0.3, clearcoat: 0.6, emissive: '#3a6aa0', emissiveIntensity: 0.25 });
  const padM = new THREE.MeshPhysicalMaterial({ color: '#d4a85a', metalness: 0.8, roughness: 0.3 });
  const silkM = new THREE.MeshStandardMaterial({ color: '#e9eef3', roughness: 0.6 });
  for (const [list, m] of [[traces, copper], [pads, padM], [silk, silkM], [pinGeos, pin]]) { const mesh = add(S.scene, mergeGeometries(list), m); mesh.castShadow = false; }
  const label = (t, x, z, size = 0.09) => { const lt = canvasTex(256, 96, (c) => { c.fillStyle = '#e9eef3'; c.font = '700 64px Inter'; c.textAlign = 'center'; c.fillText(t, 128, 72); });
    add(S.scene, new THREE.PlaneGeometry(size * 2.6, size), new THREE.MeshBasicMaterial({ map: lt, transparent: true, color: '#cfd8e2' }), [x, 0.006, z], [-Math.PI / 2, 0, 0], false); };
  label('U1', 0, 0.75); label('U2', -2.5, -0.85); label('U3', 2.45, -0.98); label('KINETIQ  REV B', -1.9, 2.15, 0.12);
  S.finish();
}
