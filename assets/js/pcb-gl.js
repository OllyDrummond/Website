/* Homepage hero: the circuit board as a live WebGL surface.
 *
 * - The photo itself stays still; nothing moves with scrolling.
 * - Light pulses leave the main chip and run out along the copper traces.
 *   assets/img/renders/pcb-hd-data.png holds, per pixel: R = trace mask,
 *   G = distance along the traces from the chip, B = a per-trace timing seed
 *   (made by tools/renders/pcb_flow.py from the photo).
 *
 * The <img> stays as the fallback and first paint. WebGL fades in over it once
 * the textures are ready. Nothing runs for visitors who ask for reduced motion,
 * while the hero is off screen or the tab is hidden, or after the pause button.
 */
(() => {
  const stage = document.querySelector(".pcb-stage");
  const canvas = stage && stage.querySelector(".pcb-gl");
  if (!canvas) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return;

  const IMG_ASPECT = 1.5;           // photo is 3:2
  const FOCUS = [0.66, 0.5];        // keep the main chip in view when cropping
  const big = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) > 1700;
  const SRC = { img: big ? canvas.dataset.src : canvas.dataset.srcSmall, data: canvas.dataset.data };

  // The image itself stays still: a flat full-screen quad at a fixed framing
  // (slightly zoomed in, as before). Only the board's light effects move.
  const VS = `#version 300 es
  in vec2 aPos;
  out vec2 vPos;
  void main() { vPos = aPos / 1.12; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS = `#version 300 es
  precision highp float;
  in vec2 vPos;
  uniform sampler2D uImg, uData;
  uniform vec2 uUvScale, uUvOff;
  uniform float uTime, uIntro;
  out vec4 o;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 uv = (vPos * 0.5 + 0.5) * uUvScale + uUvOff;
    uv.y = 1.0 - uv.y;
    // intro: the lens pulls focus from soft to sharp
    float blur = (1.0 - uIntro) * 5.0;
    vec3 col = texture(uImg, uv, blur).rgb;
    vec4 dat = texture(uData, uv);
    float mask = dat.r, dist = dat.g, seed = dat.b;
    float halo = textureLod(uData, uv, 3.0).r;
    vec3 blue = vec3(0.42, 0.74, 1.0);

    // pulses running out from the chip along the traces
    float ph = dist * 4.5 - uTime * 0.16 + seed * 11.0;
    float cyc = floor(ph);
    float on = step(0.35, hash(cyc * 3.1 + seed * 91.0));
    float p = fract(ph);
    float head = pow(p, 16.0) * on;
    float tail = pow(p, 4.0) * on;
    vec3 hot = mix(blue, vec3(0.8, 0.92, 1.0), head * 0.6);
    col += hot * (mask * (head * 3.6 + tail * 0.55) + halo * (head * 1.6 + tail * 0.2)) * smoothstep(0.0, 0.6, uIntro);

    // intro: the board brightens from the chip outwards while a light sweeps the horizon
    float rd = length((uv - vec2(0.72, 0.56)) * vec2(1.5, 1.0));
    float reveal = smoothstep(rd - 0.35, rd + 0.05, uIntro * 1.6 - 0.15) * (0.25 + 0.75 * uIntro);
    float sweep = exp(-pow((uv.x - (uIntro * 1.5 - 0.25)) * 4.0, 2.0)) * exp(-pow((uv.y - 0.34) * 10.0, 2.0)) * sin(uIntro * 3.14159);
    col = col * reveal + vec3(0.5, 0.78, 1.0) * sweep * 0.7;

    // gentle vignette, fine grain
    vec2 v = vPos * vec2(0.85, 1.0); col *= 1.0 - 0.18 * dot(v, v) * 0.5;
    col += (hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + fract(uTime)) - 0.5) * 0.018;
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
  const U = {}; for (const n of ["uTime", "uIntro", "uImg", "uData", "uUvScale", "uUvOff"]) U[n] = gl.getUniformLocation(prog, n);

  // full-screen grid the photo is drawn on
  const NX = 96, NY = 64, verts = [], idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) verts.push((i / NX) * 2 - 1, (j / NY) * 2 - 1);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  const texture = (unit, img, mip) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  };
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });

  const hero = stage.closest(".hero") || stage;

  let W = 0, H = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.75);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    // "cover" crop of the 3:2 photo, centred on the chip
    const a = W / H; let sx = 1, sy = 1;
    if (a > IMG_ASPECT) sy = IMG_ASPECT / a; else sx = a / IMG_ASPECT;
    gl.uniform2f(U.uUvScale, sx, sy);
    gl.uniform2f(U.uUvOff, (1 - sx) * FOCUS[0], (1 - sy) * FOCUS[1]);
  };
  new ResizeObserver(resize).observe(canvas);

  let time = 0, last = 0, intro = 0, running = false, ready = false, userPaused = false, onScreen = true, raf = 0;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now; time += dt;
    intro = Math.min(1, intro + dt / 2.4);
    const ease = 1 - Math.pow(1 - intro, 3);
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uIntro, ease);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    if (!stage.classList.contains("gl-on")) stage.classList.add("gl-on");
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
    texture(0, img, true); texture(1, data, true);
    gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uData, 1);
    gl.clearColor(0.02, 0.04, 0.08, 1);
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
