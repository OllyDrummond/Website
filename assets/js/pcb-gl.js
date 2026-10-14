/* Homepage hero: the circuit board photo as a live WebGL scene driven by scroll.
 *
 * The board in the photo is flat, so the shader treats it as a plane seen by
 * the photo's camera and re-projects it for a virtual camera. Moving that
 * camera (dolly, crane, pan, roll, zoom) gives real perspective change from a
 * single image. Scrolling the page moves the camera; on desktop the hero is
 * pinned for a short stretch so the move plays out before the page carries on.
 *
 * Light pulses leave the main chip and run out along the copper traces.
 * assets/img/renders/pcb-hd-data.png holds, per pixel: R = trace mask,
 * G = distance along the traces from the chip, B = a per-trace timing seed
 * (made by tools/renders/pcb_flow.py from the photo).
 *
 * Camera moves (data-variant on the canvas, or ?hero=1..5 to preview):
 *   1 Fly over   - skims forward over the board towards the glowing horizon
 *   2 Dive       - pushes in on the main chip and tips down over it
 *   3 Orbit      - slides sideways while turning to keep the chip centred
 *   4 Rack focus - slow push with a slight roll; everything but the chip softens
 *   5 Horizon    - tilts up and zooms into the light on the horizon
 *
 * The <img> stays as the fallback and first paint. Nothing runs for visitors
 * who ask for reduced motion, while the hero is off screen or the tab is
 * hidden, or after the pause button.
 */
(() => {
  const stage = document.querySelector(".pcb-stage");
  const canvas = stage && stage.querySelector(".pcb-gl");
  if (!canvas) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return;

  const qv = +(new URLSearchParams(location.search).get("hero") || 0);
  const VARIANT = qv >= 1 && qv <= 5 ? qv : +(canvas.dataset.variant || 1);
  const big = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) > 1700;
  const SRC = { img: big ? canvas.dataset.src : canvas.dataset.srcSmall, data: canvas.dataset.data };

  // The photo's camera: 1 unit above the board, pitched down so the horizon
  // sits a third of the way down the 3:2 frame.
  const IMG_ASPECT = 1.5, F0 = 1 / Math.tan((46 / 2) * Math.PI / 180);
  const HORIZON_NDC = 0.33, PITCH0 = Math.atan(HORIZON_NDC / F0);
  const CHIP_UV = [0.72, 0.56];               // the main chip in the photo

  const VS = `#version 300 es
  in vec2 aPos; out vec2 vPos;
  void main() { vPos = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS = `#version 300 es
  precision highp float;
  in vec2 vPos;
  uniform sampler2D uImg, uData;
  uniform float uAspect, uF, uF0, uPitch0, uImgAspect, uTime, uIntro, uBlur, uGlow, uBoost;
  uniform vec2 uShift, uFocus;
  uniform vec3 uCamPos;
  uniform mat3 uCamRot;                          // virtual camera to world
  out vec4 o;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  // world point (or direction, w = 0) to photo uv
  vec2 toPhoto(vec4 P) {
    vec3 d = P.w > 0.5 ? P.xyz - vec3(0.0, 1.0, 0.0) : P.xyz;
    float c = cos(uPitch0), s = sin(uPitch0);
    // into the photo camera's frame (undo its downward pitch)
    vec3 q = vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
    vec2 ndc = vec2(uF0 * q.x / (-q.z) / uImgAspect, uF0 * q.y / (-q.z));
    return vec2(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
  }
  void main() {
    // ray from the virtual camera through this pixel
    vec3 rd = normalize(uCamRot * vec3((vPos.x * uAspect) / uF + uShift.x, vPos.y / uF + uShift.y, -1.0));
    vec4 P;
    if (rd.y < -1e-4) { float t = -uCamPos.y / rd.y; P = vec4(uCamPos + rd * t, 1.0); }
    else P = vec4(rd, 0.0);
    vec2 uv = toPhoto(P);
    // the photo's top and left edges are near black; fade anything outside it to the backdrop
    vec2 e = smoothstep(vec2(-0.02), vec2(0.015), uv) * smoothstep(vec2(-0.02), vec2(0.015), 1.0 - uv);
    float inside = e.x * e.y;

    // focus: intro pull plus each move's own depth of field
    vec2 sp = vPos * vec2(uAspect, 1.0);
    float dof = uBlur * smoothstep(0.15, 0.9, length(sp - uFocus * vec2(uAspect, 1.0)));
    float blur = (1.0 - uIntro) * 5.0 + dof;
    vec3 col = texture(uImg, uv, blur).rgb;
    vec4 dat = texture(uData, uv);
    float mask = dat.r, dist = dat.g, seed = dat.b;
    float halo = textureLod(uData, uv, 3.0).r;
    vec3 blue = vec3(0.42, 0.74, 1.0);

    // slow pulses running out from the chip along the traces
    float ph = dist * 4.5 - uTime * 0.16 * (1.0 + uBoost) + seed * 11.0;
    float on = step(0.35, hash(floor(ph) * 3.1 + seed * 91.0));
    float p = fract(ph);
    float head = pow(p, 16.0) * on, tail = pow(p, 4.0) * on;
    vec3 hot = mix(blue, vec3(0.8, 0.92, 1.0), head * 0.6);
    col += hot * (mask * (head * 3.4 + tail * 0.5) + halo * (head * 1.5 + tail * 0.18)) * (1.0 + uBoost * 0.6) * smoothstep(0.0, 0.6, uIntro);

    // glowing horizon band, stronger in moves that head towards it
    float hz = exp(-pow((uv.y - 0.34) * 7.0, 2.0)) * smoothstep(0.2, 0.9, uv.x);
    col += vec3(0.25, 0.5, 0.95) * hz * uGlow;

    // intro: brightens out from the chip while a light sweeps the horizon
    float rd2 = length((uv - vec2(0.72, 0.56)) * vec2(1.5, 1.0));
    float reveal = smoothstep(rd2 - 0.35, rd2 + 0.05, uIntro * 1.6 - 0.15) * (0.25 + 0.75 * uIntro);
    float sweep = exp(-pow((uv.x - (uIntro * 1.5 - 0.25)) * 4.0, 2.0)) * exp(-pow((uv.y - 0.34) * 10.0, 2.0)) * sin(uIntro * 3.14159);
    col = col * reveal + vec3(0.5, 0.78, 1.0) * sweep * 0.7;

    col = mix(vec3(0.012, 0.027, 0.055), col, inside);
    vec2 v = vPos * vec2(0.85, 1.0); col *= 1.0 - 0.09 * dot(v, v);
    col += (hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + fract(uTime)) - 0.5) * 0.016;
    o = vec4(col, 1.0);
  }`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn("pcb-gl:", e); return; }
  gl.useProgram(prog);
  const U = {};
  for (const n of ["uImg", "uData", "uAspect", "uF", "uF0", "uPitch0", "uImgAspect", "uTime", "uIntro", "uBlur", "uGlow", "uBoost", "uShift", "uFocus", "uCamPos", "uCamRot"]) U[n] = gl.getUniformLocation(prog, n);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const texture = (unit, img) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });

  // ---- camera ----
  const deg = Math.PI / 180;
  // rotation: yaw (y), then pitch (x, negative looks down), then roll (z); column-major mat3
  const rot = (yaw, pitch, roll) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const Ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy], Rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp], Rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1];
    const mul = (A, B) => { const C = new Array(9); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) C[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2]; return C; };
    return mul(mul(Ry, Rx), Rz);
  };
  // where the chip sits on the board (from its spot in the photo)
  const chip = (() => {
    const nx = (CHIP_UV[0] * 2 - 1) * IMG_ASPECT / F0, ny = (1 - CHIP_UV[1] * 2) / F0;
    const c = Math.cos(-PITCH0), s = Math.sin(-PITCH0);
    const d = [nx, ny * c - -1 * s, ny * s + -1 * c];           // camera ray pitched down into the world
    const t = -1 / d[1]; return [d[0] * t, 0, d[2] * t];
  })();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  // aim a camera at a world point: yaw and pitch
  const aim = (from, to) => { const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    return [Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))]; };

  // Each move maps scroll progress p (0..1) to a camera; t is time for a faint idle drift
  const MOVES = {
    1: (p, t) => ({ pos: [0.04 * Math.sin(t * 0.21), 1 - 0.32 * p, -2.6 * p], yaw: 0.6 * deg * Math.sin(t * 0.17), pitch: -PITCH0 + 1.6 * deg * p, roll: 0, zoom: 1 + 0.05 * p, glow: 0.35 * p, blur: 0 }),
    2: (p, t) => { const k = ease(p);
      return { pos: [chip[0] * 0.4 * k, 1 - 0.38 * k, chip[2] * 0.55 * k], yaw: 0.4 * deg * Math.sin(t * 0.17), pitch: -PITCH0 - 3.5 * deg * k, roll: 0, zoom: 1 + 0.3 * k, glow: 0, blur: 1.1 * k }; },
    3: (p, t) => { const k = ease(p), pos = [lerp(-0.35, 0.55, k), 1 - 0.08 * k, lerp(-0.15, -0.9, k)];
      const target = [chip[0], 0, chip[2]], [ya] = aim(pos, target), [y0] = aim([-0.35, 1, -0.15], target);
      return { pos, yaw: ya - y0 + 0.4 * deg * Math.sin(t * 0.15), pitch: -PITCH0 - 0.6 * deg * k, roll: 0, zoom: 1.1, glow: 0.1, blur: 0 }; },
    4: (p, t) => { const pos = [chip[0] * 0.25 * p, 1 - 0.15 * p, chip[2] * 0.3 * p];
      return { pos, yaw: 0.5 * deg * Math.sin(t * 0.13), pitch: -PITCH0 - 0.8 * deg * p, roll: -4 * deg * ease(p), zoom: 1.04 + 0.18 * p, glow: 0.05, blur: 0.4 + 3.2 * ease(p) }; },
    5: (p, t) => ({ pos: [0.03 * Math.sin(t * 0.19), 1 - 0.2 * p, -1.4 * p], yaw: 0.5 * deg * Math.sin(t * 0.14) - 2 * deg * p, pitch: -PITCH0 + 4.2 * deg * ease(p), roll: 0, zoom: 1.05 + 0.45 * ease(p), glow: 0.2 + 1.1 * ease(p), blur: 0 }),
  };
  const move = MOVES[VARIANT];

  // ---- scroll ----
  const hero = stage.closest(".hero") || stage;
  const pin = hero.closest(".hero-pin");
  const S = { p: 0, v: 0 };
  // 0 when the hero first fills the screen, 1 when the pinned stretch is used up
  // (or, without pinning, when the hero has scrolled away)
  const progress = () => {
    const box = pin && getComputedStyle(hero).position === "sticky" ? pin : hero;
    const r = box.getBoundingClientRect();
    const range = box === pin ? r.height - innerHeight : r.height;
    return Math.min(1, Math.max(0, -r.top / Math.max(1, range)));
  };

  let W = 0, H = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.75);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.uniform1f(U.uAspect, W / H);
    // if the hero is taller than the window, pin it with its bottom edge in view
    if (pin) pin.style.setProperty("--pin-top", Math.min(0, innerHeight - hero.offsetHeight) + "px");
  };
  new ResizeObserver(resize).observe(canvas);

  let time = 0, last = 0, intro = 0, running = false, ready = false, userPaused = false, onScreen = true, raf = 0;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now; time += dt;
    intro = Math.min(1, intro + dt / 2.4);
    const target = progress(), prev = S.p;
    S.p += (target - S.p) * (1 - Math.exp(-dt * 6));          // smooth, slightly lagging the scroll
    S.v += (Math.abs(S.p - prev) / Math.max(dt, 1e-3) - S.v) * (1 - Math.exp(-dt * 5));

    const c = move(S.p, time), A = W / H;
    // "cover" framing of the 3:2 photo at rest, centred towards the chip
    const fCover = A > IMG_ASPECT ? F0 * A / IMG_ASPECT : F0;
    const halfVis = Math.min(1, A / IMG_ASPECT), cx = Math.max(-(1 - halfVis), Math.min(1 - halfVis, 0.36));
    const shiftX = cx * IMG_ASPECT / F0 * (c.shift ?? 1), F = fCover * 1.04 * c.zoom, R = rot(c.yaw, c.pitch, c.roll);
    gl.uniform2f(U.uShift, shiftX, 0);
    gl.uniform1f(U.uF, F);
    gl.uniform1f(U.uF0, F0); gl.uniform1f(U.uPitch0, PITCH0); gl.uniform1f(U.uImgAspect, IMG_ASPECT);
    gl.uniform3f(U.uCamPos, ...c.pos);
    gl.uniformMatrix3fv(U.uCamRot, false, R);
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uIntro, 1 - Math.pow(1 - intro, 3));
    gl.uniform1f(U.uGlow, c.glow); gl.uniform1f(U.uBlur, c.blur);
    gl.uniform1f(U.uBoost, Math.min(1.5, S.v * 1.5));
    // keep the sharp spot on the chip wherever the camera has put it
    const d = [chip[0] - c.pos[0], chip[1] - c.pos[1], chip[2] - c.pos[2]];
    const q = [0, 1, 2].map((i) => R[i * 3] * d[0] + R[i * 3 + 1] * d[1] + R[i * 3 + 2] * d[2]);
    gl.uniform2f(U.uFocus, (q[0] / -q[2] - shiftX) * F / A, (q[1] / -q[2]) * F);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!stage.classList.contains("gl-on")) { stage.classList.add("gl-on"); if (pin) pin.classList.add("is-pinned"); }
    if (running) raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const play = ready && !userPaused && onScreen && !document.hidden;
    if (play && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    if (!play) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    stage.classList.toggle("is-paused", !play);
    hero.classList.toggle("motion-paused", !play);
  };

  Promise.all([load(SRC.img), load(SRC.data)]).then(([img, data]) => {
    texture(0, img); texture(1, data);
    gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uData, 1);
    resize(); ready = true; sync();
  }).catch((e) => console.warn("pcb-gl: textures", e));

  const btn = document.querySelector(".motion-toggle");
  if (btn) {
    btn.hidden = false;
    btn.addEventListener("click", () => {
      userPaused = !userPaused;
      btn.setAttribute("aria-pressed", String(userPaused));
      btn.querySelector("span").textContent = userPaused ? "Play animation" : "Pause animation";
      sync();
    });
  }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(stage);
  document.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); ready = false; sync(); stage.classList.remove("gl-on"); });
})();
