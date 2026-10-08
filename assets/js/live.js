/* Tank monitor live view (mock-up).
 *
 * Everything here is simulated in the browser: 1 real second = 1 simulated
 * minute. To connect real hardware, replace the simulation in simulateMinute() with
 * readings from your cloud API, and send pump commands from sendCommand().
 */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const CAP = 25000;          // litres
  const FILL_RATE = 80;       // L/min when the pump runs
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString();
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // ---------- settings ----------
  const S = {
    mode: "auto",
    autoStart: 30, autoStop: 90,
    schedStart: "23:00", schedEnd: "07:00",
    highCut: 98, maxRun: 360, noRise: 10, dryRun: true,
  };

  // ---------- state ----------
  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const clock = new Date(); clock.setSeconds(0, 0);
  let litres = CAP * 0.56;
  let pump = { on: false, fault: null, since: null, levelAtStart: 0, reason: "" };
  let dryBore = false;
  let usedToday = 0;
  const history = [];          // last 24 h: { t, pct, on }
  const log = [];
  let lastAnnounce = "";

  function usagePerMin(d) {
    const h = d.getHours() + d.getMinutes() / 60;
    let base = 3;
    if (h >= 5.5 && h < 9) base = 26;        // milking / morning
    else if (h >= 9 && h < 15) base = 12;
    else if (h >= 15 && h < 19) base = 22;   // afternoon milking, stock
    else if (h >= 19 && h < 22.5) base = 10;
    return base * 0.55 * (0.75 + rand() * 0.5);
  }

  const minutesOf = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  function inSchedule(d) {
    const now = d.getHours() * 60 + d.getMinutes();
    const a = minutesOf(S.schedStart), b = minutesOf(S.schedEnd);
    return a <= b ? now >= a && now < b : now >= a || now < b;
  }

  function addLog(text, kind = "info") {
    log.unshift({ t: hhmm(clock), text, kind });
    if (log.length > 9) log.pop();
    renderLog();
  }

  function startPump(reason) {
    if (pump.on || pump.fault) return;
    pump = { on: true, fault: null, since: new Date(clock), levelAtStart: litres, reason };
    addLog(`Pump started (${reason})`, "on");
    announce(`Pump started, ${reason}.`);
  }
  function stopPump(reason, fault = null) {
    if (!pump.on && !fault) return;
    const ran = pump.since ? Math.round((clock - pump.since) / 60000) : 0;
    pump = { on: false, fault, since: null, levelAtStart: 0, reason: "" };
    addLog(fault ? `Pump stopped: ${fault}` : `Pump stopped (${reason}) after ${ran} min`, fault ? "fault" : "off");
    announce(fault ? `Pump fault: ${fault}` : `Pump stopped, ${reason}.`);
  }

  // Control logic runs every simulated minute
  function control() {
    const pct = (litres / CAP) * 100;
    if (pump.on) {
      const runMin = (clock - pump.since) / 60000;
      if (pct >= S.highCut) return stopPump(`tank reached the ${S.highCut}% cut-off`);
      if (runMin >= S.maxRun) return stopPump("", `ran for the ${S.maxRun} min limit`);
      if (S.dryRun && runMin >= S.noRise && litres <= pump.levelAtStart + 5) return stopPump("", `no inflow after ${S.noRise} min. Possible dry bore or blocked intake`);
      if (S.mode === "auto" && pct >= S.autoStop) return stopPump(`auto: reached ${S.autoStop}%`);
      if (S.mode === "schedule" && (!inSchedule(clock) || pct >= S.autoStop)) return stopPump(inSchedule(clock) ? `schedule: reached ${S.autoStop}%` : "schedule window ended");
    } else if (!pump.fault) {
      if (S.mode === "auto" && pct < S.autoStart) startPump(`auto: level below ${S.autoStart}%`);
      if (S.mode === "schedule" && inSchedule(clock) && pct < S.autoStop - 5) startPump(`schedule ${S.schedStart}–${S.schedEnd}`);
    }
  }

  function simulateMinute(record = true) {
    const use = usagePerMin(clock);
    const inflow = pump.on && !dryBore ? FILL_RATE * (0.92 + rand() * 0.16) : 0;
    litres = Math.max(0, Math.min(CAP, litres - use + inflow));
    if (clock.getHours() === 0 && clock.getMinutes() === 0) usedToday = 0;
    usedToday += use;
    clock.setMinutes(clock.getMinutes() + 1);
    control();
    if (record) {
      history.push({ t: new Date(clock), pct: (litres / CAP) * 100, on: pump.on });
      if (history.length > 1440) history.shift();
    }
  }

  // Build the previous 24 hours so the chart opens full
  (function warmUp() {
    clock.setMinutes(clock.getMinutes() - 1440);
    const quiet = addLog; // keep the log for real-time events only
    const silentLog = log.length;
    for (let i = 0; i < 1440; i++) simulateMinute(true);
    log.length = silentLog;
    void quiet;
    lastAnnounce = "";
    if (pump.fault) pump.fault = null;
  })();

  // Daily usage history (14 days, seeded) + today
  const days = [];
  (function buildDays() {
    for (let i = 13; i >= 1; i--) {
      const d = new Date(clock); d.setDate(d.getDate() - i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      days.push({ d, used: Math.round(9800 * (weekend ? 0.92 : 1) * (0.85 + rand() * 0.3)) });
    }
  })();

  // ---------- rendering ----------
  function announce(text) {
    if (history.length < 1440) return; // stay quiet while building the first 24 h
    if (text !== lastAnnounce) { $("live-announce").textContent = text; lastAnnounce = text; }
  }

  function renderTank() {
    const pct = (litres / CAP) * 100;
    const top = 30, h = 250;
    const y = top + h - (h * pct) / 100;
    $("tank-water").setAttribute("y", y);
    $("tank-water").setAttribute("height", top + h - y);
    $("tank-surface").setAttribute("y1", y); $("tank-surface").setAttribute("y2", y);
    $("tank-pct").textContent = Math.round(pct);
    $("tank-litres").textContent = fmt(litres);
    document.querySelector(".tank-svg").classList.toggle("filling", pump.on && !dryBore);
    $("level-status").className = "status " + (pct < 20 ? "crit" : pct < 35 ? "warn" : "ok");
    $("level-status").innerHTML = (pct < 20 ? ICON.crit + "Low level" : pct < 35 ? ICON.warn + "Getting low" : ICON.ok + "Level OK");
  }

  function renderReadings() {
    const recent = history.slice(-60);
    const rate = recent.length > 1 ? ((recent[recent.length - 1].pct - recent[0].pct) / 100) * CAP : 0; // L per hour
    const use = usagePerMin(new Date(clock)) * 60;
    $("r-flow").innerHTML = `${rate >= 0 ? "+" : "−"}${fmt(Math.abs(rate))}<small> L/h</small>`;
    $("r-flow-d").textContent = rate >= 0 ? "Level rising over the last hour" : "Level falling over the last hour";
    $("r-today").innerHTML = `${fmt(usedToday)}<small> L</small>`;
    const avg = days.reduce((s, d) => s + d.used, 0) / days.length;
    $("r-days").innerHTML = `${(litres / avg).toFixed(1)}<small> days</small>`;
    $("r-clock").textContent = hhmm(clock);
    const h = clock.getHours();
    $("h-solar").textContent = h >= 7 && h < 19 ? "Charging" : "Not charging (night)";
    void use;
  }

  function renderPump() {
    const box = $("pump-state");
    const label = pump.fault ? "Fault" : pump.on ? "Running" : "Stopped";
    box.className = "pump-state " + (pump.fault ? "fault" : pump.on ? "on" : "off");
    box.querySelector("strong").textContent = label;
    let sub = "";
    if (pump.fault) sub = pump.fault.charAt(0).toUpperCase() + pump.fault.slice(1) + ".";
    else if (pump.on) sub = `Running for ${Math.round((clock - pump.since) / 60000)} min · ${pump.reason}`;
    else if (S.mode === "auto") sub = `Will start below ${S.autoStart}%`;
    else if (S.mode === "schedule") sub = `Runs ${S.schedStart}–${S.schedEnd} when below ${S.autoStop - 5}%`;
    else sub = "Waiting for you to start it";
    box.querySelector(".why").textContent = sub;
    $("pump-start").disabled = pump.on || !!pump.fault;
    $("pump-stop").disabled = !pump.on;
    $("pump-reset").hidden = !pump.fault;
    $("manual-note").hidden = S.mode === "manual";
  }

  function renderLog() {
    $("event-log").innerHTML = log.length
      ? log.map((e) => `<li class="${e.kind}"><span class="t">${e.t}</span><span>${e.text}</span></li>`).join("")
      : `<li class="empty"><span>Pump events will appear here as they happen.</span></li>`;
  }

  // 24 h level chart with pump-run bands
  function renderChart() {
    const svg = $("level24");
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W) return;
    const m = { t: 14, r: 14, b: 28, l: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = (i) => m.l + (i / (history.length - 1)) * iw;
    const y = (v) => m.t + ih - (v / 100) * ih;
    let s = "";
    for (let v = 0; v <= 100; v += 25) s += `<line class="g" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
    // pump bands
    let start = null;
    history.forEach((p, i) => {
      if (p.on && start === null) start = i;
      if ((!p.on || i === history.length - 1) && start !== null) { s += `<rect class="band" x="${x(start)}" y="${m.t}" width="${Math.max(1, x(i) - x(start))}" height="${ih}"/>`; start = null; }
    });
    // hour labels every 4 h
    history.forEach((p, i) => { if (p.t.getMinutes() === 0 && p.t.getHours() % 4 === 0) s += `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${pad(p.t.getHours())}:00</text>`; });
    if (S.mode !== "manual") {
      s += `<line class="th" x1="${m.l}" x2="${W - m.r}" y1="${y(S.autoStop)}" y2="${y(S.autoStop)}"/><text class="thl" x="${W - m.r}" y="${y(S.autoStop) - 6}" text-anchor="end">Stop ${S.autoStop}%</text>`;
      if (S.mode === "auto") s += `<line class="th" x1="${m.l}" x2="${W - m.r}" y1="${y(S.autoStart)}" y2="${y(S.autoStart)}"/><text class="thl" x="${W - m.r}" y="${y(S.autoStart) - 6}" text-anchor="end">Start ${S.autoStart}%</text>`;
    }
    const pts = history.map((p, i) => `${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" ");
    s += `<polygon class="area" points="${m.l},${y(0)} ${pts} ${x(history.length - 1)},${y(0)}"/>`;
    s += `<polyline class="ln" points="${pts}"/>`;
    const last = history[history.length - 1];
    s += `<circle class="dot" cx="${x(history.length - 1)}" cy="${y(last.pct)}" r="5"/>`;
    s += `<line id="x-cross" class="cross" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/><circle id="x-dot" class="dot" r="5" visibility="hidden"/>`;
    s += `<rect id="x-hit" fill="transparent" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>`;
    svg.innerHTML = s;
    const tip = $("level24-tip");
    const move = (cx) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(history.length - 1, Math.round(((cx - r.left - m.l) / iw) * (history.length - 1))));
      const p = history[i];
      $("x-cross").setAttribute("x1", x(i)); $("x-cross").setAttribute("x2", x(i)); $("x-cross").setAttribute("visibility", "visible");
      $("x-dot").setAttribute("cx", x(i)); $("x-dot").setAttribute("cy", y(p.pct)); $("x-dot").setAttribute("visibility", "visible");
      tip.innerHTML = `${hhmm(p.t)}<br><strong>${Math.round(p.pct)}%</strong> · ${fmt((p.pct / 100) * CAP)} L${p.on ? "<br>Pump running" : ""}`;
      const half = tip.offsetWidth / 2;
      tip.style.left = Math.max(half, Math.min(svg.clientWidth - half, x(i))) + "px";
      tip.style.top = y(p.pct) + "px";
      tip.classList.add("show");
    };
    const hit = $("x-hit");
    hit.addEventListener("mousemove", (e) => move(e.clientX));
    hit.addEventListener("touchstart", (e) => move(e.touches[0].clientX), { passive: true });
    hit.addEventListener("touchmove", (e) => move(e.touches[0].clientX), { passive: true });
    svg.onmouseleave = () => { tip.classList.remove("show"); };
  }

  function renderDays() {
    const svg = $("days14");
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W) return;
    const all = [...days, { d: new Date(clock), used: usedToday, today: true }];
    const m = { t: 14, r: 8, b: 28, l: 52 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = 15000;
    const step = iw / all.length, bw = step - 3;
    const y = (v) => m.t + ih - (v / max) * ih;
    let s = "";
    for (let v = 0; v <= max; v += 5000) s += `<line class="g" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v / 1000}k</text>`;
    all.forEach((d, i) => {
      const bx = m.l + i * step + 1.5, by = y(d.used), bh = m.t + ih - by, r = Math.min(4, bh);
      s += `<path class="bar${d.today ? " today" : ""}" d="M${bx} ${by + bh}V${by + r}Q${bx} ${by} ${bx + r} ${by}H${bx + bw - r}Q${bx + bw} ${by} ${bx + bw} ${by + r}V${by + bh}Z"><title>${d.today ? "Today so far" : d.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${fmt(d.used)} L</title></path>`;
      if (i % 3 === 0 || d.today) s += `<text class="ax" x="${bx + bw / 2}" y="${H - 8}" text-anchor="middle">${d.today ? "Today" : d.d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</text>`;
    });
    svg.innerHTML = s;
  }

  const ICON = {
    ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2l2.3 2.3 4.7-4.8" stroke="#fff" stroke-width="2" fill="none"/></svg>',
    warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l7 13H1z" fill="currentColor"/><path d="M8 6v4M8 11.5v1" stroke="#fff" stroke-width="2"/></svg>',
    crit: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5 5l6 6M11 5l-6 6" stroke="#fff" stroke-width="2"/></svg>',
  };

  function renderAll() { renderTank(); renderReadings(); renderPump(); renderChart(); renderDays(); }

  // ---------- controls ----------
  // A real system would send these to the receiver via the cloud.
  function sendCommand(cmd) {
    if (cmd === "start") startPump("manual start");
    if (cmd === "stop") stopPump("manual stop");
    renderAll();
  }

  const confirmBox = $("pump-confirm");
  let pending = null;
  function ask(cmd) {
    pending = cmd;
    $("confirm-text").textContent = cmd === "start"
      ? `Start the pump? It will run until you stop it, the tank reaches ${S.highCut}%, or it hits the ${S.maxRun} min limit.`
      : "Stop the pump now?";
    $("confirm-yes").textContent = cmd === "start" ? "Start pump" : "Stop pump";
    confirmBox.hidden = false;
    $("confirm-yes").focus();
  }
  $("pump-start").addEventListener("click", () => ask("start"));
  $("pump-stop").addEventListener("click", () => ask("stop"));
  $("confirm-yes").addEventListener("click", () => { confirmBox.hidden = true; sendCommand(pending); });
  $("confirm-no").addEventListener("click", () => { confirmBox.hidden = true; pending = null; });
  $("pump-reset").addEventListener("click", () => { pump.fault = null; addLog("Fault cleared by user", "info"); renderAll(); });

  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    S.mode = b.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    document.querySelectorAll("[data-mode-panel]").forEach((p) => { p.hidden = p.dataset.modePanel !== S.mode; });
    addLog(`Mode changed to ${b.textContent.trim().toLowerCase()}`);
    control(); renderAll();
  }));

  const bindRange = (id, key, fmtOut = (v) => v + "%") => {
    const el = $(id), out = $(id + "-out");
    const sync = () => { out.textContent = fmtOut(el.value); };
    el.value = S[key]; sync();
    el.addEventListener("input", () => {
      S[key] = +el.value;
      if (key === "autoStart" && S.autoStart > S.autoStop - 10) { S.autoStop = S.autoStart + 10; $("auto-stop").value = S.autoStop; $("auto-stop-out").textContent = S.autoStop + "%"; }
      if (key === "autoStop" && S.autoStop < S.autoStart + 10) { S.autoStart = S.autoStop - 10; $("auto-start").value = S.autoStart; $("auto-start-out").textContent = S.autoStart + "%"; }
      sync(); renderPump(); renderChart();
    });
    el.addEventListener("change", () => addLog(`${el.dataset.label} set to ${fmtOut(el.value)}`));
  };
  bindRange("auto-start", "autoStart");
  bindRange("auto-stop", "autoStop");
  bindRange("high-cut", "highCut");
  bindRange("max-run", "maxRun", (v) => v + " min");
  bindRange("no-rise", "noRise", (v) => v + " min");

  $("sched-start").value = S.schedStart; $("sched-end").value = S.schedEnd;
  ["sched-start", "sched-end"].forEach((id) => $(id).addEventListener("change", () => {
    S.schedStart = $("sched-start").value || S.schedStart; S.schedEnd = $("sched-end").value || S.schedEnd;
    addLog(`Schedule set to ${S.schedStart}–${S.schedEnd}`); renderPump();
  }));
  $("dry-run").checked = S.dryRun;
  $("dry-run").addEventListener("change", (e) => { S.dryRun = e.target.checked; addLog(`Dry-run protection ${S.dryRun ? "on" : "off"}`); });
  $("sim-dry").addEventListener("change", (e) => { dryBore = e.target.checked; addLog(dryBore ? "Test: water source cut off" : "Test: water source restored", "info"); renderAll(); });

  // ---------- loop ----------
  renderLog(); renderAll();
  let secs = 0;
  setInterval(() => {
    simulateMinute(true);
    secs = 0;
    renderTank(); renderReadings(); renderPump();
    if (clock.getMinutes() % 2 === 0) { renderChart(); renderDays(); }
  }, 1000);
  setInterval(() => { secs++; }, 1000);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { renderChart(); renderDays(); }, 150); });
})();
