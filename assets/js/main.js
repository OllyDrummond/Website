/* Shared site behaviour: mobile menu, footer year, enquiry form, hero tank. */

// To have enquiries delivered without opening the visitor's email app, sign up
// for a form service (e.g. Formspree) and paste its endpoint URL here.
const FORM_ENDPOINT = "";
const CONTACT_EMAIL = "hello@example.com";

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------- Mobile menu ----------
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Menu";
    }
  });
}

// ---------- Enquiry form ----------
const form = document.getElementById("quote-form");
if (form) {
  const status = document.getElementById("form-status");
  const checks = [
    ["f-name", (v) => v.trim().length > 0],
    ["f-email", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
    ["f-msg", (v) => v.trim().length > 0],
  ];

  // Preselect the product when arriving from a product page (?product=...)
  const pre = new URLSearchParams(location.search).get("product");
  if (pre) {
    const sel = document.getElementById("f-product");
    [...sel.options].forEach((o) => { if (o.text === pre) sel.value = o.value; });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstBad = null;
    for (const [id, ok] of checks) {
      const input = document.getElementById(id);
      const err = document.getElementById(id + "-err");
      const valid = ok(input.value);
      input.setAttribute("aria-invalid", String(!valid));
      if (err) {
        err.classList.toggle("show", !valid);
        if (!valid) input.setAttribute("aria-describedby", err.id);
      }
      if (!valid && !firstBad) firstBad = input;
    }
    if (firstBad) { firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    status.className = "form-status";

    if (FORM_ENDPOINT) {
      status.textContent = "Sending…";
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        status.classList.add("ok");
        status.textContent = "Enquiry sent. We'll reply within two working days.";
      } catch {
        status.textContent = `Your enquiry didn't send. Check your connection and try again, or email ${CONTACT_EMAIL}.`;
      }
      return;
    }

    const body = `Name: ${data.name}\nPhone: ${data.phone || "-"}\nEmail: ${data.email}\nAbout: ${data.product}\n\n${data.message}`;
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Enquiry: " + data.product)}&body=${encodeURIComponent(body)}`;
    status.classList.add("ok");
    status.textContent = "Your email app should open with the enquiry filled in. Press send there to finish.";
  });
}

// ---------- Hero tank instrument (demo reading) ----------
const water = document.getElementById("tank-water");
if (water) {
  const TOP = 36, H = 210, X = 70, W = 180, CAPACITY = 22000;
  const ticks = document.getElementById("ticks");
  const ns = "http://www.w3.org/2000/svg";
  for (let p = 0; p <= 100; p += 25) {
    const y = TOP + H - (H * p) / 100;
    const l = document.createElementNS(ns, "line");
    Object.entries({ x1: 54, x2: 66, y1: y, y2: y, class: "tank-tick" }).forEach(([k, v]) => l.setAttribute(k, v));
    const t = document.createElementNS(ns, "text");
    Object.entries({ x: 48, y: y + 4, "text-anchor": "end", class: "tank-tick-label" }).forEach(([k, v]) => t.setAttribute(k, v));
    t.textContent = p + "%";
    ticks.append(l, t);
  }

  const surface = document.getElementById("tank-surface");
  const marker = document.getElementById("tank-marker");
  const valueEl = document.getElementById("tank-value");
  const litresEl = document.getElementById("tank-litres");
  const agoEl = document.getElementById("tank-ago");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let level = 62;
  let phase = 0;

  function draw() {
    const y = TOP + H - (H * level) / 100;
    water.setAttribute("y", y);
    water.setAttribute("height", TOP + H - y + 10);
    marker.setAttribute("y1", y);
    marker.setAttribute("y2", y);
    let d = `M${X} ${y}`;
    for (let x = 0; x <= W; x += 6) d += ` L${X + x} ${y - 3 - Math.sin(x / 18 + phase) * 3}`;
    d += ` L${X + W} ${y + 2} L${X} ${y + 2} Z`;
    surface.setAttribute("d", d);
  }

  function setReading() {
    valueEl.innerHTML = `${Math.round(level)}<small>%</small>`;
    litresEl.textContent = `${Math.round((CAPACITY * level) / 100).toLocaleString()} L`;
  }

  draw();
  setReading();

  if (!still) {
    // Ripple the surface continuously; a new "reading" arrives every few seconds.
    let target = level;
    const loop = () => {
      phase += 0.05;
      level += (target - level) * 0.03;
      draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    let seconds = 0;
    setInterval(() => {
      seconds++;
      agoEl.textContent = seconds < 2 ? "just now" : `${seconds} s ago`;
      if (seconds >= 6) {
        target = Math.max(40, Math.min(85, target + (Math.random() - 0.55) * 6));
        seconds = 0;
        agoEl.textContent = "just now";
        setTimeout(setReading, 600);
      }
    }, 1000);
  }
}
