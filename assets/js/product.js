/* Product purchase page: kit builder, system drawing, sticky buy panel,
   order bar, gallery dots and the order request dialog.
   Uses FORM_ENDPOINT and CONTACT_EMAIL from main.js. */
(() => {
  const config = document.getElementById("config");
  if (!config) return;

  const MAX_TANKS = 10;
  const state = { system: "monitor", tanks: 1, pumps: 1 };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const pumpsOn = () => state.system === "pump";

  // ---------- Kit builder ----------
  const tanksOut = document.getElementById("tanks-out");
  const pumpsOut = document.getElementById("pumps-out");
  const pumpsRow = document.getElementById("pumps-row");
  const summary = document.getElementById("kit-summary");
  const barSummary = document.getElementById("ob-summary");

  const kitItems = () => {
    const items = [plural(state.tanks, "tank unit", "tank units"), "1 receiver"];
    if (pumpsOn()) items.push(plural(state.pumps, "pump controller", "pump controllers"));
    return items;
  };

  const update = () => {
    state.pumps = Math.min(state.pumps, state.tanks);
    tanksOut.textContent = state.tanks;
    pumpsOut.textContent = state.pumps;
    pumpsRow.hidden = !pumpsOn();
    config.querySelectorAll("[data-step]").forEach((b) => {
      const key = b.dataset.step, d = Number(b.dataset.d);
      const max = key === "tanks" ? MAX_TANKS : state.tanks;
      b.disabled = (d < 0 && state[key] <= 1) || (d > 0 && state[key] >= max);
    });
    const items = kitItems();
    summary.textContent = `In your kit: ${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
    barSummary.textContent = `${plural(state.tanks, "tank", "tanks")}, ${pumpsOn() ? "monitoring and pump control" : "monitoring"}`;
    draw();
  };

  config.addEventListener("change", (e) => {
    if (e.target.name === "system") { state.system = e.target.value; update(); }
  });
  config.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
    const key = b.dataset.step;
    state[key] += Number(b.dataset.d);
    update();
  }));

  // ---------- System drawing ----------
  const svg = document.getElementById("sys-svg");
  const LEVELS = [0.72, 0.48, 0.86, 0.6, 0.38, 0.8, 0.55, 0.67, 0.44, 0.9];
  const HOUSE = { x: 250, y: 58, w: 52, h: 58 };
  const RX = { x: HOUSE.x + 26, y: HOUSE.y + 30 };   // receiver in the house

  function tankShape(x, y, w, h, level, i) {
    const top = `M${x} ${y + 5} Q${x} ${y} ${x + w / 2} ${y - 1.5} Q${x + w} ${y} ${x + w} ${y + 5} V${y + h - 2} Q${x + w} ${y + h} ${x + w - 2} ${y + h} H${x + 2} Q${x} ${y + h} ${x} ${y + h - 2} Z`;
    const wy = y + 4 + (h - 6) * (1 - level);
    const ux = x + w / 2 - 6, uy = y - 9;
    return `
      <clipPath id="sys-c${i}"><path d="${top}"/></clipPath>
      <path class="s-tank" d="${top}"/>
      <rect class="s-water" x="${x}" y="${wy}" width="${w}" height="${y + h - wy}" clip-path="url(#sys-c${i})"/>
      <path class="s-tank" d="${top}" fill="none"/>
      <rect class="s-unit" x="${ux}" y="${uy}" width="12" height="7" rx="1.5"/>
      <path class="s-ant" d="M${ux + 10} ${uy} V${uy - 9}"/>`;
  }

  function draw() {
    const n = state.tanks, perRow = Math.min(n, 5), rows = Math.ceil(n / 5);
    const w = rows > 1 ? 26 : n > 3 ? 28 : 34, h = rows > 1 ? 22 : n > 3 ? 26 : 32;
    const areaW = 200, gap = (areaW - perRow * w) / (perRow + 1);
    let out = "", radio = "", pumps = "";
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / 5), c = i % 5;
      const inRow = r === rows - 1 ? n - r * 5 : 5;
      const g = (areaW - inRow * w) / (inRow + 1);
      const x = 8 + g + c * (w + g);
      const y = rows > 1 ? 34 + r * 52 : 120 - h;
      out += tankShape(x, y, w, h, LEVELS[i], i);
      const ax = x + w / 2 + 4, ay = y - 18;
      radio += `<path class="s-radio" d="M${ax} ${ay} Q${(ax + RX.x) / 2} ${Math.min(ay, RX.y) - 26} ${RX.x} ${RX.y - 22}"/>`;
      if (pumpsOn() && i < state.pumps) {
        const px = x - 7, py = y + h - 8;
        pumps += `<path class="s-pipe" d="M${px + 4} ${py + 4} H${x + 3}"/><rect class="s-pump" x="${px - 4}" y="${py}" width="8" height="8" rx="1.5"/>`;
      }
    }
    const H = HOUSE;
    const house = `
      <path class="s-house" d="M${H.x - 4} ${H.y + 20} L${H.x + H.w / 2} ${H.y} L${H.x + H.w + 4} ${H.y + 20} M${H.x + 2} ${H.y + 16} V${H.y + H.h} H${H.x + H.w - 2} V${H.y + 16}"/>
      <rect class="s-unit" x="${RX.x - 10}" y="${RX.y - 8}" width="20" height="24" rx="3"/>
      <rect class="s-screen" x="${RX.x - 7}" y="${RX.y - 5}" width="14" height="11" rx="1.5"/>
      <path class="s-ant" d="M${RX.x + 7} ${RX.y - 8} V${RX.y - 22}"/>`;
    const phone = `
      <path class="s-radio" d="M${H.x + H.w + 6} ${H.y + 40} Q${H.x + H.w + 18} ${H.y + 24} 330 ${H.y + 30}"/>
      <rect class="s-unit" x="324" y="${H.y + 30}" width="20" height="34" rx="4"/>
      <rect class="s-screen" x="327" y="${H.y + 35}" width="14" height="20" rx="1.5"/>`;
    const labels = `
      <text x="108" y="146" text-anchor="middle">${plural(n, "tank", "tanks")}${pumpsOn() ? `, ${plural(state.pumps, "pump", "pumps")}` : ""}</text>
      <text x="${RX.x}" y="146" text-anchor="middle">House</text>
      <text x="334" y="146" text-anchor="middle">App</text>`;
    svg.innerHTML = radio + out + pumps + house + phone + labels;
  }

  update();

  // ---------- Sticky buy panel ----------
  // Long panels stick by their bottom edge so nothing is ever out of reach.
  const panel = document.querySelector(".buy-panel");
  const header = document.querySelector(".site-header");
  const setStick = () => {
    const top = (header ? header.offsetHeight : 72) + 24;
    panel.style.setProperty("--stick", Math.min(top, innerHeight - panel.offsetHeight - 24) + "px");
  };
  setStick();
  addEventListener("resize", setStick);
  panel.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", setStick));
  new ResizeObserver(setStick).observe(panel);

  // ---------- Order bar ----------
  const bar = document.getElementById("order-bar");
  const barBtn = bar.querySelector("button");
  const actions = document.getElementById("bp-actions");
  const footer = document.querySelector(".site-footer");
  let pastActions = false, atFooter = false;
  const syncBar = () => {
    const show = pastActions && !atFooter;
    bar.classList.toggle("show", show);
    bar.setAttribute("aria-hidden", String(!show));
    barBtn.tabIndex = show ? 0 : -1;
  };
  new IntersectionObserver(([e]) => { pastActions = !e.isIntersecting && e.boundingClientRect.top < 0; syncBar(); }).observe(actions);
  if (footer) new IntersectionObserver(([e]) => { atFooter = e.isIntersecting; syncBar(); }).observe(footer);

  // ---------- Gallery dots (phone and tablet) ----------
  const gallery = document.getElementById("gallery");
  const dotsEl = document.querySelector(".g-dots");
  const items = [...gallery.querySelectorAll(".g-item")];
  dotsEl.innerHTML = items.map(() => "<span></span>").join("");
  const dots = [...dotsEl.children];
  const syncDots = () => {
    const step = items[1] ? items[1].offsetLeft - items[0].offsetLeft : 1;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(gallery.scrollLeft / step)));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
  };
  gallery.addEventListener("scroll", syncDots, { passive: true });
  syncDots();

  // ---------- Order request dialog ----------
  const dialog = document.getElementById("order-dialog");
  const form = document.getElementById("order-form");
  const status = document.getElementById("order-status");
  const kitList = document.getElementById("od-kit-list");
  const distance = document.getElementById("distance");
  const details = () => [
    ...kitItems(),
    pumpsOn() ? "Monitoring and pump control" : "Monitoring only",
    `Furthest tank from the house: ${distance.value}`,
  ];
  let opener = null;
  document.querySelectorAll("[data-order]").forEach((b) => b.addEventListener("click", () => {
    opener = b;
    kitList.innerHTML = "";
    details().forEach((t) => { const li = document.createElement("li"); li.textContent = t; kitList.append(li); });
    status.textContent = ""; status.className = "form-status";
    dialog.showModal();
    document.getElementById("o-name").focus();
  }));
  dialog.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { if (opener) opener.focus(); });

  const checks = [
    ["o-name", (v) => v.trim().length > 0],
    ["o-email", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
    ["o-place", (v) => v.trim().length > 0],
  ];
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstBad = null;
    for (const [id, ok] of checks) {
      const input = document.getElementById(id);
      const err = document.getElementById(id + "-err");
      const valid = ok(input.value);
      input.setAttribute("aria-invalid", String(!valid));
      err.classList.toggle("show", !valid);
      if (!valid) input.setAttribute("aria-describedby", err.id); else input.removeAttribute("aria-describedby");
      if (!valid && !firstBad) firstBad = input;
    }
    if (firstBad) { firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    const kit = details().map((t) => `- ${t}`).join("\n");
    const body = `Order request: Kinetiq Tank Monitor\n\n${kit}\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "-"}\nNearest town: ${data.place}\n\n${data.notes || ""}`;
    status.className = "form-status";
    if (typeof FORM_ENDPOINT === "string" && FORM_ENDPOINT) {
      status.textContent = "Sending…";
      const fd = new FormData(form);
      fd.append("product", "Kinetiq Tank Monitor");
      fd.append("kit", details().join("; "));
      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: fd });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        status.classList.add("ok");
        status.textContent = "Order request sent. We'll reply with a price for your site within two working days.";
      } catch {
        status.classList.add("bad");
        status.textContent = `Your order request didn't send. Check your connection and try again, or email ${CONTACT_EMAIL}.`;
      }
      return;
    }
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Order request: Kinetiq Tank Monitor")}&body=${encodeURIComponent(body)}`;
    status.classList.add("ok");
    status.textContent = "Your email app should open with the order request filled in. Press send there to finish.";
  });
})();
