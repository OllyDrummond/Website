import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };

// Progressive "studio" renderer: averages many frames with jittered key light
// (soft shadows), jittered camera on an aperture disk (depth of field) and
// sub-pixel offsets (anti-aliasing).
export function studio(o) {
  const W = o.w, H = o.h;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.bg);
  scene.fog = new THREE.Fog(o.bg, o.fogNear ?? 14, o.fogFar ?? 34);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = o.envIntensity ?? 0.55;

  const camera = new THREE.PerspectiveCamera(o.fov ?? 28, W / H, 0.05, 200);
  camera.filmOffset = o.shift ?? 0;
  const camPos = new THREE.Vector3(...o.cam);
  const target = new THREE.Vector3(...o.target);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: o.floor ?? o.bg, roughness: 0.9, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  if (o.floorY !== null) { floor.position.y = o.floorY ?? 0; scene.add(floor); }

  const keyPos = new THREE.Vector3(...(o.key ?? [5, 9, 4]));
  const key = new THREE.DirectionalLight(o.keyColor ?? '#fff5ea', o.keyIntensity ?? 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const sc = o.shadowSize ?? 6;
  Object.assign(key.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 0.5, far: 60 });
  key.target.position.copy(target);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(o.rimColor ?? '#a9cdf5', o.rimIntensity ?? 1.4);
  rim.position.set(...(o.rim ?? [-6, 4, -5]));
  scene.add(rim);
  const fill = new THREE.HemisphereLight('#ffffff', o.bg, o.fillIntensity ?? 0.35);
  scene.add(fill);

  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  out.id = 'out';
  document.body.style.margin = '0';
  document.body.appendChild(out);
  const ctx = out.getContext('2d');

  function finish(samples = o.samples ?? 40) {
    const aperture = o.aperture ?? 0;
    const softness = o.softness ?? 0.6;
    const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    for (let i = 0; i < samples; i++) {
      // golden-angle spiral samples
      const a = i * 2.39996, r = Math.sqrt((i + 0.5) / samples);
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
      key.position.copy(keyPos).add(new THREE.Vector3(dx * softness, 0, dy * softness));
      camera.position.copy(camPos).addScaledVector(right, dx * aperture).addScaledVector(up, dy * aperture);
      camera.lookAt(target);
      camera.setViewOffset(W, H, (Math.random() - 0.5), (Math.random() - 0.5), W, H);
      renderer.render(scene, camera);
      ctx.globalAlpha = 1 / (i + 1);
      ctx.drawImage(renderer.domElement, 0, 0);
    }
    renderer.domElement.remove();
    window.done = true;
  }

  return { scene, camera, renderer, key, rim, fill, floor, finish };
}

// ---------- materials ----------
export const mat = {
  plastic: (c, rough = 0.45) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
  gloss: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
  metal: (c = '#c3c9cc', rough = 0.3) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: rough }),
  rubber: (c = '#16191c') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }),
  glow: (c, k = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k }),
  clear: (tint = '#e8f2fa') => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.08, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.55 }),
};

// Soft blob shadow to ground objects on bright backdrops
export function contactShadow(parent, w, d, opacity = 0.45, pos = [0, 0.003, 0]) {
  const t = canvasTex(256, 256, (c, W, H) => {
    const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    g.addColorStop(0, `rgba(0,0,0,${opacity})`);
    g.addColorStop(0.55, `rgba(0,0,0,${opacity * 0.45})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  t.colorSpace = THREE.NoColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(...pos);
  parent.add(m);
  return m;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function add(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function tube(parent, points, radius, material, segs = 120) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, segs, radius, 20, false), material);
}

// Spur gear outline, extruded
export function gearGeo(teeth, rOuter, rRoot, depth, bore = 0.2) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rRoot, a], [rOuter, a + step * 0.18], [rOuter, a + step * 0.42], [rRoot, a + step * 0.6],
    ];
    pts.forEach(([r, t], j) => {
      const x = Math.cos(t) * r, y = Math.sin(t) * r;
      if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
    const aEnd = a + step;
    s.absarc(0, 0, rRoot, a + step * 0.6, aEnd, false);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  s.holes.push(hole);
  // lightening holes
  if (rRoot > 0.8) {
    for (let k = 0; k < 5; k++) {
      const t = (k / 5) * Math.PI * 2;
      const h = new THREE.Path();
      const rr = (rRoot + bore) / 2;
      h.absarc(Math.cos(t) * rr, Math.sin(t) * rr, (rRoot - bore) * 0.22, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// Corrugated tank wall (horizontal corrugations)
export function corrugatedCylinder(radius, height, pitch = 0.076, amp = 0.018) {
  const g = new THREE.CylinderGeometry(radius, radius, height, 160, Math.round(height / pitch * 8), true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (Math.sin((y / pitch) * Math.PI * 2) * amp) / radius;
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// The Kinetiq sensor unit, reused across scenes
export function sensorUnit(RoundedBoxGeometry, opts = {}) {
  const g = new THREE.Group();
  const body = mat.plastic(opts.body ?? '#eef0f1', 0.38);
  const cap = mat.gloss(opts.cap ?? '#2a2f34');
  add(g, new RoundedBoxGeometry(1.7, 0.9, 1.25, 8, 0.16), body, [0, 0.55, 0]);
  add(g, new RoundedBoxGeometry(1.76, 0.16, 1.31, 8, 0.07), cap, [0, 1.06, 0]);
  // flange
  add(g, new THREE.CylinderGeometry(0.62, 0.66, 0.12, 64), mat.plastic('#d9dde0'), [0, 0.06, 0]);
  // logo panel
  const label = canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = '#eef0f1'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a1f2b';
    c.font = '800 120px Inter';
    c.fillText('KINETIQ', 40, 165);
    c.fillStyle = '#5b646b';
    c.font = '500 46px Inter';
    c.fillText('LEVEL  ·  LoRa', 600, 160);
  });
  add(g, new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshStandardMaterial({ map: label, roughness: 0.45 }), [-0.02, 0.62, 0.627], [0, 0, 0], false);
  // status LED
  add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 24), mat.glow('#4fb3ff', 3), [0.66, 0.86, 0.63], [Math.PI / 2, 0, 0], false);
  // antenna
  add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.1, 32), mat.metal('#b8bfc3', 0.25), [0.55, 1.18, -0.3]);
  add(g, new THREE.CylinderGeometry(0.045, 0.07, 1.5, 32), mat.rubber('#15181b'), [0.55, 1.98, -0.3]);
  add(g, new THREE.SphereGeometry(0.045, 24, 12), mat.rubber('#15181b'), [0.55, 2.73, -0.3]);
  // gland + cable
  add(g, new THREE.CylinderGeometry(0.11, 0.13, 0.2, 6), mat.plastic('#2a2f34'), [-0.95, 0.4, 0.15], [0, 0, Math.PI / 2]);
  // screws
  for (const [x, z] of [[-0.75, -0.52], [0.75, -0.52], [-0.75, 0.52], [0.75, 0.52]]) {
    add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), mat.metal('#9aa2a7'), [x, 1.145, z], [0, 0, 0], false);
  }
  return g;
}
