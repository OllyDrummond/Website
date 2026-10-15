/* Tank monitor page: kit builder with live prices, sub-nav offset and the
   order dialog. Uses FORM_ENDPOINT and CONTACT_EMAIL from main.js. */
(() => {
  const config = document.getElementById("config");
  if (!config) return;

  // Prices in NZD including GST. While EXAMPLE_PRICES is true the page shows an
  // "Example prices" tag; set it to false once these are the real prices.
  const PRICES = { tankUnit: 449, receiver: 299, pumpController: 399 };
  const EXAMPLE_PRICES = true;
  const MAX_TANKS = 10;

  const state = { system: "monitor", tanks: 1, pumps: 1 };
  const pumpsOn = () => state.system === "pump";
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const money = (n) => "$" + n.toLocaleString("en-NZ");
  const $ = (id) => document.getElementById(id);

  const lines = () => {
    const out = [
      [plural(state.tanks, "tank unit", "tank units"), state.tanks * PRICES.tankUnit],
      ["1 receiver", PRICES.receiver],
    ];
    if (pumpsOn()) out.push([plural(state.pumps, "pump controller", "pump controllers"), state.pumps * PRICES.pumpController]);
    return out;
  };
  const total = () => lines().reduce((s, [, p]) => s + p, 0);

  document.querySelectorAll("[data-example-flag]").forEach((el) => { el.hidden = !EXAMPLE_PRICES; });
  $("from-out").textContent = money(PRICES.tankUnit + PRICES.receiver);

  // ---------- Kit builder ----------
  function update() {
    state.pumps = Math.min(state.pumps, state.tanks);
    $("tanks-out").textContent = state.tanks;
    $("pumps-out").textContent = state.pumps;
    $("pumps-row").hidden = !pumpsOn();
    config.querySelectorAll("[data-step]").forEach((b) => {
      const key = b.dataset.step, d = Number(b.dataset.d);
      const max = key === "tanks" ? MAX_TANKS : state.tanks;
      b.disabled = (d < 0 && state[key] <= 1) || (d > 0 && state[key] >= max);
    });
    const list = $("lines-out");
    list.innerHTML = "";
    lines().forEach(([name, price]) => {
      const li = document.createElement("li");
      li.append(Object.assign(document.createElement("span"), { textContent: name }), Object.assign(document.createElement("span"), { textContent: money(price) }));
      list.append(li);
    });
    $("total-out").textContent = money(total());
  }
  config.addEventListener("change", (e) => { if (e.target.name === "system") { state.system = e.target.value; update(); } });
  config.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
    state[b.dataset.step] += Number(b.dataset.d);
    update();
  }));
  update();

  // ---------- Sub-nav sits just under the site header ----------
  const header = document.querySelector(".site-header");
  const setOffset = () => document.documentElement.style.setProperty("--hdr", (header ? header.offsetHeight : 0) + "px");
  setOffset();
  addEventListener("resize", setOffset);

  // ---------- Order dialog ----------
  const dialog = $("order-dialog");
  const form = $("order-form");
  const status = $("order-status");
  const kitList = $("od-kit-list");
  const details = () => [
    ...lines().map(([name, price]) => `${name}: ${money(price)}`),
    `Total incl. GST: ${money(total())}`,
  ];
  let opener = null;
  document.querySelectorAll("[data-order]").forEach((b) => b.addEventListener("click", () => {
    opener = b;
    kitList.innerHTML = "";
    details().forEach((t) => kitList.append(Object.assign(document.createElement("li"), { textContent: t })));
    status.textContent = ""; status.className = "form-status";
    dialog.showModal();
    $("o-name").focus();
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
      const input = $(id), err = $(id + "-err");
      const valid = ok(input.value);
      input.setAttribute("aria-invalid", String(!valid));
      err.classList.toggle("show", !valid);
      if (!valid) input.setAttribute("aria-describedby", err.id); else input.removeAttribute("aria-describedby");
      if (!valid && !firstBad) firstBad = input;
    }
    if (firstBad) { firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    const kit = details().map((t) => `- ${t}`).join("\n");
    const body = `Order: Kinetiq Tank Monitor\n\n${kit}\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "-"}\nNearest town: ${data.place}\n\n${data.notes || ""}`;
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
        status.textContent = "Order sent. We'll email you a payment link and delivery date within two working days.";
      } catch {
        status.classList.add("bad");
        status.textContent = `Your order didn't send. Check your connection and try again, or email ${CONTACT_EMAIL}.`;
      }
      return;
    }
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Order: Kinetiq Tank Monitor")}&body=${encodeURIComponent(body)}`;
    status.classList.add("ok");
    status.textContent = "Your email app should open with the order filled in. Press send there to finish.";
  });
})();

// Design comparison: water-monitor.html?compare shows a switcher to version B
if (new URLSearchParams(location.search).has("compare")) {
  const bar = document.createElement("nav");
  bar.setAttribute("aria-label", "Compare designs");
  bar.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:999;display:flex;gap:4px;padding:5px;border-radius:999px;background:rgba(22,26,30,.92);box-shadow:0 10px 30px rgba(0,0,0,.3);font:600 13px/1 Archivo,system-ui,sans-serif";
  bar.innerHTML = '<a href="water-monitor.html?compare" aria-current="page" style="padding:10px 16px;border-radius:999px;text-decoration:none;background:#fff;color:#16191c">Version A</a><a href="water-monitor-b.html" style="padding:10px 16px;border-radius:999px;text-decoration:none;color:#fff">Version B</a><a href="water-monitor-c.html" style="padding:10px 16px;border-radius:999px;text-decoration:none;color:#fff">Version C</a>';
  document.body.appendChild(bar);
}
