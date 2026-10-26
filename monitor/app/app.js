// Kinetiq Tank Monitor web app.
//
// Two kinds of page (see route()):
//   Home       water use of all tanks, alerts, tanks, pumps and settings
//   Tank page  one tank in depth: 3D level, history, details, pump, use, system
// Clicking a box enlarges it to show more. On a computer each page fits the
// window; phones stack the boxes and scroll.
// Data comes from data.js (Supabase or the in-browser demo). Read-only except
// tank names, sizes and low-level alerts.

import { supabaseConfigured, createSupabaseSource, createDemoSource } from './data.js?v=17';
import { LIVE_SECONDS, OFFLINE_SECONDS, RECEIVER_OFFLINE_SECONDS } from './config.js';

const app = document.getElementById('app');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let source = null;
let site = null;
let selected = null;           // tank id
let range = '24h';
let unsubscribe = null;
let chartTimer = null;
let activityFilter = 'all';

const RANGES = {
  '24h': { label: '24H', long: '24 hours', ms: 86400_000, bucket: 300, bin: 3600_000 },
  '7d': { label: '7D', long: '7 days', ms: 7 * 86400_000, bucket: 1800, bin: 86400_000 },
  '30d': { label: '30D', long: '30 days', ms: 30 * 86400_000, bucket: 7200, bin: 86400_000 },
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf0 = new Intl.NumberFormat('en-NZ', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
const dateLong = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('en-NZ', { weekday: 'short' });
const hourFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric' });

const ageSeconds = (iso) => (Date.now() - Date.parse(iso)) / 1000;

function ago(iso) {
  const s = Math.max(0, ageSeconds(iso));
  if (s < 60) return `${Math.round(s)} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60); return m ? `${h} h ${m} min ago` : `${h} h ago`; }
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function when(iso) {
  const d = new Date(iso);
  const t = timeFmt.format(d);
  if (d.toDateString() === new Date().toDateString()) return `Today ${t}`;
  if (d.toDateString() === new Date(Date.now() - 86400_000).toDateString()) return `Yesterday ${t}`;
  return `${dayFmt.format(d)} ${t}`;
}

function duration(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

function freshness(iso) {
  if (!iso) return { key: 'none', label: 'No readings' };
  const s = ageSeconds(iso);
  if (s <= LIVE_SECONDS) return { key: 'live', label: 'Live' };
  if (s <= OFFLINE_SECONDS) return { key: 'delayed', label: 'Delayed' };
  return { key: 'offline', label: 'Offline' };
}

function signalBars(rssi) {
  if (rssi == null) return 0;
  if (rssi >= -85) return 4;
  if (rssi >= -100) return 3;
  if (rssi >= -110) return 2;
  return 1;
}

const ICONS = {
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  tanks: '<path d="M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3v12c0 1.7-3.1 3-7 3s-7-1.3-7-3z"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  chart: '<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  pump: '<circle cx="12" cy="12" r="8"/><path d="M12 12 8 6M12 12l6 2M12 12l-2 7"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  receiver: '<rect x="3" y="6" width="18" height="12" rx="2"/><rect x="6" y="9" width="8" height="6" rx="1"/><path d="M17 10h1M17 14h1"/>',
};
const icon = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

function signal(rssi, light = false) {
  const n = signalBars(rssi);
  const label = rssi == null ? 'Signal unknown' : `Radio signal ${['', 'weak', 'fair', 'good', 'strong'][n]}, ${rssi} dBm`;
  return `<span class="signal ${light ? 'signal-light' : ''}" role="img" aria-label="${esc(label)}">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}" style="height:${3 + i * 3}px"></i>`).join('')}</span>`;
}

// ---------------------------------------------------------------------------
// Derived figures
// ---------------------------------------------------------------------------

const tankById = (id) => site.tanks.find((t) => t.id === id);
const stateOf = (id) => site.stateByTank.get(id);
const pumpOf = (id) => site.pumpByTank.get(id);

function capacityOf(t) {
  const st = stateOf(t.id);
  if (t.capacity_l) return t.capacity_l;
  if (st && st.tank_percent > 1) return st.tank_volume_l / (st.tank_percent / 100);
  return null;
}

// Running/stopped/fault events -> runs [{ start, end, endState, startedBefore }].
function pumpRuns(events, since) {
  const runs = [];
  let open = null;
  for (const e of events) {
    const at = Date.parse(e.heard_at);
    if (e.state === 'running') {
      if (!open) open = { start: Math.max(at, since), startedBefore: at < since, end: null, endState: null };
    } else if (open) {
      open.end = at;
      open.endState = e.state;
      if (open.end >= since) runs.push(open);
      open = null;
    }
  }
  if (open) runs.push(open);
  return runs;
}

const overlapsRun = (runs, a, b, pad = 0) => runs.some((r) => r.start < b + pad && (r.end ?? Date.now()) > a - pad);

// Water used per time bin: every fall in level, skipping times the pump ran.
function useBins(points, runs, cap, binMs, since) {
  const bins = new Map();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (b.t - a.t > 3 * 3600_000 || overlapsRun(runs, a.t, b.t, 600_000)) continue;
    const dl = ((b.p - a.p) / 100) * cap;
    if (dl >= 0) continue;
    const key = binStart(b.t, binMs);
    bins.set(key, (bins.get(key) ?? 0) - dl);
  }
  const out = [];
  for (let t = binStart(since, binMs); t <= Date.now(); t += binMs) out.push({ t, litres: bins.get(t) ?? 0 });
  return out;
}

function binStart(ms, binMs) {
  if (binMs >= 86400_000) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  return Math.floor(ms / binMs) * binMs;
}

// Average daily use over 7 days and days of water left.
function usageStats(points, runs, cap, volume) {
  let used = 0, ms = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (b.t - a.t > 1.5 * 3600_000 || overlapsRun(runs, a.t, b.t, 1800_000)) continue;
    const dl = ((b.p - a.p) / 100) * cap;
    if (dl < 0) used -= dl;
    ms += b.t - a.t;
  }
  if (ms < 86400_000) return { enough: false };
  const perDay = used / (ms / 86400_000);
  return { enough: true, perDay, daysLeft: perDay > 1 && volume != null ? volume / perDay : null };
}

function daysLeftText(stats) {
  if (!stats) return '–';
  if (!stats.enough) return 'Not enough data yet';
  if (stats.daysLeft == null) return '–';
  if (stats.daysLeft > 60) return '60+ days';
  if (stats.daysLeft < 1) return 'Under a day';
  const d = Math.floor(stats.daysLeft);
  return `${d} day${d === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// Data cache (per tank)
// ---------------------------------------------------------------------------

const cache = new Map();   // key -> { at, value }

async function cached(key, maxAgeMs, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

const toPoints = (hist, bucketS) => hist.map((r) => ({ t: Date.parse(r.bucket) + bucketS * 500, p: r.avg_percent }));

async function weekData(t) {
  return cached(`week:${t.id}`, 5 * 60_000, async () => {
    const since = Date.now() - 7 * 86400_000;
    const iso = new Date(since).toISOString();
    const [hist, events] = await Promise.all([source.history(t.id, iso, 3600), source.pumpEvents(t.id, iso)]);
    return { points: toPoints(hist, 3600), events, runs: pumpRuns(events, since), since };
  });
}

async function rangeData(t, key, force = false) {
  const r = RANGES[key];
  if (force) cache.delete(`range:${t.id}:${key}`);
  return cached(`range:${t.id}:${key}`, 60_000, async () => {
    const since = Date.now() - r.ms;
    const iso = new Date(since).toISOString();
    const [hist, events] = await Promise.all([source.history(t.id, iso, r.bucket), source.pumpEvents(t.id, iso)]);
    return { points: toPoints(hist, r.bucket), runs: pumpRuns(events, since), since };
  });
}

async function sparkData(t) {
  return cached(`spark:${t.id}`, 5 * 60_000, async () => {
    const iso = new Date(Date.now() - 86400_000).toISOString();
    return toPoints(await source.history(t.id, iso, 1800), 1800);
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function wantsDemo() {
  if (new URLSearchParams(location.search).has('demo')) return true;
  try { return sessionStorage.getItem('kinetiq-demo') === '1'; } catch { return false; }
}

async function start() {
  if (wantsDemo()) { source = createDemoSource(); return openSite(); }
  if (!supabaseConfigured) return renderLogin();
  try {
    source = await createSupabaseSource();
    if (await source.getSession()) return openSite();
  } catch (err) {
    console.error(err);
  }
  renderLogin();
}

async function openSite() {
  app.innerHTML = `<div class="boot" role="status"><span class="spinner" aria-hidden="true"></span>Loading your tanks…</div>`;
  try {
    site = await source.loadSite();
  } catch (err) {
    app.innerHTML = `<div class="boot" role="alert">Couldn't load your tanks: ${esc(err.message)}. Check your internet connection and reload the page.</div>`;
    return;
  }
  if (!site) {
    app.innerHTML = `<div class="boot"><div><h1>No system linked yet</h1><p>Your account is set up, but no tank monitor is linked to it yet. Contact Kinetiq and we'll connect your receiver.</p><p><button class="btn btn-ghost" id="signout">Sign out</button></p></div></div>`;
    document.getElementById('signout').addEventListener('click', signOut);
    return;
  }
  site.stateByTank = new Map(site.tankState.map((r) => [r.tank_id, r]));
  site.pumpByTank = new Map(site.pumpState.map((r) => [r.tank_id, r]));

  selected = site.tanks[0]?.id ?? null;

  renderShell();
  unsubscribe?.();
  unsubscribe = source.subscribe(onLiveChange);
  addEventListener('hashchange', route);
  setInterval(tick, 1000);
}

function onLiveChange({ table, row }) {
  if (!site || !row) return;
  if (table === 'tank_state') site.stateByTank.set(row.tank_id, row);
  if (table === 'pump_state') {
    site.pumpByTank.set(row.tank_id, row);
    for (const k of [...cache.keys()]) if (k.includes(row.tank_id)) cache.delete(k);
  }
  if (table === 'gateways') {
    const i = site.gateways.findIndex((g) => g.id === row.id);
    if (i >= 0) site.gateways[i] = row; else site.gateways.push(row);
  }
  updateTop();
  refreshBoxes(table, row);
}

function tick() {
  document.querySelectorAll('[data-age]').forEach((el) => { el.textContent = ago(el.dataset.age); });
  updateClock();
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function renderLogin(message = '') {
  document.title = 'Sign in | Kinetiq Tank Monitor';
  app.innerHTML = `
  <main class="login">
    <img class="login-bg" src="../../assets/img/photos/nz-farm-tank.webp" alt="" width="1536" height="1024">
    <div class="login-card">
      <img class="login-logo" src="../../assets/img/brand/kinetiq-full-white.webp?v=4" alt="Kinetiq, engineering solutions" width="1178" height="400">
      <h1>Tank Monitor</h1>
      <p class="login-sub">Sign in to see your tanks, live.</p>
      ${supabaseConfigured ? `
      <form id="login-form" novalidate>
        <label for="email">Email</label>
        <input id="email" type="email" autocomplete="email" required>
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" required>
        <p class="form-msg" id="login-msg" role="status">${esc(message)}</p>
        <button class="btn btn-primary" type="submit">Sign in</button>
        <button class="link-btn" type="button" id="forgot">Forgot your password?</button>
      </form>` : `
      <p class="login-note">Customer accounts aren't switched on yet. Explore the demo with sample data.</p>`}
      <button class="btn ${supabaseConfigured ? 'btn-glass' : 'btn-primary'} login-demo" type="button" id="demo-btn">View the demo</button>
      <a class="login-back" href="../../products/water-monitor.html">${icon('left')}Back to the Kinetiq website</a>
    </div>
  </main>`;

  document.getElementById('demo-btn').addEventListener('click', () => {
    try { sessionStorage.setItem('kinetiq-demo', '1'); } catch { /* still works for this page */ }
    source = createDemoSource();
    openSite();
  });

  const form = document.getElementById('login-form');
  if (!form) return;
  const msg = document.getElementById('login-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) { msg.textContent = 'Enter your email and password.'; return; }
    msg.textContent = 'Signing in…';
    try { await source.signIn(email, password); openSite(); } catch (err) { msg.textContent = err.message; }
  });
  document.getElementById('forgot').addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) { msg.textContent = 'Enter your email above first, then press "Forgot your password?" again.'; return; }
    try { await source.resetPassword(email); msg.textContent = `If ${email} has an account, we've emailed a link to reset the password.`; }
    catch (err) { msg.textContent = err.message; }
  });
}

async function signOut() {
  try { sessionStorage.removeItem('kinetiq-demo'); } catch { /* ignore */ }
  unsubscribe?.();
  await source?.signOut();
  location.href = location.pathname;
}

// ---------------------------------------------------------------------------
// Frame and pages
//   #/            home: water use of all tanks, alerts, tanks, pumps, settings
//   #/tank/<id>   one tank in depth
// ---------------------------------------------------------------------------

// Keep in step with the "one screen" media query in app.css.
const FIT = matchMedia('(min-width: 1100px) and (min-height: 640px)');
let view = 'home';     // 'home' or 'tank'
let openKind = null;   // which box is enlarged, if any
let openFrom = null;   // the element it grew from; focus returns there
let useRange = '1w';   // period of the home water-use chart

const $ = (id) => document.getElementById(id);
const clockFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' });
const headDate = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
const clampPct = (p) => Math.max(0, Math.min(100, p));
const pad2 = (n) => String(n).padStart(2, '0');
const rssiPct = (rssi) => rssi == null ? 0 : clampPct(((rssi + 120) / 60) * 100);
const r10 = (v) => nf0.format(Math.round(v / 10) * 10);
const TANK_COLOURS = ['#7cc0f8', '#3d9cf0', '#1f6fbf', '#a5b4fc', '#5eead4', '#c4b5fd', '#93c5fd', '#38bdf8', '#818cf8', '#2dd4bf'];
const tankColour = (t) => TANK_COLOURS[site.tanks.indexOf(t) % TANK_COLOURS.length];
const pumpName = (t) => `Pump ${t.controller_node ? pad2(t.controller_node - 100) : '–'}`;

function receiverStatus() {
  const gw = site.gateways[0];
  if (!gw) return { key: 'none', text: 'No receiver linked', short: 'No receiver' };
  if (!gw.last_seen_at) return { key: 'offline', text: 'Receiver not connected yet', short: 'Not connected' };
  return ageSeconds(gw.last_seen_at) <= RECEIVER_OFFLINE_SECONDS
    ? { key: 'online', text: 'Receiver online', short: 'Online' }
    : { key: 'offline', text: `Receiver offline since ${when(gw.last_seen_at)}`, short: 'Offline' };
}

// Slim progress bar (used in lists and tables).
const tbar = (pct, _n, label = '') =>
  `<span class="bar" role="img" aria-label="${esc(label || `${Math.round(pct)}%`)}"><i style="width:${clampPct(pct).toFixed(1)}%"></i></span>`;

// Time since a reading, counting up every second.
function hms(iso) {
  const s = Math.max(0, Math.round(ageSeconds(iso)));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${pad2(s % 60)} s ago`;
  return ago(iso);
}

// Which enlarged panel each box opens.
const BOXES = {
  usage: { title: 'Water use · all tanks', open: 'usage' },
  alerts: { title: 'Alerts', open: 'alerts' },
  htanks: { title: 'Tanks', open: 'tanks' },
  pumps: { title: 'Pumps', open: 'pumps' },
  storage: { title: 'Water in storage', open: 'tanks' },
  settings: { title: 'Settings', open: 'settings' },
  tank: { title: '', open: 'level' },
  trend: { title: 'Level history', open: 'chart' },
  info: { title: 'Details', open: 'level' },
  pump: { title: 'Pump', open: 'pump' },
  use: { title: 'Water use', open: 'use' },
  status: { title: 'System', open: 'receiver' },
};

const box = (kind, extraHead = '') => `
  <section class="box box-${kind}" data-box="${kind}" aria-labelledby="bt-${kind}">
    <div class="box-head">
      <h2 class="box-title" id="bt-${kind}">${BOXES[kind].title}</h2>
      ${extraHead}
      <button type="button" class="box-grow" aria-label="Show more" title="Show more">${icon('expand')}</button>
    </div>
    <div class="box-body" id="box-${kind}"></div>
  </section>`;

const rangeButtons = (attr, current) => `<div class="seg" role="group" aria-label="Time range">${Object.entries(RANGES).map(([k, r]) =>
  `<button type="button" ${attr}="${k}" aria-pressed="${k === current}" title="Last ${r.long}">${r.label}</button>`).join('')}</div>`;

function renderShell() {
  document.title = 'Tank Monitor | Kinetiq';
  app.innerHTML = `
  <div class="dash">
    <header class="topbar">
      <a class="brand" href="#/" aria-label="Tank Monitor home">
        <img src="../../assets/img/brand/kinetiq-full-white.webp?v=4" alt="Kinetiq" width="1178" height="400">
        <span>Tank Monitor</span>
      </a>
      <nav class="tank-tabs" id="tank-tabs" aria-label="Pages"></nav>
      <div class="top-right">
        ${source.demo ? '<span class="demo-tag" title="Sample data. Tank 1 is filling and updates every few seconds; Tank 3 shows what an offline tank looks like.">Demo</span>' : ''}
        <span class="top-time"><span id="top-date"></span><span id="top-clock"></span></span>
        <span class="pill" id="receiver-pill"></span>
        <button type="button" class="round-btn" data-open="alerts" aria-label="Alerts" title="Alerts">${icon('bell')}<span class="badge" id="fault-badge" hidden></span></button>
        <button type="button" class="round-btn" data-open="settings" aria-label="Settings" title="Settings">${icon('cog')}</button>
        <button type="button" class="round-btn" id="signout" aria-label="${source.demo ? 'Exit demo' : 'Sign out'}" title="${source.demo ? 'Exit demo' : 'Sign out'}">${icon('out')}</button>
      </div>
    </header>

    <div class="alerts-strip" id="alerts-strip" aria-live="polite"></div>
    <main id="view"></main>
  </div>

  <dialog class="big" id="big" aria-labelledby="big-title">
    <div class="big-head">
      <h2 id="big-title"></h2>
      <button type="button" class="round-btn" id="big-close" aria-label="Close">${icon('close')}</button>
    </div>
    <div class="big-body" id="big-body"></div>
  </dialog>`;

  $('signout').addEventListener('click', signOut);
  document.querySelectorAll('.top-right [data-open]').forEach((b) => b.addEventListener('click', () => openBox(b.dataset.open, b)));
  $('tank-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  // inside a page: buttons act in place; anywhere else on a box enlarges it
  $('view').addEventListener('click', (e) => {
    const r = e.target.closest('[data-range]');
    if (r) {
      range = r.dataset.range;
      document.querySelectorAll('.box-trend [data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === r)));
      renderTrendBox();
      return;
    }
    const ur = e.target.closest('[data-urange]');
    if (ur) {
      useRange = ur.dataset.urange;
      document.querySelectorAll('.box-usage [data-urange]').forEach((x) => x.setAttribute('aria-pressed', String(x === ur)));
      renderUsageBox();
      return;
    }
    const nav = e.target.closest('[data-go]');
    if (nav) { go(nav.dataset.go); return; }
    const act = e.target.closest('[data-open]');
    if (act) { openBox(act.dataset.open, act); return; }
    const b = e.target.closest('.box');
    if (b && BOXES[b.dataset.box]) openBox(BOXES[b.dataset.box].open, b);
  });

  const dlg = $('big');
  $('big-close').addEventListener('click', closeBox);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeBox(); });
  dlg.addEventListener('close', () => {
    openKind = null;
    const back = openFrom?.matches('button') ? openFrom : openFrom?.querySelector('.box-grow');
    back?.focus();
  });

  // redraw charts when their boxes change size
  let resizeT, lastSize = '';
  new ResizeObserver(([entry]) => {
    const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
    if (size === lastSize) return;
    lastSize = size;
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (view === 'home') renderUsageBox(true); else renderTrendBox(true); }, 150);
  }).observe($('view'));

  route();
}

// Go to a page: 'home' or a tank id.
function go(where) {
  const hash = where === 'home' ? '#/' : `#/tank/${encodeURIComponent(where)}`;
  if (location.hash === hash) route();
  else location.hash = hash;
}

function route() {
  if (!site || !$('view')) return;
  const id = decodeURIComponent((location.hash.match(/^#\/tank\/(.+)$/) || [])[1] || '');
  if (tankById(id)) { selected = id; view = 'tank'; } else { view = 'home'; }
  if ($('big')?.open) $('big').close();
  updateTop();
  renderAll();
  scrollTo(0, 0);
}

function selectTank(id) { go(id); }

function renderAll() {
  const v = $('view');
  clearInterval(chartTimer);
  if (!site.tanks.length) {
    v.innerHTML = `<div class="box box-empty"><h1>Waiting for the first reading</h1><p class="muted">Your receiver is linked. Tanks appear here automatically as soon as each tank unit sends its first reading (every 20 seconds).</p></div>`;
    return;
  }
  if (view === 'home') {
    document.title = 'Tank Monitor | Kinetiq';
    v.className = 'home';
    v.innerHTML = `
      ${box('usage', useRangeButtons('data-urange'))}
      ${box('settings')}
      ${box('alerts', '<span class="count" id="alert-count"></span>')}
      ${box('htanks', `<span class="car-count" id="car-count"></span><span class="car-nav"><button type="button" class="nav-btn" id="car-prev" aria-label="Previous tanks">${icon('left')}</button><button type="button" class="nav-btn" id="car-next" aria-label="More tanks">${icon('right')}</button></span>`)}
      ${box('pumps')}
      ${box('storage')}`;
    renderUsageBox();
    renderSettingsBox();
    renderAlertsBox();
    renderHomeTanks();
    renderPumpsBox();
    renderStorageBox();
    chartTimer = setInterval(() => renderUsageBox(true), 60_000);
  } else {
    const t = tankById(selected);
    document.title = `${t.name} | Tank Monitor`;
    v.className = 'tank-page';
    v.innerHTML = `
      <div class="crumbs"><button type="button" class="back" data-go="home">${icon('left')}Home</button><span>/</span><span>${esc(t.name)}</span></div>
      <div class="board">
        ${box('tank')}
        ${box('trend', rangeButtons('data-range', range))}
        ${box('info')}
        ${box('pump')}
        ${box('use')}
        ${box('status')}
      </div>`;
    renderTankBox();
    renderTrendBox();
    renderInfoBox();
    renderPumpBox();
    renderUseBox();
    renderStatusBox();
    chartTimer = setInterval(() => {
      renderTrendBox(true);
      if (openKind === 'chart') renderBig(true);
    }, 60_000);
  }
  renderAlertsStrip();
}

function refreshBoxes(table, row) {
  if (!site.tanks.length) return;
  const mine = view === 'tank' && row.tank_id === selected;
  if (view === 'home') {
    if (table === 'tank_state') { renderHomeTanks(); renderAlertsBox(); renderStorageBox(); }
    if (table === 'pump_state') { renderPumpsBox(); renderAlertsBox(); renderHomeTanks(); renderUsageBox(true); }
    if (table === 'gateways') renderAlertsBox();
  } else {
    if (table === 'tank_state' && mine) { renderTankBox(); renderInfoBox(); renderStatusBox(); }
    if (table === 'pump_state' && mine) { renderPumpBox(); renderUseBox(); renderTrendBox(true); renderTankBox(); }
    if (table === 'gateways') renderStatusBox();
  }
  renderAlertsStrip();
  if (table === 'tank_state' && ['level', 'tanks', 'receiver'].includes(openKind) && (row.tank_id === selected || openKind !== 'level')) renderBig();
  if (table === 'pump_state' && ['pump', 'pumps', 'use', 'tanks', 'activity', 'alerts'].includes(openKind)) renderBig();
  if (table === 'pump_state' && openKind === 'chart' && mine) renderBig(true);
  if (table === 'gateways' && openKind === 'receiver') renderBig();
}

// Every second: clock and the "last reading" counters.
function updateClock() {
  const now = new Date();
  if ($('top-date')) $('top-date').textContent = headDate.format(now);
  if ($('top-clock')) $('top-clock').textContent = clockFmt.format(now);
  document.querySelectorAll('[data-hms]').forEach((el) => { el.textContent = hms(el.dataset.hms); });
}

function updateTop() {
  updateClock();
  const tabs = $('tank-tabs');
  if (tabs) {
    tabs.innerHTML = `<button type="button" class="tank-tab ${view === 'home' ? 'is-on' : ''}" data-go="home" aria-current="${view === 'home' ? 'page' : 'false'}">${icon('grid')}Home</button>
      ${site.tanks.map((t) => {
        const st = stateOf(t.id);
        const on = view === 'tank' && t.id === selected;
        return `<button type="button" class="tank-tab ${on ? 'is-on' : ''}" data-go="${esc(t.id)}" aria-current="${on ? 'page' : 'false'}">
          <span class="dot dot-${tankLight(t)}" aria-hidden="true"></span>${esc(t.name)}
          <span class="tab-pct">${st ? `${nf0.format(st.tank_percent)}%` : '–'}</span></button>`;
      }).join('')}`;
  }
  const pill = $('receiver-pill');
  if (!pill) return;
  const rs = receiverStatus();
  pill.className = `pill pill-${rs.key}`;
  pill.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="pill-text">${esc(rs.text)}</span>`;
  const n = currentAlerts().length;
  const badge = $('fault-badge');
  badge.hidden = !n;
  badge.textContent = n;
}

// ---------------------------------------------------------------------------
// Alerts: problems happening now, worked out from the latest data
// ---------------------------------------------------------------------------

function tankLight(t) {
  const st = stateOf(t.id);
  if (!st) return 'none';
  if (st.sensor_status === 'fault' || pumpOf(t.id)?.state === 'fault') return 'fault';
  const f = freshness(st.last_heard_at).key;
  if (f !== 'live') return f;
  if (t.low_alert_percent != null && st.tank_percent < t.low_alert_percent) return 'delayed';
  if (pumpOf(t.id)?.state === 'running') return 'fill';
  return 'live';
}

function currentAlerts() {
  const list = [];
  const rs = receiverStatus();
  if (rs.key === 'offline') list.push({ level: 'bad', title: rs.text, detail: 'Readings can\'t reach the website until it reconnects. Tanks and pumps keep working as normal.' });
  for (const t of site.tanks) {
    const st = stateOf(t.id);
    const pump = pumpOf(t.id);
    if (pump?.state === 'fault') list.push({ level: 'bad', tank: t, title: `${t.name}: pump stopped by a safety check`, detail: `${when(pump.since)}. The tank wasn't filling as expected. Check the pump, pipes and water supply, then turn the pump controller off and on again to reset it.` });
    if (st?.sensor_status === 'fault') list.push({ level: 'bad', tank: t, title: `${t.name}: level sensor fault`, detail: 'The reading may be wrong, so the tank won\'t ask for water until the sensor reads normally. Check the probe and its cable.' });
    if (st && freshness(st.last_heard_at).key === 'offline') list.push({ level: 'warn', tank: t, title: `${t.name} has stopped reporting`, detail: `Last reading ${ago(st.last_heard_at)}. Check the tank unit.` });
    else if (st && t.low_alert_percent != null && st.tank_percent < t.low_alert_percent) list.push({ level: 'warn', tank: t, title: `${t.name} is low: ${nf0.format(st.tank_percent)}%`, detail: `Below your alert level of ${nf0.format(t.low_alert_percent)}%.` });
  }
  return list.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
}

// Serious problems also show as a strip across the top of every page.
function renderAlertsStrip() {
  const bad = currentAlerts().filter((a) => a.level === 'bad');
  $('alerts-strip').innerHTML = bad.map((a) => `<div class="banner" role="alert">${icon('alert')}<span><strong>${esc(a.title)}.</strong> ${esc(a.detail)}</span></div>`).join('');
}

const alertRow = (a) => `<li class="alert alert-${a.level}" ${a.tank ? `data-go="${esc(a.tank.id)}"` : ''}>
  <span class="alert-ic">${icon(a.level === 'bad' ? 'alert' : a.tank ? 'tanks' : 'wifi')}</span>
  <span class="alert-main"><strong>${esc(a.title)}</strong><span>${esc(a.detail)}</span></span>
</li>`;

async function renderAlertsBox() {
  const el = $('box-alerts');
  if (!el) return;
  const now = currentAlerts();
  $('alert-count').textContent = now.length ? String(now.length) : '';
  $('alert-count').className = `count ${now.some((a) => a.level === 'bad') ? 'count-bad' : now.length ? 'count-warn' : ''}`;
  const recent = (await activityItems()).filter((i) => i.kind === 'fault').slice(0, 3);
  el.innerHTML = `
    ${now.length ? `<ul class="alert-list">${now.map(alertRow).join('')}</ul>`
      : `<div class="all-clear"><span class="alert-ic">${icon('drop')}</span><span><strong>All clear</strong><span>Every tank, pump and the receiver are working normally.</span></span></div>`}
    <p class="sub-h">Recent faults</p>
    ${recent.length ? `<ul class="recent">${recent.map((i) => `<li><span>${esc(i.tank.name)}: ${esc(i.text.toLowerCase())}</span><time>${esc(when(new Date(i.at).toISOString()))}</time></li>`).join('')}</ul>`
      : '<p class="muted small">None in the last 7 days.</p>'}`;
}

// ---------------------------------------------------------------------------
// Home: water use of all tanks (line chart)
// ---------------------------------------------------------------------------

// Periods for the home chart. Short periods show litres per hour or per day;
// long ones show the average litres per day for each week.
const USE_RANGES = {
  '1d': { label: '1D', long: 'day', ms: 86400_000, bucket: 300, bin: 'hour' },
  '1w': { label: '1W', long: 'week', ms: 7 * 86400_000, bucket: 1800, bin: 'day' },
  '1m': { label: '1M', long: 'month', ms: 30 * 86400_000, bucket: 3600, bin: 'day' },
  '3m': { label: '3M', long: '3 months', ms: 91 * 86400_000, bucket: 3600, bin: 'day' },
  '6m': { label: '6M', long: '6 months', ms: 182 * 86400_000, bucket: 3600, bin: 'week' },
  '1y': { label: '1Y', long: 'year', ms: 365 * 86400_000, bucket: 3600, bin: 'week' },
};
const UNIT = { hour: 'L per hour', day: 'L per day', week: 'L per day, weekly average' };

const useRangeButtons = (attr) => `<div class="seg" role="group" aria-label="Period">${Object.entries(USE_RANGES).map(([k, r]) =>
  `<button type="button" ${attr}="${k}" aria-pressed="${k === useRange}" title="Last ${r.long}">${r.label}</button>`).join('')}</div>`;

// Bin edges for a period, oldest first: whole hours, whole days or 7-day weeks ending today.
function useBinsFor(r) {
  const now = Date.now();
  const bins = [];
  if (r.bin === 'hour') {
    for (let t = Math.floor((now - r.ms) / 3600_000 + 1) * 3600_000; t <= now; t += 3600_000) bins.push({ start: t, end: t + 3600_000 });
  } else {
    const days = r.bin === 'day' ? 1 : 7;
    const end = new Date(); end.setHours(24, 0, 0, 0);
    for (let e = end.getTime(); e - days * 86400_000 >= now - r.ms - 86400_000; e -= days * 86400_000) {
      bins.unshift({ start: e - days * 86400_000, end: e });
    }
  }
  return bins;
}

// Water used by one tank in each bin: every fall in level, skipping pump fills.
async function tankUse(t, key) {
  const r = USE_RANGES[key];
  return cached(`use:${t.id}:${key}`, 5 * 60_000, async () => {
    const since = Date.now() - r.ms - 7 * 86400_000;
    const iso = new Date(since).toISOString();
    const [hist, events] = await Promise.all([source.history(t.id, iso, r.bucket), source.pumpEvents(t.id, iso)]);
    return { points: toPoints(hist, r.bucket), runs: pumpRuns(events, since) };
  });
}

async function siteUsage(key) {
  const r = USE_RANGES[key];
  const bins = useBinsFor(r).map((b) => ({ ...b, byTank: [] }));
  const parts = [];
  for (const t of site.tanks) {
    const cap = capacityOf(t);
    if (!cap) continue;
    let d;
    try { d = await tankUse(t, key); } catch { continue; }
    const litres = new Array(bins.length).fill(0);
    const pts = d.points;
    let bi = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (b.t < bins[0].start) continue;
      if (b.t - a.t > 3 * 3600_000 || overlapsRun(d.runs, a.t, b.t, 600_000)) continue;
      const dl = ((b.p - a.p) / 100) * cap;
      if (dl >= 0) continue;
      while (bi < bins.length - 1 && b.t >= bins[bi].end) bi++;
      if (b.t >= bins[bi].start && b.t < bins[bi].end) litres[bi] -= dl;
    }
    parts.push({ t, cap });
    bins.forEach((bin, i) => bin.byTank.push({ t, litres: litres[i] }));
  }
  const perBin = r.bin === 'week' ? 7 : 1;
  for (const b of bins) {
    const span = Math.min(b.end, Date.now()) - b.start;
    const daysCovered = r.bin === 'week' ? Math.max(1, span / 86400_000) : perBin;
    b.total = b.byTank.reduce((s, x) => s + x.litres, 0);
    b.value = r.bin === 'week' ? b.total / daysCovered : b.total;
    b.values = b.byTank.map((x) => (r.bin === 'week' ? x.litres / daysCovered : x.litres));
  }
  const inRange = bins.filter((b) => b.end > Date.now() - r.ms);
  const total = inRange.reduce((s, b) => s + b.total, 0);
  const days = r.ms / 86400_000;
  const peak = inRange.reduce((m, b) => (b.value > (m?.value ?? -1) ? b : m), null);
  return { key, r, bins: inRange, parts, total, perDay: total / days, peak };
}

const binLabel = (r, b, long = false) => {
  const d = new Date(b.start);
  if (r.bin === 'hour') return long ? when(d.toISOString()) : hourFmt.format(d);
  if (r.bin === 'day') return long ? dayFmt.format(d) : r.ms <= 7 * 86400_000 ? weekday.format(d) : shortDay.format(d);
  return long ? `Week of ${shortDay.format(d)}` : shortDay.format(d);
};

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

const kLitres = (v) => (v >= 1000 ? `${nf1.format(v / 1000).replace(/\.0$/, '')}k` : nf0.format(v));

// Smooth line of total use with a soft area, plus a thin line per tank.
function drawUsage(wrap, u, H, full) {
  const W = Math.max(260, wrap.clientWidth);
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const n = u.bins.length;
  const max = Math.max(1, ...u.bins.map((b) => b.value));
  const step = niceStep(max / 4);
  const top = Math.ceil((max * 1.08) / step) * step;
  const x = (i) => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const bottom = H - pad.b;
  const grid = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).map((v) =>
    `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="c-axis" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${kLitres(v)}</text>`).join('');
  const totalPts = u.bins.map((b, i) => [x(i), y(b.value)]);
  const totalPath = smoothPath(totalPts, pad.t, bottom);
  const area = `${totalPath}L${x(n - 1).toFixed(1)},${bottom}L${x(0).toFixed(1)},${bottom}Z`;
  const tankLines = u.parts.length > 1 ? u.parts.map((p, k) =>
    `<path class="u-tank" stroke="${tankColour(p.t)}" d="${smoothPath(u.bins.map((b, i) => [x(i), y(b.values[k])]), pad.t, bottom)}"/>`).join('') : '';
  const every = Math.max(1, Math.ceil(n / (W < 600 ? 5 : full ? 12 : 8)));
  const labels = u.bins.map((b, i) => (i % every || x(i) > W - pad.r - 20 ? '' : `<text class="c-axis" x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(binLabel(u.r, b))}</text>`)).join('');
  wrap.innerHTML = `
    <svg class="chart usage-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Water used by all tanks over the last ${u.r.long}: ${r10(u.total)} litres in total">
      <defs><linearGradient id="u-area-${full ? 'f' : 's'}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="var(--water)" stop-opacity=".35"/><stop offset="1" stop-color="var(--water)" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}
      <path d="${area}" fill="url(#u-area-${full ? 'f' : 's'})"/>
      ${tankLines}
      <path class="c-line" d="${totalPath}"/>
      <line class="c-cursor" x1="0" x2="0" y1="${pad.t}" y2="${bottom}" visibility="hidden"/>
      <g class="u-dots" visibility="hidden">${u.parts.length > 1 ? u.parts.map((p) => `<circle r="3.5" fill="${tankColour(p.t)}"/>`).join('') : ''}<circle class="c-dot" r="5"/></g>
      ${labels}
    </svg>
    <div class="c-tip" hidden></div>`;

  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('.c-tip');
  const cursor = wrap.querySelector('.c-cursor');
  const dots = wrap.querySelector('.u-dots');
  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1))));
    const b = u.bins[i];
    const bx = x(i);
    cursor.setAttribute('x1', bx); cursor.setAttribute('x2', bx); cursor.setAttribute('visibility', 'visible');
    const circles = dots.querySelectorAll('circle');
    u.parts.length > 1 && u.parts.forEach((p, k) => { circles[k].setAttribute('cx', bx); circles[k].setAttribute('cy', y(b.values[k])); });
    const last = circles[circles.length - 1];
    last.setAttribute('cx', bx); last.setAttribute('cy', y(b.value));
    dots.setAttribute('visibility', 'visible');
    tip.innerHTML = `<p class="tip-when">${esc(binLabel(u.r, b, true))}</p>
      <p><strong>${r10(b.value)} L</strong>&nbsp;${u.r.bin === 'week' ? 'a day on average' : u.r.bin === 'hour' ? 'that hour' : 'that day'}</p>
      ${u.parts.length > 1 ? b.byTank.map((p, k) => `<p><i class="sw" style="background:${tankColour(p.t)}"></i>${esc(p.t.name)} ${r10(b.values[k])} L</p>`).join('') : ''}`;
    tip.hidden = false;
    const left = (bx / W) * rect.width;
    tip.style.left = `${left > rect.width / 2 ? left - tip.offsetWidth - 14 : left + 14}px`;
  };
  svg.addEventListener('pointermove', (e) => show(e.clientX));
  svg.addEventListener('pointerdown', (e) => show(e.clientX));
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); dots.setAttribute('visibility', 'hidden'); });
}

const usageStatsHtml = (u) => `
  <div class="stat-main"><span class="stat-v">${r10(u.total)}<small> L</small></span><span class="stat-l">used in the last ${u.r.long}</span></div>
  <div><span class="stat-l">Average</span><span class="stat-s">${r10(u.perDay)} L a day</span></div>
  ${u.peak ? `<div><span class="stat-l">Busiest ${u.r.bin}</span><span class="stat-s">${r10(u.peak.value)} L <span class="muted">· ${esc(binLabel(u.r, u.peak, false))}</span></span></div>` : ''}`;

const usageLegendHtml = (u) => `${u.parts.length > 1 ? `<span><i class="sw sw-line"></i>All tanks</span>${u.parts.map((p) => `<span><i class="sw sw-thin" style="background:${tankColour(p.t)}"></i>${esc(p.t.name)}</span>`).join('')}` : ''}<span class="muted">${UNIT[u.r.bin]} · pump fills not counted</span>`;

async function renderUsageBox(quiet = false) {
  const el = $('box-usage');
  if (!el) return;
  if (!$('usage-chart')) el.innerHTML = '<div class="usage-stats" id="usage-stats"></div><div class="chart-wrap" id="usage-chart"></div><div class="legend" id="usage-legend"></div>';
  const wrap = $('usage-chart');
  if (!quiet) wrap.innerHTML = '<div class="chart-empty"><span class="spinner" aria-hidden="true"></span></div>';
  const key = useRange;
  const u = await siteUsage(key);
  if (key !== useRange || !wrap.isConnected) return;
  if (!u.parts.length) { wrap.innerHTML = '<p class="chart-empty">Set each tank\'s size in Settings to see water use.</p>'; return; }
  $('usage-stats').innerHTML = usageStatsHtml(u);
  $('usage-legend').innerHTML = usageLegendHtml(u);
  drawUsage(wrap, u, FIT.matches ? Math.max(140, wrap.clientHeight) : 240, false);
}

// ---------------------------------------------------------------------------
// Home: tanks (swipeable), pumps, storage, settings
// ---------------------------------------------------------------------------

function tankCardInner(t) {
  const st = stateOf(t.id);
  const cap = capacityOf(t);
  const light = tankLight(t);
  const pump = pumpOf(t.id);
  const label = { fault: 'Fault', offline: 'Offline', delayed: freshness(st?.last_heard_at).key === 'delayed' ? 'Delayed' : 'Low', fill: 'Filling', live: 'Live', none: 'No reading' }[light];
  const pumpLine = t.controller_node
    ? `${pumpName(t)} · ${pumpSummary(pump).label}`
    : 'No pump';
  return `
    <span class="tcard-top"><span class="tcard-name">${esc(t.name)}</span><span class="tag tag-${light}"><span class="dot dot-${light}" aria-hidden="true"></span>${label}</span></span>
    <span class="tcard-art">${tankSvg(t, st, { labels: false })}</span>
    <span class="tcard-pct">${st ? nf0.format(st.tank_percent) : '–'}<small>%</small></span>
    <span class="tcard-l">${st ? `${nf0.format(st.tank_volume_l)} L` : 'No reading yet'}${cap ? ` <span class="muted">of ${nf0.format(cap)} L</span>` : ''}</span>
    <span class="tcard-foot"><span>${esc(pumpLine)}</span><span class="tcard-go">${icon('right')}</span></span>`;
}

function renderHomeTanks() {
  const el = $('box-htanks');
  if (!el) return;
  const track = el.querySelector('.carousel');
  if (track && track.children.length === site.tanks.length) {
    // update in place so a swipe in progress isn't lost
    site.tanks.forEach((t, i) => { track.children[i].innerHTML = tankCardInner(t); });
    return;
  }
  el.innerHTML = `
    <div class="carousel-wrap">
      <div class="carousel" id="carousel" tabindex="0" aria-label="Tanks, swipe for more">${site.tanks.map((t) =>
        `<button type="button" class="tcard" data-go="${esc(t.id)}" aria-label="${esc(t.name)}. Open tank page">${tankCardInner(t)}</button>`).join('')}</div>
    </div>
    <div class="dots" id="car-dots" aria-hidden="true">${site.tanks.map(() => '<i></i>').join('')}</div>`;
  setupCarousel();
}

// Arrows, page counter and dots for the tank carousel; mouse users can drag it too.
function setupCarousel() {
  const track = $('carousel');
  const wrap = track.closest('.carousel-wrap');
  const prev = $('car-prev'), next = $('car-next'), count = $('car-count');
  const cards = [...track.children];
  const visible = () => Math.max(1, Math.round(track.clientWidth / (cards[0].offsetWidth + 12)));
  const first = () => Math.round(track.scrollLeft / (cards[0].offsetWidth + 12));
  const update = () => {
    const v = visible(), f = first(), n = cards.length;
    const more = n > v;
    track.closest('.box').classList.toggle('has-more', more);
    if (count) count.textContent = more ? `${f + 1}–${Math.min(n, f + v)} of ${n}` : `${n} tank${n === 1 ? '' : 's'}`;
    if (prev) prev.disabled = f <= 0;
    if (next) next.disabled = f + v >= n;
    wrap.classList.toggle('fade-r', more && f + v < n);
    wrap.classList.toggle('fade-l', more && f > 0);
    [...$('car-dots').children].forEach((d, i) => d.classList.toggle('on', i >= f && i < f + v));
  };
  const page = (dir) => track.scrollBy({ left: dir * (cards[0].offsetWidth + 12), behavior: reduceMotion ? 'auto' : 'smooth' });
  prev.onclick = (e) => { e.stopPropagation(); page(-1); };
  next.onclick = (e) => { e.stopPropagation(); page(1); };
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  new ResizeObserver(update).observe(track);

  // drag to swipe with a mouse (touch screens swipe natively)
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5 && !drag.moved) { drag.moved = true; track.classList.add('dragging'); }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    track.classList.remove('dragging');
    if (moved) {
      // a drag is not a click on the card under the pointer
      track.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
      page(0);
    }
  });
  update();
}

// When each pump ran over the last 24 hours, as a strip.
function runStrip(runs) {
  const now = Date.now(), from = now - 86400_000;
  const segs = runs.filter((r) => (r.end ?? now) > from).map((r) => {
    const a = Math.max(r.start, from), b = r.end ?? now;
    return `<i class="${r.end == null ? 'live' : r.endState === 'fault' ? 'fault' : ''}" style="left:${(((a - from) / 86400_000) * 100).toFixed(2)}%;width:${Math.max(0.6, ((b - a) / 86400_000) * 100).toFixed(2)}%"></i>`;
  }).join('');
  return `<span class="strip" role="img" aria-label="Pump run times over the last 24 hours">${segs}</span>`;
}

async function renderPumpsBox() {
  const el = $('box-pumps');
  if (!el) return;
  const withPump = site.tanks.filter((t) => t.controller_node || pumpOf(t.id));
  if (!withPump.length) { el.innerHTML = '<p class="muted">No pump controllers linked.</p>'; return; }
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const info = [];
  for (const t of withPump) {
    let runs = [];
    try { runs = (await weekData(t)).runs; } catch { /* show what we have */ }
    const today = runs.reduce((s, r) => {
      const a = Math.max(r.start, midnight.getTime()), b = r.end ?? Date.now();
      return b > a ? s + (b - a) : s;
    }, 0);
    info.push({ t, runs, today, p: pumpSummary(pumpOf(t.id)) });
  }
  if (!$('box-pumps')) return;
  const running = info.filter((x) => x.p.state === 'running').length;
  const faults = info.filter((x) => x.p.state === 'fault').length;
  el.innerHTML = `
    <div class="pump-sum">
      <span><strong class="${running ? 'st-running' : ''}">${running} of ${info.length}</strong> running</span>
      <span><strong>${esc(duration(info.reduce((s, x) => s + x.today, 0)))}</strong> today</span>
      ${faults ? `<span><strong class="st-fault">${faults}</strong> safety stop${faults === 1 ? '' : 's'}</span>` : `<span><strong>${info.reduce((s, x) => s + x.runs.length, 0)}</strong> fills · 7 days</span>`}
    </div>
    <ul class="pump-list">${info.map(({ t, runs, today, p }) => `
      <li><button type="button" class="pump-row pump-row-${p.state}" data-go="${esc(t.id)}">
        <span class="pr-top">
          ${pumpSvg(p.state)}
          <span class="pr-main"><span class="pr-name">${pumpName(t)}<span class="muted"> · ${esc(t.name)}</span></span><span class="pr-sub">${esc(p.sub)}${today >= 60_000 && p.state !== 'running' ? ` · ran ${esc(duration(today))} today` : ''}</span></span>
          <span class="pr-state st-${p.state}">${p.label}</span>
        </span>
        ${runStrip(runs)}
      </button></li>`).join('')}</ul>
    <p class="strip-note">Bars show when each pump ran in the last 24 hours</p>`;
}

// Arc gauge of all the water stored on the farm.
function storageRing(pct) {
  const cx = 70, cy = 70, R = 58, start = 135, sweep = 270;
  const pt = (deg) => [cx + R * Math.cos((deg * Math.PI) / 180), cy + R * Math.sin((deg * Math.PI) / 180)];
  const arc = (from, to) => {
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };
  const end = start + (sweep * clampPct(pct)) / 100;
  const [ex, ey] = pt(end);
  return `<svg class="ring" viewBox="0 0 140 130" role="img" aria-label="${nf0.format(pct)}% of all storage full">
    <defs><linearGradient id="ring-g" x1="0" x2="1" y1="1" y2="0"><stop offset="0" class="gg0"/><stop offset="1" class="gg1"/></linearGradient></defs>
    <path class="g-track" d="${arc(start, start + sweep)}"/>
    ${pct > 0 ? `<path class="g-fill" d="${arc(start, end)}" stroke="url(#ring-g)"/><circle class="g-end" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5"/>` : ''}
    <text class="ring-v" x="${cx}" y="${cy + 6}" text-anchor="middle">${nf0.format(pct)}<tspan class="ring-u" dx="1">%</tspan></text>
    <text class="ring-l" x="${cx}" y="${cy + 26}" text-anchor="middle">full</text>
  </svg>`;
}

async function renderStorageBox() {
  const el = $('box-storage');
  if (!el) return;
  const stored = site.tanks.reduce((s, t) => s + (stateOf(t.id)?.tank_volume_l ?? 0), 0);
  const capacity = site.tanks.reduce((s, t) => s + (capacityOf(t) ?? 0), 0);
  let perDay = 0, enough = true;
  for (const t of site.tanks) {
    const cap = capacityOf(t);
    if (!cap) continue;
    try {
      const w = await weekData(t);
      const s = usageStats(w.points, w.runs, cap, stateOf(t.id)?.tank_volume_l);
      if (s.enough) perDay += s.perDay; else enough = false;
    } catch { enough = false; }
  }
  if (!$('box-storage')) return;
  const lasts = enough && perDay > 1 ? stored / perDay : null;
  el.innerHTML = `
    <div class="store">
      ${storageRing(capacity ? (stored / capacity) * 100 : 0)}
      <div class="store-read">
        <p class="mid-num">${r10(stored)}<small> L</small></p>
        <p class="muted small">of ${r10(capacity)} L across ${site.tanks.length} tanks</p>
        <p class="store-days"><span class="stat-l">Lasts about</span><span class="stat-s">${lasts == null ? '–' : lasts > 60 ? '60+ days' : `${Math.floor(lasts)} days`}</span></p>
      </div>
    </div>
    <div class="store-bar" role="img" aria-label="Water in each tank">${site.tanks.map((t) => {
      const v = stateOf(t.id)?.tank_volume_l ?? 0;
      return capacity ? `<i style="width:${((v / capacity) * 100).toFixed(2)}%;background:${tankColour(t)}" title="${esc(t.name)}: ${nf0.format(v)} L"></i>` : '';
    }).join('')}</div>
    <div class="legend">${site.tanks.map((t) => `<span><i class="sw" style="background:${tankColour(t)}"></i>${esc(t.name)}</span>`).join('')}</div>`;
}

function renderSettingsBox() {
  const el = $('box-settings');
  if (!el) return;
  const lows = [...new Set(site.tanks.map((t) => t.low_alert_percent))];
  const fills = [...new Set(site.tanks.filter((t) => t.fill_start_percent != null).map((t) => `${nf0.format(t.fill_start_percent)}→${nf0.format(t.fill_stop_percent)}%`))];
  el.innerHTML = `
    <div class="set-chips">
      <span class="set-chip"><span class="stat-l">Low alert</span><span class="stat-s">${lows.length === 1 ? (lows[0] == null ? 'Off' : `${nf0.format(lows[0])}%`) : 'Per tank'}</span></span>
      <span class="set-chip"><span class="stat-l">Auto-fill</span><span class="stat-s">${fills.length === 1 ? fills[0] : fills.length ? 'Per pump' : '–'}</span></span>
      <span class="set-chip"><span class="stat-l">Tanks</span><span class="stat-s">${site.tanks.length}</span></span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Tank page boxes
// ---------------------------------------------------------------------------

const rows = (list) => `<dl class="rows">${list.filter(Boolean).map(([k, v, cls = '']) => `<div><dt>${k}</dt><dd class="${cls}">${v}</dd></div>`).join('')}</dl>`;

function tankHeight(t, st) {
  if (t.height_m) return t.height_m;
  if (st && st.tank_percent > 1) return st.water_height_m / (st.tank_percent / 100);
  return null;
}

// A 3D tank: translucent shell, shaded water with a lit surface, and the
// pump start/stop levels marked on the side.
let tankSvgId = 0;
function tankSvg(t, st, { labels = true } = {}) {
  const id = `tk${++tankSvgId}`;
  const pct = st ? clampPct(st.tank_percent) : 0;
  const cx = 100, rx = 72, ry = 17, top = 34, bot = 214;
  const L = cx - rx, R = cx + rx;
  const y = (p) => bot - (p / 100) * (bot - top);
  const yw = y(pct);
  const stale = freshness(st?.last_heard_at).key === 'offline';
  const marks = labels && t.fill_start_percent != null ? [[t.fill_start_percent, 'Start'], [t.fill_stop_percent, 'Stop']].map(([p, label]) => `
      <line class="tk-mark" x1="${R + 6}" x2="${R + 16}" y1="${y(p)}" y2="${y(p)}"/>
      <text class="tk-mark-t" x="${R + 22}" y="${y(p) + 4}">${label} ${nf0.format(p)}%</text>`).join('') : '';
  return `<svg class="tank3d ${stale ? 'is-stale' : ''}" viewBox="0 0 ${labels ? 270 : 200} 250" role="img" aria-label="${st ? `${nf1.format(pct)}% full` : 'No reading yet'}">
    <defs>
      <linearGradient id="${id}-shell" x1="0" x2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".25" stop-color="#fff" stop-opacity=".13"/>
        <stop offset=".6" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".09"/>
      </linearGradient>
      <linearGradient id="${id}-water" x1="0" x2="1">
        <stop offset="0" class="w0"/><stop offset=".3" class="w1"/><stop offset=".7" class="w2"/><stop offset="1" class="w3"/>
      </linearGradient>
      <radialGradient id="${id}-surf" cx=".4" cy=".4" r=".8">
        <stop offset="0" class="s0"/><stop offset="1" class="s1"/>
      </radialGradient>
      <linearGradient id="${id}-shine" x1="0" x2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <ellipse class="tk-shadow" cx="${cx}" cy="${bot + 14}" rx="${rx + 10}" ry="${ry - 4}"/>
    <path class="tk-back" d="M${L},${top} V${bot} A${rx},${ry} 0 0 0 ${R},${bot} V${top} Z" fill="url(#${id}-shell)"/>
    <ellipse class="tk-rim-back" cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}"/>
    ${pct > 0 ? `
    <path class="tk-water" d="M${L},${yw} V${bot} A${rx},${ry} 0 0 0 ${R},${bot} V${yw} Z" fill="url(#${id}-water)"/>
    <ellipse class="tk-surface" cx="${cx}" cy="${yw}" rx="${rx}" ry="${ry}" fill="url(#${id}-surf)"/>
    <ellipse class="tk-surface-edge" cx="${cx}" cy="${yw}" rx="${rx}" ry="${ry}"/>` : ''}
    <rect x="${L + 14}" y="${top + 6}" width="16" height="${bot - top}" fill="url(#${id}-shine)"/>
    <path class="tk-outline" d="M${L},${top} V${bot} A${rx},${ry} 0 0 0 ${R},${bot} V${top}"/>
    <ellipse class="tk-rim" cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}"/>
    <ellipse class="tk-lid" cx="${cx}" cy="${top - 2}" rx="22" ry="5"/>
    ${marks}
  </svg>`;
}

function renderTankBox() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const cap = capacityOf(t);
  const f = freshness(st?.last_heard_at);
  const pump = pumpOf(t.id);
  $('bt-tank').textContent = t.name;
  $('box-tank').innerHTML = `
    <div class="tank-hero">
      <div class="tank-art">${tankSvg(t, st)}</div>
      <div class="tank-read">
        <p class="eyebrow">Level</p>
        <p class="hero-num">${st ? nf1.format(st.tank_percent) : '–'}<small>%</small></p>
        <p class="hero-sub">${st ? `<strong>${nf0.format(st.tank_volume_l)} L</strong>${cap ? ` of ${nf0.format(cap)} L` : ''}` : 'No reading yet'}</p>
        <div class="chips">
          <span class="chip chip-${f.key}"><span class="dot dot-${f.key}" aria-hidden="true"></span>${f.label}</span>
          ${pump?.state === 'running' ? '<span class="chip chip-fill"><span class="dot dot-fill" aria-hidden="true"></span>Filling</span>' : ''}
          ${pump?.state === 'fault' ? '<span class="chip chip-fault"><span class="dot dot-offline" aria-hidden="true"></span>Pump stopped</span>' : ''}
        </div>
        ${rows([
          ['Depth', st ? `${nf2.format(st.water_height_m)} m` : '–'],
          ['Last reading', st ? `<span data-hms="${esc(st.last_heard_at)}">${hms(st.last_heard_at)}</span>` : '–'],
        ])}
      </div>
    </div>`;
}

async function renderTrendBox(quiet = false) {
  if (view !== 'tank') return;
  const el = $('box-trend');
  if (!el) return;
  if (!$('trend-chart')) el.innerHTML = '<div class="trend-stats" id="trend-stats"></div><div class="chart-wrap" id="trend-chart"></div>';
  const t = tankById(selected);
  const res = await drawChart($('trend-chart'), t, range, false, quiet);
  const stats = $('trend-stats');
  if (!res || !stats || selected !== t.id) return;
  const runTime = res.runs.reduce((s, r) => s + ((r.end ?? Date.now()) - r.start), 0);
  const change = res.last - res.first;
  stats.innerHTML = `
    <div class="stat-main"><span class="stat-v">${nf1.format(res.last)}%</span><span class="delta ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${nf1.format(Math.abs(change))}%</span></div>
    <div><span class="stat-l">Low</span><span class="stat-s">${nf1.format(res.lo)}%</span></div>
    <div><span class="stat-l">High</span><span class="stat-s">${nf1.format(res.hi)}%</span></div>
    <div><span class="stat-l">Pump ran</span><span class="stat-s">${res.runs.length ? `${res.runs.length}× · ${duration(runTime)}` : 'Not at all'}</span></div>`;
}

async function renderInfoBox() {
  const el = $('box-info');
  if (!el) return;
  const t = tankById(selected);
  const st = stateOf(t.id);
  const cap = capacityOf(t);
  const H = tankHeight(t, st);
  const draw = (days) => {
    el.innerHTML = rows([
      ['Capacity', cap ? `${nf0.format(cap)} L` : 'Not set'],
      ['Tank height', H ? `${nf2.format(H)} m` : '–'],
      ['Lasts about', esc(days)],
      ['Low-level alert', t.low_alert_percent == null ? 'Off' : `Below ${nf0.format(t.low_alert_percent)}%`],
      ['Tank unit', `Node ${pad2(t.tank_node)}`],
      ['Route', st?.hop_count ? `Relayed ${st.hop_count}×` : st ? 'Direct to receiver' : '–'],
    ]);
  };
  draw('…');
  try {
    const w = await weekData(t);
    if (selected === t.id && $('box-info')) draw(daysLeftText(cap && st ? usageStats(w.points, w.runs, cap, st.tank_volume_l) : null));
  } catch { draw('–'); }
}

function pumpSummary(pump) {
  const state = pump?.state ?? 'unknown';
  const label = { running: 'Running', stopped: 'Off', fault: 'Safety stop', unknown: 'No report' }[state];
  let sub = 'No report from the controller yet';
  if (state === 'running') sub = `${duration(Date.now() - Date.parse(pump.since))} so far`;
  else if (pump) sub = `Since ${when(pump.since)}`;
  return { state, label, sub };
}

// Round pump badge; the impeller turns while the pump runs.
const pumpSvg = (state) => `<span class="pump-badge pump-${state}" aria-hidden="true">
  <svg viewBox="0 0 48 48"><circle class="pb-ring" cx="24" cy="24" r="21"/>
  <g class="pb-imp"><path d="M24 24c0-7 3-11 7-11-1 5-3 8-7 11zM24 24c6 3.5 8 8 6 11.5-3.6-3.4-5-6.8-6-11.5zM24 24c-6 3.5-10.6 3-12.6-.5 4.8-1.4 8.4-1 12.6.5z"/><circle cx="24" cy="24" r="3"/></g></svg>
</span>`;

async function renderPumpBox() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const p = pumpSummary(pumpOf(t.id));
  let runs = [];
  try { runs = (await weekData(t)).runs; } catch { /* show what we have */ }
  if (selected !== t.id || !$('box-pump')) return;
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const todayMs = runs.reduce((s, r) => {
    const a = Math.max(r.start, midnight.getTime()), b = r.end ?? Date.now();
    return b > a ? s + (b - a) : s;
  }, 0);
  const hasBand = t.fill_start_percent != null;
  if (!t.controller_node && !pumpOf(t.id)) {
    $('bt-pump').textContent = 'Pump';
    $('box-pump').innerHTML = `<div class="pump-top">${pumpSvg('unknown')}<div><p class="pump-state-t">No pump</p><p class="pump-sub">This tank isn't filled by a Kinetiq pump controller.</p></div></div>`;
    return;
  }
  $('bt-pump').textContent = pumpName(t);
  $('box-pump').innerHTML = `
    <div class="pump-top">
      ${pumpSvg(p.state)}
      <div><p class="pump-state-t st-${p.state}">${p.label}</p><p class="pump-sub">${esc(p.sub)}</p></div>
    </div>
    ${hasBand ? `<div class="band" role="img" aria-label="Automatic filling starts at ${t.fill_start_percent}% and stops at ${t.fill_stop_percent}%; level now ${st ? nf0.format(st.tank_percent) : 'unknown'}%">
      <div class="band-track"><i class="band-zone" style="left:${t.fill_start_percent}%;width:${t.fill_stop_percent - t.fill_start_percent}%"></i>${st ? `<b class="band-now" style="left:${clampPct(st.tank_percent)}%"></b>` : ''}</div>
      <div class="band-labels"><span>Auto fill</span><span>${nf0.format(t.fill_start_percent)}% → ${nf0.format(t.fill_stop_percent)}%</span></div>
    </div>` : ''}
    <div class="mini-stats">
      <div><span class="stat-l">Run today</span><span class="stat-s">${esc(duration(todayMs))}</span></div>
      <div><span class="stat-l">Fills · 7 days</span><span class="stat-s">${runs.length}</span></div>
    </div>`;
}

function useSummary(t, w, cap) {
  const st = stateOf(t.id);
  const stats = usageStats(w.points, w.runs, cap, st?.tank_volume_l);
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const hours = useBins(w.points, w.runs, cap, 3600_000, midnight.getTime());
  const today = hours.reduce((s, b) => s + b.litres, 0);
  const days = useBins(w.points, w.runs, cap, 86400_000, Date.now() - 6 * 86400_000);
  return { stats, hours, today, days, midnight: midnight.getTime() };
}

async function renderUseBox() {
  const t = tankById(selected);
  const el = $('box-use');
  if (!el) return;
  const cap = capacityOf(t);
  if (!cap) { el.innerHTML = '<p class="muted">Set the tank size in Settings to see water use.</p>'; return; }
  try {
    const w = await weekData(t);
    if (selected !== t.id || !$('box-use')) return;
    const u = useSummary(t, w, cap);
    const nowH = new Date().getHours();
    const maxH = Math.max(1, ...u.hours.map((b) => b.litres));
    el.innerHTML = `
      <p class="eyebrow">Today</p>
      <p class="mid-num">${r10(u.today)}<small> L</small></p>
      <div class="hour-mini" role="img" aria-label="Water used each hour today">
        ${Array.from({ length: 24 }, (_, h) => {
          const v = u.hours[h]?.litres;
          return `<i class="${h === nowH ? 'now' : ''}${v == null ? ' future' : ''}" style="height:${v == null ? 8 : Math.max(8, (v / maxH) * 100)}%"></i>`;
        }).join('')}
      </div>
      <div class="mini-stats">
        <div><span class="stat-l">Daily average</span><span class="stat-s">${u.stats.enough ? `${r10(u.stats.perDay)} L` : '–'}</span></div>
        <div><span class="stat-l">Lasts about</span><span class="stat-s">${esc(daysLeftText(stateOf(t.id) ? usageStats(w.points, w.runs, cap, stateOf(t.id).tank_volume_l) : null))}</span></div>
      </div>`;
  } catch {
    el.innerHTML = '<p class="muted">Water use is unavailable right now.</p>';
  }
}

function renderStatusBox() {
  const el = $('box-status');
  if (!el) return;
  const t = tankById(selected);
  const st = stateOf(t.id);
  const f = freshness(st?.last_heard_at);
  const rs = receiverStatus();
  const pump = pumpOf(t.id);
  const gw = site.gateways[0];
  const tile = (ic, label, key, text) => `<div class="dev dev-${key}"><span class="dev-ic">${icon(ic)}</span><span class="dev-l">${label}</span><span class="dev-s">${text}</span></div>`;
  const ok = (good, bad) => (good ? 'ok' : bad ? 'bad' : 'idle');
  el.innerHTML = `
    <div class="devs">
      ${tile('tanks', 'Tank unit', f.key === 'live' ? 'ok' : f.key === 'delayed' ? 'warn' : f.key === 'offline' ? 'bad' : 'idle', f.key === 'live' ? 'Online' : f.label)}
      ${tile('drop', 'Level sensor', ok(st?.sensor_status === 'ok', st?.sensor_status === 'fault'), st?.sensor_status === 'fault' ? 'Fault' : st?.sensor_status === 'ok' ? 'OK' : 'Not reported')}
      ${tile('pump', 'Controller', ok(pump && pump.state !== 'fault', pump?.state === 'fault'), pump?.state === 'fault' ? 'Safety stop' : pump ? 'Reporting' : t.controller_node ? 'No report' : 'None')}
      ${tile('receiver', 'Receiver', ok(rs.key === 'online', rs.key === 'offline'), rs.short)}
    </div>
    <div class="sig">
      <div class="sig-row"><span class="stat-l">Radio signal</span><span class="stat-s">${st?.lora_rssi != null ? `${st.lora_rssi} dBm` : '–'}</span></div>
      ${tbar(rssiPct(st?.lora_rssi), 0, st?.lora_rssi != null ? `${st.lora_rssi} dBm` : 'unknown')}
      <div class="sig-row"><span class="stat-l">Wi-Fi</span><span class="stat-s">${gw?.wifi_rssi != null ? `${gw.wifi_rssi} dBm` : '–'}</span></div>
      ${tbar(gw?.wifi_rssi != null ? clampPct(((gw.wifi_rssi + 90) / 50) * 100) : 0, 0, gw?.wifi_rssi != null ? `${gw.wifi_rssi} dBm` : 'unknown')}
    </div>`;
}

async function activityItems() {
  const items = [];
  for (const t of site.tanks) {
    let w;
    try { w = await weekData(t); } catch { continue; }
    for (const r of w.runs) {
      if (r.end == null) items.push({ at: r.start, tank: t, kind: 'running', text: 'Pump started filling', detail: `${duration(Date.now() - r.start)} so far` });
      else if (r.endState === 'fault') items.push({ at: r.end, tank: t, kind: 'fault', text: 'Pump stopped by safety check', detail: `after ${duration(r.end - r.start)}` });
      else items.push({ at: r.end, tank: t, kind: 'done', text: 'Fill finished', detail: `pump ran ${duration(r.end - r.start)}` });
    }
    const st = stateOf(t.id);
    if (st?.sensor_status === 'fault') items.push({ at: Date.parse(st.last_heard_at), tank: t, kind: 'fault', text: 'Level sensor fault', detail: 'check the probe and cable' });
    if (st && freshness(st.last_heard_at).key === 'offline') items.push({ at: Date.parse(st.last_heard_at), tank: t, kind: 'offline', text: 'Tank unit stopped reporting', detail: 'last reading shown' });
  }
  return items.sort((a, b) => b.at - a.at);
}

const actIcon = (kind) => `<span class="act-icon">${icon(kind === 'fault' || kind === 'offline' ? 'alert' : 'pump')}</span>`;

// ---------------------------------------------------------------------------
// Chart (on the tank page, and full size when enlarged)
// ---------------------------------------------------------------------------

// Smooth curve through points (Catmull-Rom as cubic Béziers), kept inside lo..hi.
function smoothPath(p, lo, hi) {
  if (p.length < 3) return p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const c = (v) => Math.max(lo, Math.min(hi, v));
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, c(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, c(p2[1] - (p3[1] - p1[1]) / 6)];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

async function drawChart(wrap, t, key, full, quiet = false) {
  if (!wrap) return null;
  if (!quiet) wrap.innerHTML = '<div class="chart-empty"><span class="spinner" aria-hidden="true"></span></div>';
  let d;
  try { d = await rangeData(t, key, quiet); } catch (err) {
    wrap.innerHTML = `<p class="chart-empty">Couldn't load the chart: ${esc(err.message)}</p>`;
    return null;
  }
  if (selected !== t.id || !wrap.isConnected || key !== range) return null;
  const r = RANGES[key];
  const pts = d.points;
  if (!pts.length) {
    wrap.innerHTML = `<p class="chart-empty">No readings in the last ${r.long}.</p>`;
    return null;
  }

  const st = stateOf(t.id);
  const cap = capacityOf(t);
  const live = st && freshness(st.last_heard_at).key !== 'offline';
  const first = pts[0].p;
  const last = live ? st.tank_percent : pts.at(-1).p;
  const lo = Math.min(...pts.map((p) => p.p)), hi = Math.max(...pts.map((p) => p.p));
  const bins = full && cap ? useBins(pts, d.runs, cap, r.bin, d.since) : [];

  const now = Date.now(), since = d.since;
  const W = Math.max(260, wrap.clientWidth);
  const small = W < 600;
  const H = full ? (small ? 260 : 360) : Math.max(110, FIT.matches ? wrap.clientHeight : 190);
  const barH = bins.length ? (small ? 44 : 64) : 0;
  const pad = full ? { l: 44, r: 14, t: 14, b: 26 } : { l: 36, r: 6, t: 8, b: 22 };
  const lineBottom = H - pad.b - (barH ? barH + 14 : 0);
  const x = (ms) => pad.l + ((ms - since) / (now - since)) * (W - pad.l - pad.r);
  const y = (p) => pad.t + (1 - p / 100) * (lineBottom - pad.t);

  const gap = r.bucket * 1000 * 2.5;
  const drawn = live ? [...pts, { t: now, p: st.tank_percent }] : pts;
  // split into runs of readings with no long gaps, then draw each smoothly
  const segs = [];
  let prev = null;
  for (const pt of drawn) {
    if (!prev || pt.t - prev.t > gap) segs.push([]);
    segs.at(-1).push([x(pt.t), y(pt.p)]);
    prev = pt;
  }
  let line = '', area = '';
  for (const seg of segs) {
    const path = smoothPath(seg, pad.t, lineBottom);
    line += path;
    area += `${path}L${seg.at(-1)[0].toFixed(1)},${lineBottom}L${seg[0][0].toFixed(1)},${lineBottom}Z`;
  }

  const bands = d.runs.map((run) => {
    const x1 = x(run.start), x2 = x(run.end ?? now);
    return `<rect class="c-run" x="${x1.toFixed(1)}" y="${pad.t}" width="${Math.max(2, x2 - x1).toFixed(1)}" height="${(lineBottom - pad.t).toFixed(1)}" rx="3"/>`;
  }).join('');
  const grid = (full ? [0, 25, 50, 75, 100] : [0, 50, 100]).map((p) =>
    `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/><text class="c-axis" x="${pad.l - 8}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`).join('');
  const thresholds = full && t.fill_start_percent != null
    ? [t.fill_start_percent, t.fill_stop_percent].map((p) => `<line class="c-threshold" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/>`).join('') : '';

  const maxUse = Math.max(1, ...bins.map((b) => b.litres));
  const barW = Math.max(2, (x(Math.min(now, since + r.bin)) - x(since)) * 0.62);
  const barsTop = lineBottom + 14;
  const bars = bins.map((b) => {
    const mid = x(Math.max(since, b.t) + Math.min(r.bin, now - Math.max(since, b.t)) / 2);
    const h = (b.litres / maxUse) * barH;
    return `<rect class="c-bar" x="${(mid - barW / 2).toFixed(1)}" y="${(barsTop + barH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, b.litres > 0 ? 1.5 : 0).toFixed(1)}" rx="1.5"/>`;
  }).join('');

  const ticks = [];
  if (r.ms <= 86400_000) {
    const every = full ? (small ? 6 : 3) : (W < 420 ? 12 : 6);
    const f0 = new Date(since); f0.setMinutes(0, 0, 0); f0.setHours(f0.getHours() + 1);
    for (let tt = f0.getTime(); tt < now; tt += 3600_000) if (new Date(tt).getHours() % every === 0) ticks.push([tt, timeFmt.format(new Date(tt))]);
  } else {
    const step = r.ms <= 7 * 86400_000 ? 1 : (small ? 7 : 4);
    const f0 = new Date(since); f0.setHours(0, 0, 0, 0); f0.setDate(f0.getDate() + 1);
    for (let tt = f0.getTime(), i = 0; tt < now; tt += 86400_000, i++) if (i % step === 0) ticks.push([tt, step === 1 ? weekday.format(new Date(tt)) : shortDay.format(new Date(tt))]);
  }
  const xTicks = ticks.filter(([tt]) => x(tt) > pad.l + 16 && x(tt) < W - pad.r - 26).map(([tt, label]) => `<text class="c-axis" x="${x(tt).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(label)}</text>`).join('');

  wrap.innerHTML = `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
         aria-label="${esc(t.name)} over the last ${r.long}: from ${nf0.format(first)}% to ${nf0.format(last)}%, lowest ${nf0.format(lo)}%, highest ${nf0.format(hi)}%.">
      <defs>
        <linearGradient id="g-area-${full ? 'f' : 's'}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--water)" stop-opacity=".38"/>
          <stop offset="100%" stop-color="var(--water)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grid}${bands}${thresholds}
      <path class="c-area" d="${area}" fill="url(#g-area-${full ? 'f' : 's'})"/>
      <path class="c-line" d="${line}"/>
      ${bars}
      ${full ? `<line class="c-cursor" x1="0" x2="0" y1="${pad.t}" y2="${barH ? barsTop + barH : lineBottom}" visibility="hidden"/>
      <circle class="c-dot" r="5" cx="0" cy="0" visibility="hidden"/>` : ''}
      ${xTicks}
    </svg>
    ${full ? '<div class="c-tip" hidden></div>' : ''}`;

  const result = { first, last, lo, hi, runs: d.runs, cap, totalUse: bins.reduce((s, b) => s + b.litres, 0) };
  if (!full) return result;

  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('.c-tip');
  const cursor = wrap.querySelector('.c-cursor');
  const dot = wrap.querySelector('.c-dot');
  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = pts[0];
    for (const p of pts) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    const bx = x(best.t);
    cursor.setAttribute('x1', bx); cursor.setAttribute('x2', bx); cursor.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', bx); dot.setAttribute('cy', y(best.p)); dot.setAttribute('visibility', 'visible');
    const bin = bins.find((b) => best.t >= b.t && best.t < b.t + r.bin);
    tip.innerHTML = `<p class="tip-when">${esc(when(new Date(best.t).toISOString()))}</p>
      <p><i class="lg-line"></i>Level <strong>${nf1.format(best.p)}%</strong>${cap ? ` · ${nf0.format((best.p / 100) * cap)} L` : ''}</p>
      ${bin ? `<p><i class="lg-bar"></i>Used <strong>${nf0.format(bin.litres)} L</strong> ${r.bin < 86400_000 ? 'that hour' : 'that day'}</p>` : ''}
      ${overlapsRun(d.runs, best.t, best.t) ? '<p><i class="lg-run"></i>Pump running</p>' : ''}`;
    tip.hidden = false;
    const left = (bx / W) * rect.width;
    tip.style.left = `${left > rect.width / 2 ? left - tip.offsetWidth - 14 : left + 14}px`;
  };
  svg.addEventListener('pointermove', (e) => show(e.clientX));
  svg.addEventListener('pointerdown', (e) => show(e.clientX));
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
  return result;
}

// Slim arc gauge with a glowing end point and the pump start/stop marks.
function gaugeSvg(t, st) {
  const pct = st ? clampPct(st.tank_percent) : 0;
  const cx = 110, cy = 110, R = 88, start = 150, sweep = 240;
  const pt = (deg, r = R) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const arc = (from, to) => {
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };
  const at = (p) => start + (sweep * p) / 100;
  const stale = freshness(st?.last_heard_at).key === 'offline';
  const [ex, ey] = pt(at(pct));
  const marks = t.fill_start_percent != null ? [t.fill_start_percent, t.fill_stop_percent].map((p) => {
    const [x1, y1] = pt(at(p), R - 14), [x2, y2] = pt(at(p), R + 14);
    return `<line class="g-mark" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('') : '';
  const labels = [0, 100].map((p) => { const [lx, ly] = pt(at(p), R + 4); return `<text class="g-label" x="${lx.toFixed(1)}" y="${(ly + 22).toFixed(1)}" text-anchor="middle">${p}%</text>`; }).join('');
  return `<svg class="gauge ${stale ? 'is-stale' : ''}" viewBox="0 0 220 210" role="img" aria-label="${st ? `${nf1.format(pct)}% full` : 'No reading yet'}">
      <defs><linearGradient id="g-grad" x1="0" x2="1" y1="1" y2="0"><stop offset="0" class="gg0"/><stop offset="1" class="gg1"/></linearGradient></defs>
      <path class="g-track" d="${arc(start, start + sweep)}"/>
      ${pct > 0 ? `<path class="g-fill" d="${arc(start, at(pct))}" stroke="url(#g-grad)"/>` : ''}
      ${marks}
      ${pct > 0 ? `<circle class="g-end" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="7"/>` : ''}
      ${labels}
      <text class="g-value" x="${cx}" y="${cy + 10}" text-anchor="middle">${st ? nf1.format(pct) : '–'}<tspan class="g-unit" dx="2">%</tspan></text>
      <text class="g-cap" x="${cx}" y="${cy + 36}" text-anchor="middle">${st ? `${nf0.format(st.tank_volume_l)} L` : ''}</text>
    </svg>`;
}

// ---------------------------------------------------------------------------
// Enlarged box: grows out of the box that was clicked
// ---------------------------------------------------------------------------

function openBox(kind, from) {
  openKind = kind;
  openFrom = from;
  const dlg = $('big');
  dlg.className = `big big-${kind}`;
  if (!dlg.open) dlg.showModal();
  renderBig();
  $('big-close').focus();
  if (!reduceMotion && from) {
    const a = from.getBoundingClientRect(), b = dlg.getBoundingClientRect();
    dlg.animate([
      { transformOrigin: 'top left', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`, opacity: 0.4 },
      { transformOrigin: 'top left', transform: 'none', opacity: 1 },
    ], { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }
}

function closeBox() {
  const dlg = $('big');
  if (!dlg.open) return;
  if (reduceMotion) { dlg.close(); return; }
  dlg.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 160, easing: 'ease-in' })
    .finished.then(() => dlg.close());
}

const kv = (rows) => `<dl class="kv-list">${rows.filter(Boolean).map(([k, v, cls = '']) => `<div><dt>${k}</dt><dd class="${cls}">${v}</dd></div>`).join('')}</dl>`;

async function renderBig(quiet = false) {
  const kind = openKind;
  if (!kind) return;
  const t = tankById(selected);
  const st = t && stateOf(t.id);
  const cap = t && capacityOf(t);
  const title = $('big-title');
  const body = $('big-body');
  const still = () => openKind === kind && (!t || selected === t.id);

  if (kind === 'level') {
    title.textContent = t.name;
    const sensor = st?.sensor_status === 'fault' ? ['Fault', 'st-fault'] : st?.sensor_status === 'ok' ? ['OK', 'st-ok'] : ['Not reported', ''];
    const draw = (days) => {
      body.innerHTML = `<div class="big-split">
        <div class="big-gauge">${gaugeSvg(t, st)}
          ${t.fill_start_percent != null ? `<p class="note"><i class="g-mark-key"></i>Pump fills below ${nf0.format(t.fill_start_percent)}% and stops at ${nf0.format(t.fill_stop_percent)}%</p>` : ''}</div>
        ${kv([
          ['Water in tank', st ? `${nf0.format(st.tank_volume_l)} L` : '–'],
          ['Capacity', cap ? `${nf0.format(cap)} L` : 'Not set'],
          ['Depth', st ? `${nf2.format(st.water_height_m)} m${t.height_m ? ` of ${nf2.format(t.height_m)} m` : ''}` : '–'],
          ['Lasts about', esc(days)],
          ['Last reading', st ? `${esc(when(st.last_heard_at))}${st.heard_at_approx ? ' (approx.)' : ''}` : 'None yet'],
          ['Level sensor', sensor[0], sensor[1]],
          ['Radio signal', st?.lora_rssi != null ? `${signal(st.lora_rssi)} ${st.lora_rssi} dBm` : 'Unknown'],
          ['Route', st?.hop_count ? `Relayed ${st.hop_count}×` : st ? 'Direct to receiver' : '–'],
        ])}
      </div>`;
    };
    draw('…');
    try {
      const w = await weekData(t);
      if (still()) draw(daysLeftText(cap && st ? usageStats(w.points, w.runs, cap, st.tank_volume_l) : null));
    } catch { /* keep placeholder */ }
  }

  if (kind === 'use') {
    title.textContent = `${t.name} water use`;
    if (!cap) { body.innerHTML = '<p class="muted">Set the tank size in settings to see water use.</p>'; return; }
    body.innerHTML = '<p class="muted">Working it out…</p>';
    const w = await weekData(t);
    if (!still()) return;
    const u = useSummary(t, w, cap);
    const r10 = (v) => nf0.format(Math.round(v / 10) * 10);
    const nowH = new Date().getHours();
    const maxH = Math.max(1, ...u.hours.map((b) => b.litres));
    const maxD = Math.max(1, ...u.days.map((b) => b.litres));
    body.innerHTML = `
      <div class="big-figures">
        <div><p class="kv-label">Today so far</p><p class="kv-value">${r10(u.today)}<small> L</small></p></div>
        <div><p class="kv-label">Daily average</p><p class="kv-value">${u.stats.enough ? r10(u.stats.perDay) : '–'}<small> L</small></p></div>
        <div><p class="kv-label">Water lasts about</p><p class="kv-value kv-value-sm">${esc(daysLeftText(st ? usageStats(w.points, w.runs, cap, st.tank_volume_l) : null))}</p></div>
      </div>
      <h3 class="big-sub">Today, hour by hour</h3>
      <div class="hour-bars" role="img" aria-label="Water used each hour today">
        ${Array.from({ length: 24 }, (_, h) => {
          const v = u.hours[h]?.litres ?? null;
          return `<i class="${h === nowH ? 'now' : ''} ${v == null ? 'future' : ''}" style="height:${v == null ? 4 : Math.max(4, (v / maxH) * 100)}%" title="${hourFmt.format(new Date(u.midnight + h * 3600_000))}: ${v == null ? 'still to come' : `${nf0.format(v)} L`}"></i>`;
        }).join('')}
      </div>
      <div class="hour-axis"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span></div>
      <h3 class="big-sub">Last 7 days</h3>
      <div class="day-bars">
        ${u.days.map((b) => `<div><span class="day-v">${r10(b.litres)} L</span><i style="height:${Math.max(3, (b.litres / maxD) * 100)}%"></i><span class="day-l">${esc(weekday.format(new Date(b.t)))}</span></div>`).join('')}
      </div>
      <p class="note">Worked out from the drop in level. Times the pump was filling the tank aren't counted, so this is the water actually used.</p>`;
  }

  if (kind === 'pump') {
    title.textContent = `${t.name} pump`;
    const p = pumpSummary(pumpOf(t.id));
    let runs = [];
    try { runs = (await weekData(t)).runs; } catch { /* show what we have */ }
    if (!still()) return;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const todayMs = runs.reduce((s, r) => {
      const a = Math.max(r.start, midnight.getTime()), b = r.end ?? Date.now();
      return b > a ? s + (b - a) : s;
    }, 0);
    body.innerHTML = `
      <div class="pump-top big-state">
        ${pumpSvg(p.state)}
        <div class="pump-read"><p class="pump-id">Pump ${t.controller_node ? pad2(t.controller_node - 100) : '--'}</p><p class="pump-state-t st-${p.state}">${p.label}</p><p class="pump-sub">${esc(p.sub)}</p></div>
      </div>
      ${kv([
        ['Run time today', esc(duration(todayMs))],
        ['Fills in the last 7 days', String(runs.length)],
        ['Controller', t.controller_node ? `Node ${t.controller_node}` : '–'],
        t.fill_start_percent != null && ['Automatic filling', `Starts below ${nf0.format(t.fill_start_percent)}%, stops at ${nf0.format(t.fill_stop_percent)}%`],
      ])}
      <h3 class="big-sub">Recent fills</h3>
      ${runs.length ? `<ul class="fills">${runs.slice().reverse().slice(0, 6).map((r) => `
        <li><span>${esc(when(new Date(r.start).toISOString()))}</span>
          <span class="muted">${r.end ? `ran ${esc(duration(r.end - r.start))}` : `running, ${esc(duration(Date.now() - r.start))} so far`}</span>
          ${r.endState === 'fault' ? '<span class="tag tag-fault">Safety stop</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">No fills in the last 7 days.</p>'}`;
  }

  if (kind === 'chart') {
    title.textContent = `${t.name} level history`;
    if (!quiet || !body.querySelector('.chart-wrap')) {
      body.innerHTML = `
        <div class="chart-top">
          <dl class="cs-row" id="big-stats"></dl>
          <div class="seg" role="group" aria-label="Time range">
            ${Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}" title="Last ${r.long}">${r.label}</button>`).join('')}
          </div>
        </div>
        <div class="chart-wrap" id="big-chart"></div>
        <div class="chart-legend">
          <span><i class="lg-line"></i>Level</span>
          <span><i class="lg-run"></i>Pump running</span>
          <span><i class="lg-bar"></i>Water used</span>
          ${t.fill_start_percent != null ? '<span><i class="lg-dash"></i>Fill starts / stops</span>' : ''}
        </div>`;
      body.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
        range = b.dataset.range;
        body.querySelectorAll('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        renderBig();
      }));
    }
    const res = await drawChart($('big-chart'), t, range, true, quiet);
    const stats = $('big-stats');
    if (!res || !stats || !still()) return;
    const change = res.last - res.first;
    const runTime = res.runs.reduce((s, run) => s + ((run.end ?? Date.now()) - run.start), 0);
    stats.innerHTML = `
      <div><dt>Now</dt><dd>${nf1.format(res.last)}% <span class="delta ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${nf1.format(Math.abs(change))}%</span></dd></div>
      <div><dt>Lowest</dt><dd>${nf1.format(res.lo)}%</dd></div>
      <div><dt>Highest</dt><dd>${nf1.format(res.hi)}%</dd></div>
      ${res.cap ? `<div><dt>Water used</dt><dd>${nf0.format(Math.round(res.totalUse / 10) * 10)} L</dd></div>` : ''}
      <div><dt>Pump ran</dt><dd>${res.runs.length ? `${res.runs.length}× · ${duration(runTime)}` : 'Not at all'}</dd></div>`;
  }

  if (kind === 'tanks') {
    title.textContent = 'All tanks';
    body.innerHTML = `<p class="muted big-lead">Pick a tank to show it on the dashboard.</p><ul class="tank-list tank-list-big">${site.tanks.map((x) => {
      const s = stateOf(x.id);
      const f = freshness(s?.last_heard_at);
      const pump = pumpOf(x.id);
      const pct = s ? Math.max(0, Math.min(100, s.tank_percent)) : 0;
      let sub = f.label + (s ? ` · ${ago(s.last_heard_at)}` : '');
      if (pump?.state === 'running') sub = `Filling · ${sub}`;
      if (pump?.state === 'fault') sub = `Pump safety stop · ${sub}`;
      if (s?.sensor_status === 'fault') sub = `Sensor fault · ${sub}`;
      return `<li><button type="button" class="tank-row ${x.id === selected ? 'is-selected' : ''} row-${f.key}" data-pick="${esc(x.id)}" aria-pressed="${x.id === selected}">
        <span class="mini-tank" aria-hidden="true"><i style="height:${pct}%"></i></span>
        <span class="row-main"><span class="row-name">${esc(x.name)}</span><span class="row-sub"><span class="dot dot-${f.key}" aria-hidden="true"></span>${esc(sub)}</span></span>
        <svg class="spark" id="spark-${esc(x.id)}" viewBox="0 0 120 36" aria-hidden="true"></svg>
        <span class="row-nums"><span class="row-pct">${s ? `${nf0.format(s.tank_percent)}%` : '–'}</span><span class="row-l">${s ? `${nf0.format(s.tank_volume_l)} L` : ''}</span></span>
      </button></li>`;
    }).join('')}</ul>`;
    body.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { selectTank(b.dataset.pick); closeBox(); }));
    for (const x of site.tanks) {
      try {
        const pts = await sparkData(x);
        const svg = document.getElementById(`spark-${x.id}`);
        if (!svg || pts.length < 2) continue;
        const t0 = pts[0].t, t1 = pts.at(-1).t;
        svg.innerHTML = `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${(((p.t - t0) / Math.max(1, t1 - t0)) * 116 + 2).toFixed(1)},${(34 - (p.p / 100) * 32).toFixed(1)}`).join('')}"/>`;
      } catch { /* sparkline is optional */ }
    }
  }

  if (kind === 'receiver') {
    title.textContent = 'Comms';
    const gw = site.gateways[0];
    const rs = receiverStatus();
    const reporting = site.tanks.filter((x) => stateOf(x.id) && freshness(stateOf(x.id).last_heard_at).key !== 'offline').length;
    const up = gw?.uptime_s;
    const upText = up == null ? '–' : up >= 86400 ? `${Math.floor(up / 86400)} days ${Math.floor((up % 86400) / 3600)} h` : `${Math.floor(up / 3600)} h ${Math.floor((up % 3600) / 60)} min`;
    const wifi = gw?.wifi_rssi;
    body.innerHTML = `
      <div class="big-state comms-head">
        <p class="pump-id">${esc(gw?.name ?? 'Receiver')}</p>
        <p class="pump-state-t sys-${rs.key}">${esc(rs.short)}</p>
      </div>
      ${kv([
        ['Last contact', gw?.last_seen_at ? `<span data-age="${esc(gw.last_seen_at)}">${esc(ago(gw.last_seen_at))}</span>` : 'Not yet'],
        ['Tanks reporting', `${reporting} of ${site.tanks.length}`],
        ['Wi-Fi signal', wifi != null ? `${signal(wifi > -55 ? -70 : wifi > -67 ? -90 : wifi > -75 ? -105 : -115)} ${wifi} dBm` : '–'],
        ['Running for', esc(upText)],
        ['Firmware', esc(gw?.firmware ?? '–')],
      ])}
      <h3 class="big-sub">Radio link to each tank</h3>
      <table class="radio-table">
        <thead><tr><th>Tank</th><th>Status</th><th>Signal</th><th>SNR</th><th>Route</th><th>Last heard</th></tr></thead>
        <tbody>${site.tanks.map((x) => {
          const s = stateOf(x.id);
          const f = freshness(s?.last_heard_at);
          return `<tr><td>${esc(x.name)}</td><td><span class="dot dot-${f.key}" aria-hidden="true"></span> ${f.label}</td>
            <td>${s?.lora_rssi != null ? `${tbar(rssiPct(s.lora_rssi), 12)} ${s.lora_rssi} dBm` : '--'}</td>
            <td>${s?.lora_snr != null ? `${nf1.format(s.lora_snr)} dB` : '--'}</td>
            <td>${s ? (s.hop_count ? `Relayed ${s.hop_count}×` : 'Direct') : '--'}</td>
            <td>${s ? esc(ago(s.last_heard_at)) : '--'}</td></tr>`;
        }).join('')}</tbody>
      </table>
      <p class="note">The receiver in the house collects readings from every tank by radio and sends them to this website over Wi-Fi. If the internet drops out it keeps the readings and sends them when it reconnects.</p>`;
  }

  if (kind === 'activity') {
    title.textContent = 'Activity';
    const items = await activityItems();
    if (openKind !== kind) return;
    const list = () => {
      const shown = items.filter((i) => activityFilter === 'all' || i.kind === 'fault' || i.kind === 'offline').slice(0, 40);
      return shown.length ? shown.map((i) => `
        <li class="act act-${i.kind}">${actIcon(i.kind)}
          <span class="act-main"><strong>${esc(i.tank.name)}</strong> ${esc(i.text)}<span class="muted">${esc(i.detail)}</span></span>
          <span class="act-when">${esc(when(new Date(i.at).toISOString()))}</span>
        </li>`).join('')
        : `<li class="act-empty">${activityFilter === 'faults' ? 'No faults in the last 7 days.' : 'Nothing in the last 7 days.'}</li>`;
    };
    body.innerHTML = `
      <div class="big-toolbar"><p class="muted">Last 7 days, all tanks</p>
        <div class="seg seg-sm" role="group" aria-label="Show">
          <button type="button" data-act="all" aria-pressed="${activityFilter === 'all'}">All</button>
          <button type="button" data-act="faults" aria-pressed="${activityFilter === 'faults'}">Faults</button>
        </div></div>
      <ul class="activity" id="big-activity">${list()}</ul>`;
    body.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      activityFilter = b.dataset.act;
      body.querySelectorAll('[data-act]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('big-activity').innerHTML = list();
    }));
  }

  if (kind === 'usage') {
    title.textContent = 'Water use · all tanks';
    if (!quiet || !$('big-usage')) {
      body.innerHTML = `
        <div class="chart-top"><div class="usage-stats" id="big-usage-stats"></div>${useRangeButtons('data-brange')}</div>
        <div class="chart-wrap" id="big-usage"></div>
        <div class="legend" id="big-usage-legend"></div>
        <h3 class="big-sub" id="big-usage-sub"></h3>
        <div id="big-usage-table"></div>`;
      body.querySelectorAll('[data-brange]').forEach((b) => b.addEventListener('click', () => {
        useRange = b.dataset.brange;
        body.querySelectorAll('[data-brange]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        document.querySelectorAll('.box-usage [data-urange]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.urange === useRange)));
        renderUsageBox();
        renderBig(true);
      }));
    }
    const key = useRange;
    const u = await siteUsage(key);
    const wrap = $('big-usage');
    if (openKind !== kind || key !== useRange || !wrap) return;
    $('big-usage-stats').innerHTML = usageStatsHtml(u);
    $('big-usage-legend').innerHTML = usageLegendHtml(u);
    drawUsage(wrap, u, wrap.clientWidth < 600 ? 240 : 340, true);
    $('big-usage-sub').textContent = `By tank, last ${u.r.long}`;
    $('big-usage-table').innerHTML = `<table class="radio-table"><thead><tr><th>Tank</th><th>Used</th><th>Average a day</th><th>Share</th><th>In tank now</th></tr></thead><tbody>
      ${u.parts.map((p, k) => {
        const used = u.bins.reduce((s, b) => s + b.byTank[k].litres, 0);
        const s = stateOf(p.t.id);
        return `<tr><td><i class="sw" style="background:${tankColour(p.t)}"></i> ${esc(p.t.name)}</td><td>${r10(used)} L</td><td>${r10(used / (u.r.ms / 86400_000))} L</td><td>${u.total ? `${nf0.format((used / u.total) * 100)}%` : '–'}</td><td>${s ? `${r10(s.tank_volume_l)} L` : '–'}</td></tr>`;
      }).join('')}</tbody></table>`;
  }

  if (kind === 'alerts') {
    title.textContent = 'Alerts';
    const now = currentAlerts();
    const items = await activityItems();
    if (openKind !== kind) return;
    body.innerHTML = `
      <h3 class="big-sub big-sub-first">Now</h3>
      ${now.length ? `<ul class="alert-list">${now.map(alertRow).join('')}</ul>`
        : `<div class="all-clear"><span class="alert-ic">${icon('drop')}</span><span><strong>All clear</strong><span>Every tank, pump and the receiver are working normally.</span></span></div>`}
      <h3 class="big-sub">Last 7 days</h3>
      <ul class="activity">${items.slice(0, 40).map((i) => `
        <li class="act act-${i.kind}">${actIcon(i.kind)}
          <span class="act-main"><strong>${esc(i.tank.name)}</strong> ${esc(i.text)}<span class="muted">${esc(i.detail)}</span></span>
          <span class="act-when">${esc(when(new Date(i.at).toISOString()))}</span>
        </li>`).join('') || '<li class="act-empty">Nothing in the last 7 days.</li>'}</ul>
      <p class="note">Alerts show here and on the bell at the top. Email and text alerts can be added once accounts are live.</p>`;
    body.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => go(el.dataset.go)));
  }

  if (kind === 'pumps') {
    title.textContent = 'Pumps';
    const withPump = site.tanks.filter((x) => x.controller_node || pumpOf(x.id));
    const cards = [];
    for (const x of withPump) {
      let runs = [];
      try { runs = (await weekData(x)).runs; } catch { /* show what we have */ }
      const p = pumpSummary(pumpOf(x.id));
      const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
      const todayMs = runs.reduce((s, r) => {
        const a = Math.max(r.start, midnight.getTime()), b = r.end ?? Date.now();
        return b > a ? s + (b - a) : s;
      }, 0);
      const lastDone = runs.filter((r) => r.end).at(-1);
      cards.push(`<section class="pump-card">
        <div class="pump-top">${pumpSvg(p.state)}<div><p class="pump-id">${pumpName(x)} · fills ${esc(x.name)}</p><p class="pump-state-t st-${p.state}">${p.label}</p><p class="pump-sub">${esc(p.sub)}</p></div></div>
        ${kv([
          ['Run time today', esc(duration(todayMs))],
          ['Fills in the last 7 days', String(runs.length)],
          ['Last fill finished', lastDone ? esc(when(new Date(lastDone.end).toISOString())) : '–'],
          x.fill_start_percent != null && ['Automatic filling', `Starts below ${nf0.format(x.fill_start_percent)}%, stops at ${nf0.format(x.fill_stop_percent)}%`],
        ])}
        <button type="button" class="btn btn-small" data-go="${esc(x.id)}">Open ${esc(x.name)}${icon('right')}</button>
      </section>`);
    }
    if (openKind !== kind) return;
    body.innerHTML = `<div class="pump-cards">${cards.join('')}</div>
      <p class="note">Each pump is switched by its own controller, using the levels set on that controller. The website shows what they are doing; it doesn't switch them.</p>`;
    body.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => go(el.dataset.go)));
  }

  if (kind === 'settings') {
    title.textContent = 'Settings';
    const gw = site.gateways[0];
    body.innerHTML = `
      <h3 class="big-sub big-sub-first">Tanks and alerts</h3>
      <div class="set-tanks">${site.tanks.map((x) => `
        <form class="set-tank" data-tank-form="${esc(x.id)}" novalidate>
          <div class="set-head"><span class="mini-tank" aria-hidden="true"><i style="height:${clampPct(stateOf(x.id)?.tank_percent ?? 0)}%"></i></span><strong>${esc(x.name)}</strong><span class="muted small">Tank unit node ${pad2(x.tank_node)}</span></div>
          <div class="set-grid">
            <label>Name<input name="name" maxlength="40" value="${esc(x.name)}" required></label>
            <label>Capacity (L)<input name="capacity_l" type="number" min="1" step="1" inputmode="numeric" value="${x.capacity_l ?? ''}" placeholder="e.g. 30000"></label>
            <label>Height (m)<input name="height_m" type="number" min="0.1" step="0.01" inputmode="decimal" value="${x.height_m ?? ''}" placeholder="e.g. 3.0"></label>
            <label>Alert below (%)<input name="low_alert_percent" type="number" min="0" max="100" step="1" inputmode="numeric" value="${x.low_alert_percent ?? ''}" placeholder="Off"></label>
          </div>
          <div class="set-foot"><p class="form-msg" role="status"></p><button class="btn btn-small btn-primary" type="submit">Save</button></div>
        </form>`).join('')}
      </div>
      <p class="form-hint">Capacity and height are used for the litres and charts on this website. The tank unit uses the size set in its own settings. Leave the alert empty to turn it off.</p>

      <h3 class="big-sub">Pump auto-fill</h3>
      ${kv(site.tanks.filter((x) => x.fill_start_percent != null).map((x) => [`${pumpName(x)} · ${esc(x.name)}`, `Starts below ${nf0.format(x.fill_start_percent)}%, stops at ${nf0.format(x.fill_stop_percent)}%`]))}
      <p class="form-hint">These levels are set on each pump controller. Changing them from the website needs remote commands, which come later and will never bypass the controller's own safety checks.</p>

      <h3 class="big-sub">Receiver</h3>
      ${kv([
        ['Name', esc(gw?.name ?? '–')],
        ['Status', esc(receiverStatus().short)],
        ['Firmware', esc(gw?.firmware ?? '–')],
      ])}

      <h3 class="big-sub">Account</h3>
      <div class="set-account"><span class="muted">${source.demo ? 'You are viewing the demo with sample data.' : 'Signed in.'}</span><button type="button" class="btn btn-small" id="set-signout">${source.demo ? 'Exit demo' : 'Sign out'}</button></div>`;
    $('set-signout').addEventListener('click', signOut);
    body.querySelectorAll('[data-tank-form]').forEach((form) => form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const x = tankById(form.dataset.tankForm);
      const msg = form.querySelector('.form-msg');
      const num = (v) => (v === '' ? null : Number(v));
      const name = form.name.value.trim();
      const capV = num(form.capacity_l.value), h = num(form.height_m.value), low = num(form.low_alert_percent.value);
      if (!name) { msg.textContent = 'Enter a name.'; return; }
      if (capV != null && !(capV > 0)) { msg.textContent = 'Capacity must be more than 0 L.'; return; }
      if (h != null && !(h > 0)) { msg.textContent = 'Height must be more than 0 m.'; return; }
      if (low != null && !(low >= 0 && low <= 100)) { msg.textContent = 'Alert level must be 0 to 100%.'; return; }
      msg.textContent = 'Saving…';
      try {
        const fields = { name, capacity_l: capV, height_m: h, low_alert_percent: low };
        await source.renameTank(x.id, fields);
        Object.assign(x, fields);
        for (const k of [...cache.keys()]) if (k.includes(x.id)) cache.delete(k);
        msg.textContent = 'Saved';
        updateTop();
        renderAll();
      } catch (err) {
        msg.textContent = `Not saved: ${err.message}`;
      }
    }));
  }
}

// ---------------------------------------------------------------------------
// Design options (for choosing a look): ?compare shows a switcher,
// ?design=b|c|d picks one. Only colours and layout change; data is the same.
// ---------------------------------------------------------------------------

const DESIGNS = { a: 'Graphite', b: 'Glass', c: 'Minimal', d: 'Ember' };

function applyDesign() {
  const params = new URLSearchParams(location.search);
  const pick = params.get('design');
  const design = DESIGNS[pick] ? pick : 'a';
  document.documentElement.dataset.design = design;
  if (!params.has('compare')) return;
  const bar = document.createElement('nav');
  bar.className = 'design-switch';
  bar.setAttribute('aria-label', 'Design options');
  bar.innerHTML = `<span>Design</span>${Object.entries(DESIGNS).map(([k, name]) =>
    `<button type="button" data-design="${k}" aria-pressed="${k === design}">${k.toUpperCase()} · ${name}</button>`).join('')}`;
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-design]');
    if (!b) return;
    document.documentElement.dataset.design = b.dataset.design;
    bar.querySelectorAll('[data-design]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const url = new URL(location.href);
    url.searchParams.set('design', b.dataset.design);
    history.replaceState(null, '', url);
  });
  document.body.append(bar);
}

applyDesign();
start();
