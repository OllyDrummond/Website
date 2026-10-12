/* Homepage hero: light pulses running along the circuit board's traces.
 *
 * The board is a 3D render (tools/renders/scenes/pcbhero.js). The render also
 * exports where its traces land in the 2400 x 1100 image, which is what
 * window.PCB_TRACES holds (assets/js/pcb-traces.js), so the pulses follow the
 * copper exactly. The overlay SVG uses the same viewBox and "cover" cropping as
 * the image, so they stay lined up at any screen size.
 *
 * Motion stops for visitors who ask for reduced motion, while the hero is off
 * screen or the tab is hidden, and when the pause button is pressed.
 */
(() => {
  const stage = document.querySelector(".pcb-stage");
  const svg = stage && stage.querySelector(".pcb-pulses");
  const traces = window.PCB_TRACES;
  if (!svg || !traces) return;

  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anims = [];

  // Deterministic spread of timings so the pulses never fire together
  let seed = 5;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  traces.forEach((t) => {
    const head = Math.min(340, Math.max(140, t.len * 0.3));
    const g = document.createElementNS(NS, "g");
    for (const cls of ["pulse-glow", "pulse-core"]) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", t.d);
      p.setAttribute("class", cls);
      p.setAttribute("pathLength", t.len);
      p.style.strokeDasharray = `${head} ${t.len + head}`;
      p.style.strokeDashoffset = head;
      g.appendChild(p);
    }
    svg.appendChild(g);
    if (reduce) return;
    const run = 700 + t.len * 1.4;            // ms to travel the trace
    const gap = 500 + rand() * 2500;          // dark time before it repeats
    const total = run + gap;
    const delay = rand() * 3000;             // glow and core share it so they move as one
    for (const p of g.children) {
      const a = p.animate(
        [
          { strokeDashoffset: head, opacity: 0, offset: 0 },
          { strokeDashoffset: head - t.len * 0.1, opacity: 1, offset: (run * 0.1) / total },
          { strokeDashoffset: -t.len, opacity: 1, offset: run / total },
          { strokeDashoffset: -t.len, opacity: 0, offset: Math.min(1, (run + 1) / total) },
          { strokeDashoffset: -t.len, opacity: 0, offset: 1 },
        ],
        { duration: total, delay, iterations: Infinity, easing: "linear" }
      );
      anims.push(a);
    }
  });

  if (reduce) return;

  const btn = document.querySelector(".motion-toggle");
  let userPaused = false, onScreen = true;
  const sync = () => {
    const play = !userPaused && onScreen && !document.hidden;
    anims.forEach((a) => (play ? a.play() : a.pause()));
    stage.classList.toggle("is-paused", !play);
    stage.closest(".hero")?.classList.toggle("motion-paused", !play);
  };
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
})();
