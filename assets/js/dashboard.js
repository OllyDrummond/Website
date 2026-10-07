/* Water tank monitor demo dashboard.
 *
 * Everything below runs on generated sample data. To show real readings,
 * replace loadTankData() with a fetch from the receiver, returning the same
 * shape: [{ id, name, capacity, alertPct, days: [{ date, used, rain, litres }] }].
 */

const NS = "http://www.w3.org/2000/svg";
const ALERT_PCT = 20;

function loadTankData() {
  // Seeded random so the demo looks the same on every visit.
  let seed = 7;
  const rand = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const tanks = [
    { id: "house", name: "Tank 1: House", capacity: 22000, base: 620, start: 0.72, catchment: 1 },
    { id: "stock", name: "Tank 2: Stock water", capacity: 30000, base: 1150, start: 0.6, catchment: 0.7 },
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tanks.map((t) => {
    let litres = t.capacity * t.start;
    const days = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const weekend = date.getDay() === 0 || date.getDay() === 6 ? 1.18 : 1;
      const used = Math.round(t.base * weekend * (0.75 + rand() * 0.5));
      let rain = 0;
      if (rand() < 0.16) rain = Math.round((1500 + rand() * 7500) * t.catchment);
      litres = litres - used + rain;
      // Water cart refill when it gets very low
      if (litres < t.capacity * 0.12) { rain += Math.round(t.capacity * 0.75); litres += t.capacity * 0.75; }
      litres = Math.max(0, Math.min(t.capacity, litres));
      days.push({ date, used, rain, litres: Math.round(litres) });
    }
    return { id: t.id, name: t.name, capacity: t.capacity, alertPct: ALERT_PCT, days };
  });
}

// ---------- helpers ----------
const fmt = (n) => Math.round(n).toLocaleString();
const fmtDate = (d, opts = { day: "numeric", month: "short" }) => d.toLocaleDateString(undefined, opts);

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// Bar with rounded top corners, square at the baseline
function barPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
}

function placeTip(tip, wrap, x, y, html) {
  tip.innerHTML = html;
  const half = tip.offsetWidth / 2;
  const clamped = Math.max(half, Math.min(wrap.clientWidth - half, x));
  tip.style.left = clamped + "px";
  tip.style.top = y + "px";
  tip.classList.add("show");
}

const M = { top: 16, right: 12, bottom: 30, left: 52 };

// ---------- Daily use bar chart ----------
function drawUse(svg, tip, days) {
  svg.innerHTML = "";
  const W = svg.clientWidth, H = svg.clientHeight;
  const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  const max = niceMax(Math.max(...days.map((d) => d.used)) * 1.08);
  const y = (v) => M.top + ih - (v / max) * ih;
  const step = iw / days.length;
  const gap = Math.min(2, step * 0.2);
  const bw = Math.max(1, step - gap);

  const grid = el("g", { class: "grid" }, svg);
  const axis = el("g", { class: "axis" }, svg);
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i, yy = y(v);
    el("line", { x1: M.left, x2: W - M.right, y1: yy, y2: yy }, grid);
    el("text", { x: M.left - 8, y: yy + 4, "text-anchor": "end" }, axis).textContent = fmt(v);
  }
  const every = Math.ceil(days.length / Math.max(2, Math.floor(iw / 70)));
  days.forEach((d, i) => {
    if ((days.length - 1 - i) % every === 0) {
      el("text", { x: M.left + i * step + bw / 2, y: H - 8, "text-anchor": "middle" }, axis).textContent = fmtDate(d.date);
    }
  });

  const bars = days.map((d, i) =>
    el("path", { class: "bar", d: barPath(M.left + i * step, y(d.used), bw, M.top + ih - y(d.used), 4) }, svg)
  );

  const avg = days.reduce((s, d) => s + d.used, 0) / days.length;
  el("line", { class: "avg", x1: M.left, x2: W - M.right, y1: y(avg), y2: y(avg) }, svg);
  el("text", { class: "avg-label", x: W - M.right, y: y(avg) - 6, "text-anchor": "end" }, svg).textContent = `Avg ${fmt(avg)} L`;

  // Hit areas taller and wider than the bars
  const wrap = svg.parentElement;
  days.forEach((d, i) => {
    const hit = el("rect", { class: "hit", x: M.left + i * step, y: M.top, width: step, height: ih }, svg);
    const show = () => {
      bars.forEach((b, j) => b.classList.toggle("dim", j !== i));
      placeTip(tip, wrap, M.left + i * step + bw / 2, y(d.used),
        `${fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}<br><strong>${fmt(d.used)} L</strong> used`);
    };
    hit.addEventListener("mouseenter", show);
    hit.addEventListener("touchstart", show, { passive: true });
  });
  svg.onmouseleave = () => { bars.forEach((b) => b.classList.remove("dim")); tip.classList.remove("show"); };
}

// ---------- Level line chart ----------
function drawLevel(svg, tip, days, capacity, alertPct) {
  svg.innerHTML = "";
  const W = svg.clientWidth, H = svg.clientHeight;
  const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  const pct = days.map((d) => (d.litres / capacity) * 100);
  const x = (i) => M.left + (days.length === 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v) => M.top + ih - (v / 100) * ih;

  const grid = el("g", { class: "grid" }, svg);
  const axis = el("g", { class: "axis" }, svg);
  for (let v = 0; v <= 100; v += 25) {
    el("line", { x1: M.left, x2: W - M.right, y1: y(v), y2: y(v) }, grid);
    el("text", { x: M.left - 8, y: y(v) + 4, "text-anchor": "end" }, axis).textContent = v + "%";
  }
  const every = Math.ceil(days.length / Math.max(2, Math.floor(iw / 70)));
  days.forEach((d, i) => {
    if ((days.length - 1 - i) % every === 0) {
      el("text", { x: x(i), y: H - 8, "text-anchor": "middle" }, axis).textContent = fmtDate(d.date);
    }
  });

  el("line", { class: "low-line", x1: M.left, x2: W - M.right, y1: y(alertPct), y2: y(alertPct) }, svg);
  el("text", { class: "low-label", x: M.left + 6, y: y(alertPct) - 6 }, svg).textContent = `Low-water alert at ${alertPct}%`;

  const line = pct.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  el("path", { class: "area", d: `${line} L${x(days.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z` }, svg);
  el("path", { class: "line", d: line }, svg);

  // Mark the latest reading
  const last = days.length - 1;
  el("circle", { class: "dot", cx: x(last), cy: y(pct[last]), r: 5 }, svg);

  const cross = el("line", { class: "cross", y1: M.top, y2: M.top + ih, visibility: "hidden" }, svg);
  const dot = el("circle", { class: "dot", r: 5, visibility: "hidden" }, svg);
  const hit = el("rect", { class: "hit", x: M.left, y: M.top, width: iw, height: ih }, svg);
  const wrap = svg.parentElement;

  const move = (clientX) => {
    const r = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(last, Math.round(((clientX - r.left - M.left) / iw) * last)));
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
    dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(pct[i])); dot.setAttribute("visibility", "visible");
    const d = days[i];
    placeTip(tip, wrap, x(i), y(pct[i]),
      `${fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}<br><strong>${Math.round(pct[i])}%</strong> · ${fmt(d.litres)} L${d.rain ? `<br>+${fmt(d.rain)} L in` : ""}`);
  };
  hit.addEventListener("mousemove", (e) => move(e.clientX));
  hit.addEventListener("touchmove", (e) => move(e.touches[0].clientX), { passive: true });
  hit.addEventListener("touchstart", (e) => move(e.touches[0].clientX), { passive: true });
  svg.onmouseleave = () => {
    cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); tip.classList.remove("show");
  };
}

// ---------- Page wiring ----------
const ICONS = {
  ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2l2.3 2.3 4.7-4.8" stroke="#fff" stroke-width="2" fill="none"/></svg>',
  warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l7 13H1z" fill="currentColor"/><path d="M8 6v4M8 11.5v1" stroke="#fff" stroke-width="2"/></svg>',
  crit: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5 5l6 6M11 5l-6 6" stroke="#fff" stroke-width="2"/></svg>',
};

const tanks = loadTankData();
const state = { tank: tanks[0].id, range: 30 };

const select = document.getElementById("tank-select");
tanks.forEach((t) => select.add(new Option(t.name, t.id)));

function render() {
  const tank = tanks.find((t) => t.id === state.tank);
  const days = tank.days.slice(-state.range);
  const now = days[days.length - 1];
  const pctNow = (now.litres / tank.capacity) * 100;
  const avg = days.reduce((s, d) => s + d.used, 0) / days.length;
  const rain = days.reduce((s, d) => s + d.rain, 0);
  const prevAvgDays = tank.days.slice(-state.range * 2, -state.range);
  const prevAvg = prevAvgDays.length ? prevAvgDays.reduce((s, d) => s + d.used, 0) / prevAvgDays.length : avg;
  const change = ((avg - prevAvg) / prevAvg) * 100;

  // Gauge
  const g = document.getElementById("gauge-water");
  const gy = 10 + 130 - (130 * pctNow) / 100;
  g.setAttribute("y", gy);
  g.setAttribute("height", 140 - gy);
  document.getElementById("gauge-label").textContent = `${tank.name} is ${Math.round(pctNow)}% full`;

  const level = pctNow < tank.alertPct ? "crit" : pctNow < 40 ? "warn" : "ok";
  const text = { ok: "Level OK", warn: "Getting low", crit: "Below alert level" }[level];
  document.getElementById("status").innerHTML = `<span class="status ${level}">${ICONS[level]}${text}</span>`;

  // Tiles
  document.getElementById("kpi-level").innerHTML = `${Math.round(pctNow)}<small>%</small>`;
  document.getElementById("kpi-level-d").textContent = `${fmt(now.litres)} of ${fmt(tank.capacity)} L`;
  document.getElementById("kpi-avg").innerHTML = `${fmt(avg)}<small> L</small>`;
  document.getElementById("kpi-avg-d").textContent =
    `${Math.abs(change) < 1 ? "About the same as" : `${Math.abs(Math.round(change))}% ${change > 0 ? "more than" : "less than"}`} the previous ${state.range} days`;
  document.getElementById("kpi-days").innerHTML = `${Math.floor(now.litres / avg)}<small> days</small>`;
  document.getElementById("kpi-rain").innerHTML = `${fmt(rain)}<small> L</small>`;
  document.getElementById("kpi-rain-d").textContent = `In the last ${state.range} days`;

  drawUse(document.getElementById("use-chart"), document.getElementById("use-tip"), days);
  drawLevel(document.getElementById("level-chart"), document.getElementById("level-tip"), days, tank.capacity, tank.alertPct);

  document.getElementById("data-rows").innerHTML = days.slice().reverse().map((d) =>
    `<tr><td>${fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</td><td>${fmt(d.used)}</td><td>${d.rain ? fmt(d.rain) : "–"}</td><td>${Math.round((d.litres / tank.capacity) * 100)}%</td></tr>`
  ).join("");
}

select.addEventListener("change", () => { state.tank = select.value; render(); });
document.querySelectorAll(".seg button").forEach((b) =>
  b.addEventListener("click", () => {
    state.range = Number(b.dataset.range);
    document.querySelectorAll(".seg button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    render();
  })
);

let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); });
render();
