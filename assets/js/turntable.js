/* Rotating 3D views: plays a sequence of pre-rendered frames.
 * Markup: <div class="turntable" data-turntable="path/to/frames" data-frames="36" data-mode="loop|pingpong">
 *           <img src="path/to/frames/00.webp" alt="..."></div>
 * Drag (or use the arrow keys) to turn it by hand.
 */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-turntable]").forEach((el) => {
    const base = el.dataset.turntable;
    const n = +el.dataset.frames;
    const pingpong = el.dataset.mode === "pingpong";
    const fps = +(el.dataset.fps || 9);
    const img = el.querySelector("img");
    const srcs = Array.from({ length: n }, (_, i) => `${base}/${String(i).padStart(2, "0")}.webp`);
    const cache = srcs.map((s) => { const im = new Image(); im.decoding = "async"; im.src = s; return im; });
    let pos = 0, dir = 1, playing = !reduce, timer = null, visible = true;

    const show = (i) => { pos = (i + n) % n; img.src = srcs[pos]; };
    const step = () => {
      if (pingpong) {
        if (pos + dir >= n || pos + dir < 0) dir = -dir;
        show(pos + dir);
      } else show(pos + 1);
    };
    const start = () => { if (!timer && playing && visible) timer = setInterval(step, 1000 / fps); };
    const stop = () => { clearInterval(timer); timer = null; };

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(el);

    // drag to rotate
    let dragX = null, dragPos = 0;
    el.addEventListener("pointerdown", (e) => { dragX = e.clientX; dragPos = pos; stop(); el.setPointerCapture(e.pointerId); el.classList.add("dragging"); });
    el.addEventListener("pointermove", (e) => {
      if (dragX === null) return;
      const delta = Math.round((e.clientX - dragX) / (el.clientWidth / (pingpong ? n : n * 0.8)));
      const next = pingpong ? Math.max(0, Math.min(n - 1, dragPos + delta)) : dragPos + delta;
      show(next);
    });
    const end = () => { if (dragX === null) return; dragX = null; el.classList.remove("dragging"); start(); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    // keyboard
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault(); stop(); playing = false;
        const d = e.key === "ArrowRight" ? 1 : -1;
        show(pingpong ? Math.max(0, Math.min(n - 1, pos + d)) : pos + d);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault(); playing = !playing; playing ? start() : stop();
      }
    });
    if (cache[0].complete) start(); else cache[0].onload = start;
  });
})();
