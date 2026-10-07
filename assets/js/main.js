/* Shared site behaviour: header, mobile menu, scroll reveals, counters,
   hero parallax, live reading card, enquiry form, project filters. */

// To have enquiries delivered without opening the visitor's email app, sign up
// for a form service (e.g. Formspree) and paste its endpoint URL here.
const FORM_ENDPOINT = "";
const CONTACT_EMAIL = "hello@example.com";

document.documentElement.classList.add("js");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------- Header ----------
const header = document.querySelector(".site-header");
if (header && header.classList.contains("over-hero")) {
  const onScroll = () => header.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  const close = () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); toggle.textContent = "Menu"; };
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  });
  nav.addEventListener("click", (e) => { if (e.target.tagName === "A") close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// ---------- Scroll reveal ----------
// Children of [data-stagger] reveal one after another.
document.querySelectorAll("[data-stagger]").forEach((group) => {
  [...group.children].forEach((child, i) => {
    if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", "");
    child.style.setProperty("--d", `${i * 0.09}s`);
  });
});

const revealables = document.querySelectorAll("[data-reveal], .process, [data-count]");
if ("IntersectionObserver" in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target.dataset.count !== undefined) countUp(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-visible"));
}

// ---------- Counters ----------
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = (el.dataset.count.split(".")[1] || "").length;
  const unit = el.querySelector("small");
  const unitHTML = unit ? unit.outerHTML : "";
  const start = performance.now();
  const dur = 1400;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.innerHTML = (target * eased).toFixed(decimals) + unitHTML;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Hero parallax ----------
const heroImg = document.querySelector(".hero-media img");
if (heroImg && !reduceMotion && matchMedia("(min-width: 761px)").matches) {
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = Math.min(scrollY, innerHeight);
      heroImg.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(${1.04 + y * 0.00008})`;
      ticking = false;
    });
  }, { passive: true });
}

// ---------- Live reading card (sample data) ----------
const live = document.querySelector("[data-live]");
if (live) {
  const CAPACITY = 22000;
  const big = live.querySelector(".big");
  const bar = live.querySelector(".meter span");
  const litres = live.querySelector("[data-litres]");
  const ago = live.querySelector("[data-ago]");
  let level = 62, secs = 0;
  const render = () => {
    big.innerHTML = `${Math.round(level)}<small>% full</small>`;
    bar.style.width = level + "%";
    litres.textContent = Math.round((CAPACITY * level) / 100).toLocaleString() + " L";
  };
  render();
  if (!reduceMotion) {
    setInterval(() => {
      secs++;
      if (secs >= 8) {
        level = Math.max(48, Math.min(78, level + (Math.random() - 0.55) * 2.5));
        secs = 0;
        render();
      }
      ago.textContent = secs < 2 ? "just now" : `${secs} s ago`;
    }, 1000);
  }
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
      if (err) { err.classList.toggle("show", !valid); if (!valid) input.setAttribute("aria-describedby", err.id); }
      if (!valid && !firstBad) firstBad = input;
    }
    if (firstBad) { firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    status.className = "form-status";
    if (FORM_ENDPOINT) {
      status.textContent = "Sending…";
      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        status.classList.add("ok");
        status.textContent = "Enquiry sent. We'll reply within two working days.";
      } catch {
        status.classList.add("bad");
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

// ---------- Project filters ----------
const chips = document.querySelectorAll("[data-filter]");
if (chips.length) {
  chips.forEach((chip) => chip.addEventListener("click", () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    document.querySelectorAll("[data-status]").forEach((p) => { p.hidden = f !== "all" && p.dataset.status !== f; });
  }));
}

// ---------- Portal sign-in (demo) ----------
const login = document.getElementById("login-form");
if (login) {
  login.addEventListener("submit", (e) => {
    e.preventDefault();
    // Demo only: nothing is checked or sent. Replace with your real sign-in.
    location.href = "dashboard.html";
  });
}
