// Kinetiq Tank Monitor dashboard (v2, "control room").
//
// A calm overview for the selected tank: a few boxes with one or two figures
// each (level, water used today, pump, a 24-hour chart, all tanks, receiver,
// latest activity). Clicking a box enlarges it to show the full detail.
// On a computer it all fits the window; phones stack the boxes and scroll.
// Data comes from data.js (Supabase or the in-browser demo). Read-only except
// renaming tanks and setting their size.

import { supabaseConfigured, createSupabaseSource, createDemoSource } from './data.js';
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

  const fromHash = decodeURIComponent((location.hash.match(/^#\/tank\/(.+)$/) || [])[1] || '');
  selected = tankById(fromHash)?.id ?? site.tanks[0]?.id ?? null;

  renderShell();
  unsubscribe?.();
  unsubscribe = source.subscribe(onLiveChange);
  addEventListener('hashchange', () => {
    const id = decodeURIComponent((location.hash.match(/^#\/tank\/(.+)$/) || [])[1] || '');
    if (tankById(id) && id !== selected) selectTank(id, false);
  });
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
// Frame
// ---------------------------------------------------------------------------

// Keep in step with the "one screen" media query in app.css.
const FIT = matchMedia('(min-width: 1100px) and (min-height: 640px)');
let openKind = null;   // which box is enlarged, if any
let openFrom = null;   // the element it grew from; focus returns there

const $ = (id) => document.getElementById(id);
const clockFmt = new Intl.DateTimeFormat('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: false });
const headDate = new Intl.DateTimeFormat('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' });
const clampPct = (p) => Math.max(0, Math.min(100, p));

function receiverStatus() {
  const gw = site.gateways[0];
  if (!gw) return { key: 'none', text: 'No receiver linked', short: 'No receiver' };
  if (!gw.last_seen_at) return { key: 'offline', text: 'Receiver not connected yet', short: 'Not connected' };
  return ageSeconds(gw.last_seen_at) <= RECEIVER_OFFLINE_SECONDS
    ? { key: 'online', text: 'Receiver online', short: 'Online' }
    : { key: 'offline', text: `Receiver offline since ${when(gw.last_seen_at)}`, short: 'Offline' };
}

// Segmented bar meter: |||||||||......
function tbar(pct, n = 28, label = '') {
  const on = Math.round((clampPct(pct) / 100) * n);
  return `<span class="tbar" role="img" aria-label="${esc(label || `${Math.round(pct)}%`)}">${Array.from({ length: n }, (_, i) => `<i${i < on ? ' class="on"' : ''}></i>`).join('')}</span>`;
}

// Time since a reading as 00:00:20
function hms(iso) {
  const s = Math.max(0, Math.round(ageSeconds(iso)));
  if (s >= 86400) return `${Math.floor(s / 86400)}D ${String(Math.floor((s % 86400) / 3600)).padStart(2, '0')}H`;
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, '0')).join(':');
}

const rssiPct = (rssi) => rssi == null ? 0 : clampPct(((rssi + 120) / 60) * 100);
const pad2 = (n) => String(n).padStart(2, '0');

const BOXES = {
  tank: { title: '', open: 'level' },
  trend: { title: 'Level trend', open: 'chart' },
  tanks: { title: 'Tanks', open: 'tanks' },
  pump: { title: 'Pump status', open: 'pump' },
  status: { title: 'System status', open: 'receiver' },
  use: { title: 'Water use', open: 'use' },
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

function renderShell() {
  document.title = 'Tank Monitor | Kinetiq';
  const ranges = Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}" title="Last ${r.long}">${r.label}</button>`).join('');
  app.innerHTML = `
  <div class="dash">
    <header class="topbar">
      <a class="brand" href="../../products/water-monitor.html" aria-label="Kinetiq Tank Monitor, back to the website"><u>Kinetiq</u> Tank Monitor</a>
      <span class="rule" aria-hidden="true"></span>
      <span class="site-name">${esc(site.installation.name)}</span>
      ${source.demo ? '<span class="demo-tag" title="Sample data. Tank 1 is filling and updates every few seconds; Tank 3 shows what an offline tank looks like.">Demo</span>' : ''}
      <span class="top-date" id="top-date"></span>
      <span class="top-clock" id="top-clock"></span>
    </header>

    <div class="alerts" id="alerts" aria-live="polite"><div id="receiver-banner"></div><div id="tank-alerts"></div></div>

    <main class="board" id="board">
      ${box('tank', '<div class="tank-nav" id="tank-nav"></div>')}
      ${box('trend', `<div class="seg" role="group" aria-label="Time range">${ranges}</div>`)}
      ${box('tanks')}
      ${box('pump')}
      ${box('status')}
      ${box('use')}
    </main>

    <footer class="footbar">
      <nav class="foot-nav" aria-label="Details">
        <span class="foot-home" aria-current="page">Home</span>
        <button type="button" data-open="level">[Tank]</button>
        <button type="button" data-open="pump">[Pump]</button>
        <button type="button" data-open="chart">[History]</button>
        <button type="button" data-open="receiver">[Comms]</button>
        <button type="button" data-open="activity">[Log]</button>
        <button type="button" data-open="settings">[Settings]</button>
      </nav>
      <p class="sys-line" id="sys-line" role="status"></p>
      <button type="button" class="exit-btn" id="signout">${source.demo ? '[Exit demo]' : '[Sign out]'}</button>
    </footer>
  </div>

  <dialog class="big" id="big" aria-labelledby="big-title">
    <div class="big-head">
      <h2 id="big-title"></h2>
      <button type="button" class="big-close" id="big-close" aria-label="Close">[ Close ]</button>
    </div>
    <div class="big-body" id="big-body"></div>
  </dialog>`;

  $('signout').addEventListener('click', signOut);
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openBox(b.dataset.open, b)));

  // range buttons and tank rows act in place; anywhere else on a box enlarges it
  $('board').addEventListener('click', (e) => {
    const rangeBtn = e.target.closest('[data-range]');
    if (rangeBtn) {
      range = rangeBtn.dataset.range;
      document.querySelectorAll('.box-trend [data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === rangeBtn)));
      renderTrendBox();
      return;
    }
    if (e.target.closest('.tank-nav')) return;
    const tankBtn = e.target.closest('[data-tank]');
    if (tankBtn) { selectTank(tankBtn.dataset.tank); return; }
    const b = e.target.closest('.box');
    if (b) openBox(BOXES[b.dataset.box].open, b);
  });

  const dlg = $('big');
  $('big-close').addEventListener('click', closeBox);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeBox(); });
  dlg.addEventListener('close', () => {
    openKind = null;
    const back = openFrom?.matches('button') ? openFrom : openFrom?.querySelector('.box-grow');
    back?.focus();
  });

  let resizeT, lastSize = '';
  new ResizeObserver(([entry]) => {
    const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
    if (size === lastSize) return;
    lastSize = size;
    clearTimeout(resizeT);
    resizeT = setTimeout(() => renderTrendBox(true), 150);
  }).observe($('trend-chart') ?? $('box-trend'));

  updateTop();
  renderAll();
}

function renderAll() {
  if (!selected) {
    $('board').innerHTML = `<div class="box box-empty"><h1>Waiting for the first reading</h1><p class="muted">Your receiver is linked. Tanks appear here automatically as soon as each tank unit sends its first reading (every 20 seconds).</p></div>`;
    return;
  }
  renderTankBox();
  renderTrendBox();
  renderTanksBox();
  renderPumpBox();
  renderStatusBox();
  renderUseBox();
  renderAlerts();
  clearInterval(chartTimer);
  chartTimer = setInterval(() => {
    renderTrendBox(true);
    if (openKind === 'chart') renderBig(true);
  }, 60_000);
}

function refreshBoxes(table, row) {
  if (!selected) return;
  const mine = row.tank_id === selected;
  if (table === 'tank_state') {
    if (mine) { renderTankBox(); renderStatusBox(); renderAlerts(); }
    renderTanksBox();
    if (['level', 'tanks', 'receiver'].includes(openKind) && (mine || openKind !== 'level')) renderBig();
  }
  if (table === 'pump_state') {
    if (mine) { renderPumpBox(); renderUseBox(); renderTrendBox(true); renderAlerts(); }
    renderTanksBox();
    if (['pump', 'use', 'tanks', 'activity'].includes(openKind)) renderBig();
    if (openKind === 'chart' && mine) renderBig(true);
  }
  if (table === 'gateways') {
    renderStatusBox();
    if (openKind === 'receiver') renderBig();
  }
}

function selectTank(id, pushHash = true) {
  selected = id;
  if (pushHash) history.replaceState(null, '', `#/tank/${encodeURIComponent(id)}`);
  updateTop();
  renderAll();
}

function systemSummary() {
  const rs = receiverStatus();
  const faults = site.tanks.filter((t) => pumpOf(t.id)?.state === 'fault' || stateOf(t.id)?.sensor_status === 'fault');
  const silent = site.tanks.filter((t) => freshness(stateOf(t.id)?.last_heard_at).key === 'offline');
  if (faults.length) return { key: 'fault', text: `Fault: ${faults.map((t) => t.name).join(', ')}` };
  if (rs.key === 'offline') return { key: 'fault', text: 'Receiver offline' };
  if (silent.length) return { key: 'warn', text: `${silent.length} tank${silent.length === 1 ? '' : 's'} not reporting` };
  return { key: 'ok', text: 'All systems operational' };
}

// Every second: header clock and the "last update" counters.
function updateClock() {
  const now = new Date();
  if ($('top-date')) $('top-date').textContent = headDate.format(now);
  if ($('top-clock')) $('top-clock').textContent = clockFmt.format(now);
  document.querySelectorAll('[data-hms]').forEach((el) => { el.textContent = hms(el.dataset.hms); });
}

function updateTop() {
  updateClock();

  const t = selected && tankById(selected);
  const navEl = $('tank-nav');
  if (navEl && t) {
    const idx = site.tanks.indexOf(t);
    navEl.innerHTML = site.tanks.length > 1 ? `
      <button type="button" class="nav-btn" id="prev-tank" aria-label="Previous tank" ${idx <= 0 ? 'disabled' : ''}>&lt;</button>
      <span>[${idx + 1}/${site.tanks.length}]</span>
      <button type="button" class="nav-btn" id="next-tank" aria-label="Next tank" ${idx >= site.tanks.length - 1 ? 'disabled' : ''}>&gt;</button>` : '';
    $('prev-tank')?.addEventListener('click', () => selectTank(site.tanks[idx - 1].id));
    $('next-tank')?.addEventListener('click', () => selectTank(site.tanks[idx + 1].id));
    const title = $('bt-tank');
    if (title) title.textContent = t.name;
  }

  const line = $('sys-line');
  if (line) {
    const s = systemSummary();
    line.className = `sys-line sys-${s.key}`;
    line.innerHTML = `${esc(s.text)}<span class="dot" aria-hidden="true"></span>`;
  }

  const banner = $('receiver-banner');
  if (!banner) return;
  const rs = receiverStatus();
  banner.innerHTML = rs.key === 'offline'
    ? `<div class="banner" role="status">${icon('wifi')}<span><strong>${esc(rs.text)}.</strong> Readings can't reach the website until it reconnects. Your tanks and pump keep working as normal, and the receiver sends what it has stored when it's back online.</span></div>`
    : '';
}

function renderAlerts() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const pump = pumpOf(t.id);
  $('tank-alerts').innerHTML = `
    ${pump?.state === 'fault' ? `<div class="banner" role="alert">${icon('alert')}<span><strong>${esc(t.name)}: pump stopped by a safety check</strong> ${esc(when(pump.since))}. The tank wasn't filling as expected. Check the pump, pipes and water supply, then turn the pump controller off and on again to reset it.</span></div>` : ''}
    ${st?.sensor_status === 'fault' ? `<div class="banner" role="alert">${icon('alert')}<span><strong>${esc(t.name)}: level sensor fault.</strong> This reading may be wrong, so the tank won't ask for water until the sensor reads normally. Check the probe and its cable.</span></div>` : ''}`;
}

// ---------------------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------------------

const rows = (list) => `<dl class="rows">${list.filter(Boolean).map(([k, v, cls = '']) => `<div><dt>${k}</dt><dd class="${cls}">${v}</dd></div>`).join('')}</dl>`;

function tankHeight(t, st) {
  if (t.height_m) return t.height_m;
  if (st && st.tank_percent > 1) return st.water_height_m / (st.tank_percent / 100);
  return null;
}

// Line drawing of a poly tank with a depth scale and dotted water.
function tankSvg(t, st) {
  const pct = st ? clampPct(st.tank_percent) : 0;
  const H = tankHeight(t, st);
  const top = 30, bot = 238, left = 78, right = 208;
  const y = (p) => bot - (p / 100) * (bot - top);
  const stale = freshness(st?.last_heard_at).key === 'offline';
  let scale = '';
  if (H) {
    const step = H > 4 ? 1 : 0.5;
    for (let m = 0; m <= H + 1e-6; m += step) {
      const yy = y((m / H) * 100).toFixed(1);
      scale += `<line class="t-tick" x1="46" x2="56" y1="${yy}" y2="${yy}"/><text class="t-lab" x="40" y="${+yy + 4}" text-anchor="end">${m.toFixed(1)}</text>`;
    }
    scale += `<line class="t-axis" x1="51" x2="51" y1="${top}" y2="${bot}"/><text class="t-lab" x="22" y="${bot + 18}">m</text>`;
  }
  const ribs = Array.from({ length: 9 }, (_, i) => {
    const yy = (top + ((i + 1) * (bot - top)) / 10).toFixed(1);
    return `<line class="t-rib" x1="${left}" x2="${left + 7}" y1="${yy}" y2="${yy}"/><line class="t-rib" x1="${right - 7}" x2="${right}" y1="${yy}" y2="${yy}"/>`;
  }).join('');
  const body = `M${left},${top + 12} Q${left},${top} ${left + 12},${top} H${right - 12} Q${right},${top} ${right},${top + 12} V${bot - 8} Q${right},${bot} ${right - 8},${bot} H${left + 8} Q${left},${bot} ${left},${bot - 8} Z`;
  const marks = t.fill_start_percent != null ? [t.fill_start_percent, t.fill_stop_percent].map((p) =>
    `<line class="t-mark" x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}"/>`).join('') : '';
  const wy = y(pct);
  return `<svg class="tank-svg ${stale ? 'is-stale' : ''}" viewBox="0 0 220 262" role="img" aria-label="${st ? `${nf1.format(pct)}% full` : 'No reading yet'}">
    <defs>
      <pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.05" class="t-dot"/></pattern>
      <clipPath id="tank-clip"><path d="${body}"/></clipPath>
    </defs>
    ${scale}
    <rect class="t-lid" x="120" y="16" width="46" height="14" rx="2"/>
    <g clip-path="url(#tank-clip)">
      <rect class="t-water" x="${left}" y="${wy}" width="${right - left}" height="${bot - wy}" fill="url(#dots)"/>
      <line class="t-surface" x1="${left}" x2="${right}" y1="${wy}" y2="${wy}"/>
    </g>
    ${marks}
    <path class="t-body" d="${body}"/>
    ${ribs}
  </svg>`;
}

function renderTankBox() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const cap = capacityOf(t);
  const H = tankHeight(t, st);
  $('box-tank').innerHTML = `
    <div class="tank-art">${tankSvg(t, st)}</div>
    <p class="dot-num">${st ? nf0.format(st.tank_percent) : '--'}<small>%</small></p>
    ${rows([
      ['Water level', st ? `${nf2.format(st.water_height_m)} m` : '–'],
      ['Volume', st ? `${nf0.format(st.tank_volume_l)} L` : '–'],
      ['Capacity', cap ? `${nf0.format(cap)} L` : '–'],
      H && ['Tank height', `${nf2.format(H)} m`],
    ])}`;
}

async function renderTrendBox(quiet = false) {
  if (!selected) return;
  const el = $('box-trend');
  if (!$('trend-chart')) el.innerHTML = '<div class="chart-wrap" id="trend-chart"></div><dl class="trend-stats" id="trend-stats"></dl>';
  const t = tankById(selected);
  const res = await drawChart($('trend-chart'), t, range, false, quiet);
  const stats = $('trend-stats');
  if (!res || !stats || selected !== t.id) return;
  const runTime = res.runs.reduce((s, r) => s + ((r.end ?? Date.now()) - r.start), 0);
  const change = res.last - res.first;
  stats.innerHTML = `
    <div><dt>Change</dt><dd class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : '−'}${nf1.format(Math.abs(change))}%</dd></div>
    <div><dt>Min</dt><dd>${nf1.format(res.lo)}%</dd></div>
    <div><dt>Max</dt><dd>${nf1.format(res.hi)}%</dd></div>
    <div><dt>Pump ran</dt><dd>${res.runs.length ? `${res.runs.length}× · ${duration(runTime)}` : 'No'}</dd></div>`;
}

function renderTanksBox() {
  const el = $('box-tanks');
  if (!el) return;
  el.innerHTML = `<ul class="tank-list">${site.tanks.map((t) => {
    const st = stateOf(t.id);
    const f = freshness(st?.last_heard_at);
    const pump = pumpOf(t.id);
    const flag = pump?.state === 'fault' || st?.sensor_status === 'fault' ? 'fault' : f.key === 'offline' ? 'off' : pump?.state === 'running' ? 'fill' : '';
    return `<li><button type="button" class="tank-row ${t.id === selected ? 'is-selected' : ''} row-${f.key}" data-tank="${esc(t.id)}" aria-pressed="${t.id === selected}" aria-label="${esc(t.name)}, ${st ? `${nf0.format(st.tank_percent)}%` : 'no reading'}, ${f.label}">
      <span class="row-id">${pad2(t.tank_node)}</span>
      ${tbar(st?.tank_percent ?? 0, 18)}
      <span class="row-pct">${st ? `${nf0.format(st.tank_percent)}%` : '--'}</span>
      <span class="row-flag flag-${flag}">${{ fault: 'FLT', off: 'OFF', fill: 'FILL', '': '' }[flag]}</span>
      <span class="row-go" aria-hidden="true">&gt;</span>
    </button></li>`;
  }).join('')}</ul>`;
}

function pumpSummary(pump) {
  const state = pump?.state ?? 'unknown';
  const label = { running: 'Running', stopped: 'Off', fault: 'Safety stop', unknown: 'No report' }[state];
  let sub = 'No report from the controller yet';
  if (state === 'running') sub = `${duration(Date.now() - Date.parse(pump.since))} so far`;
  else if (pump) sub = `Since ${when(pump.since)}`;
  return { state, label, sub };
}

// Line drawing of an electric pump; the impeller turns while it runs.
const pumpSvg = (state) => `<svg class="pump-svg pump-${state}" viewBox="0 0 170 92" aria-hidden="true">
  <rect x="6" y="34" width="14" height="26" rx="2"/>
  <rect x="20" y="22" width="72" height="50" rx="5"/>
  ${[30, 38, 46, 54, 62, 70, 78].map((x) => `<line x1="${x}" x2="${x}" y1="28" y2="66"/>`).join('')}
  <rect x="42" y="10" width="28" height="12" rx="2"/>
  <rect x="92" y="38" width="12" height="18"/>
  <circle cx="130" cy="47" r="24"/>
  <g class="imp"><circle cx="130" cy="47" r="4"/><path d="M130 47 L130 29 M130 47 L145.6 56 M130 47 L114.4 56"/></g>
  <rect x="124" y="6" width="12" height="17"/>
  <rect x="154" y="42" width="12" height="10"/>
  <path d="M14 84 H160 M30 72 V84 M84 72 V84 M118 71 V84 M142 71 V84"/>
</svg>`;

async function renderPumpBox() {
  const t = tankById(selected);
  const pump = pumpOf(t.id);
  const p = pumpSummary(pump);
  let runs = [];
  try { runs = (await weekData(t)).runs; } catch { /* show what we have */ }
  if (selected !== t.id) return;
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const todayMs = runs.reduce((s, r) => {
    const a = Math.max(r.start, midnight.getTime()), b = r.end ?? Date.now();
    return b > a ? s + (b - a) : s;
  }, 0);
  $('box-pump').innerHTML = `
    <div class="pump-top">
      ${pumpSvg(p.state)}
      <div class="pump-read">
        <p class="pump-id">Pump ${t.controller_node ? pad2(t.controller_node - 100) : '--'}</p>
        <p class="pump-state-t st-${p.state}">${p.label}</p>
        <p class="pump-sub">${esc(p.sub)}</p>
      </div>
    </div>
    ${rows([
      t.fill_start_percent != null && ['Start fill', `${nf0.format(t.fill_start_percent)}%`],
      t.fill_stop_percent != null && ['Stop fill', `${nf0.format(t.fill_stop_percent)}%`],
      ['Run today', esc(duration(todayMs))],
      ['Fills (7 days)', String(runs.length)],
    ])}`;
}

function renderStatusBox() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const f = freshness(st?.last_heard_at);
  const rs = receiverStatus();
  const pump = pumpOf(t.id);
  const dotRow = (label, key, text) => `<div><dt>${label}</dt><dd><span class="dot dot-${key}" aria-hidden="true"></span>${text}</dd></div>`;
  const linkKey = !st ? 'none' : f.key === 'offline' ? 'offline' : f.key === 'delayed' ? 'delayed' : 'live';
  $('box-status').innerHTML = `
    <dl class="rows rows-dots">
      ${dotRow('LoRa link', linkKey, !st ? 'No signal yet' : f.key === 'offline' ? 'Lost' : 'Connected')}
      ${dotRow('Tank unit', f.key === 'none' ? 'none' : f.key, f.key === 'live' ? 'Online' : f.key === 'delayed' ? 'Delayed' : f.key === 'offline' ? 'Offline' : 'No reading')}
      ${dotRow('Level sensor', st?.sensor_status === 'fault' ? 'offline' : st?.sensor_status === 'ok' ? 'live' : 'none', st?.sensor_status === 'fault' ? 'Fault' : st?.sensor_status === 'ok' ? 'OK' : 'Not reported')}
      ${dotRow('Pump controller', pump?.state === 'fault' ? 'offline' : pump ? 'live' : 'none', pump?.state === 'fault' ? 'Safety stop' : pump ? 'Reporting' : 'No report')}
      ${dotRow('Receiver', rs.key === 'online' ? 'live' : 'offline', rs.short)}
    </dl>
    <dl class="rows rows-meter">
      <div><dt>Signal</dt><dd>${tbar(rssiPct(st?.lora_rssi), 20, st?.lora_rssi != null ? `${st.lora_rssi} dBm` : 'unknown')}<span class="meter-v">${st?.lora_rssi != null ? `${st.lora_rssi} dBm` : '--'}</span></dd></div>
      <div><dt>Last update</dt><dd>${st ? `<span data-hms="${esc(st.last_heard_at)}">${hms(st.last_heard_at)}</span>&nbsp;ago` : '--'}</dd></div>
    </dl>`;
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
  const cap = capacityOf(t);
  if (!cap) { el.innerHTML = '<p class="muted">Set the tank size in [Settings] to see water use.</p>'; return; }
  try {
    const w = await weekData(t);
    if (selected !== t.id) return;
    const u = useSummary(t, w, cap);
    const st = stateOf(t.id);
    const r10 = (v) => nf0.format(Math.round(v / 10) * 10);
    const nowH = new Date().getHours();
    const maxH = Math.max(1, ...u.hours.map((b) => b.litres));
    el.innerHTML = `
      <p class="use-today"><span class="dot-num dot-num-sm">${r10(u.today)}</span><small> L today</small></p>
      <div class="spark-bars" role="img" aria-label="Water used each hour today">
        ${Array.from({ length: 24 }, (_, h) => {
          const v = u.hours[h]?.litres;
          return `<i class="${h === nowH ? 'now' : ''}${v == null ? ' future' : ''}" style="height:${v == null ? 6 : Math.max(6, (v / maxH) * 100)}%"></i>`;
        }).join('')}
      </div>
      ${rows([
        ['Avg / day', u.stats.enough ? `${r10(u.stats.perDay)} L` : '--'],
        ['Lasts about', esc(daysLeftText(st ? usageStats(w.points, w.runs, cap, st.tank_volume_l) : null))],
      ])}`;
  } catch {
    el.innerHTML = '<p class="muted">Water use is unavailable right now.</p>';
  }
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
// Chart (in the trend box, and full size when enlarged)
// ---------------------------------------------------------------------------

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
  let line = '', area = '', prev = null;
  for (const pt of drawn) {
    const X = x(pt.t).toFixed(1), Y = y(pt.p).toFixed(1);
    if (!prev || pt.t - prev.t > gap) {
      if (prev) area += `L${x(prev.t).toFixed(1)},${lineBottom}Z`;
      line += `M${X},${Y}`; area += `M${X},${lineBottom}L${X},${Y}`;
    } else { line += `L${X},${Y}`; area += `L${X},${Y}`; }
    prev = pt;
  }
  if (prev) area += `L${x(prev.t).toFixed(1)},${lineBottom}Z`;

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

// Ring of ticks, lit up to the level, with the pump start/stop marks.
function gaugeSvg(t, st) {
  const pct = st ? clampPct(st.tank_percent) : 0;
  const cx = 110, cy = 110, n = 60, start = 135, sweep = 270;
  const at = (p) => start + (sweep * p) / 100;
  const pt = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const stale = freshness(st?.last_heard_at).key === 'offline';
  const ticks = Array.from({ length: n + 1 }, (_, i) => {
    const p = (i / n) * 100;
    const [x1, y1] = pt(at(p), 70), [x2, y2] = pt(at(p), i % 6 === 0 ? 96 : 90);
    return `<line class="g-tick${p <= pct ? ' on' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  const marks = t.fill_start_percent != null ? [t.fill_start_percent, t.fill_stop_percent].map((p) => {
    const [x1, y1] = pt(at(p), 62), [x2, y2] = pt(at(p), 102);
    return `<line class="g-mark" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('') : '';
  const labels = [0, 50, 100].map((p) => { const [lx, ly] = pt(at(p), 112); return `<text class="g-label" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle">${p}</text>`; }).join('');
  return `<svg class="gauge ${stale ? 'is-stale' : ''}" viewBox="-14 -14 248 236" role="img" aria-label="${st ? `${nf1.format(pct)}% full` : 'No reading yet'}">
      ${ticks}${marks}${labels}
      <text class="g-value" x="${cx}" y="${cy + 12}" text-anchor="middle">${st ? nf1.format(pct) : '--'}<tspan class="g-unit">%</tspan></text>
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

  if (kind === 'settings') {
    title.textContent = 'Tank settings';
    if (!t) { body.innerHTML = '<p class="muted">No tanks yet.</p>'; return; }
    body.innerHTML = `<form id="tank-form" class="tank-form" novalidate>
      <p class="muted">Settings for <strong>${esc(t.name)}</strong> (tank unit node ${t.tank_node}).</p>
      <label for="f-name">Name</label>
      <input id="f-name" name="name" maxlength="40" value="${esc(t.name)}" required>
      <label for="f-cap">Capacity (litres)</label>
      <input id="f-cap" name="capacity_l" type="number" min="1" step="1" inputmode="numeric" value="${t.capacity_l ?? ''}" placeholder="e.g. 30000">
      <label for="f-h">Height (metres)</label>
      <input id="f-h" name="height_m" type="number" min="0.1" step="0.01" inputmode="decimal" value="${t.height_m ?? ''}" placeholder="e.g. 3.0">
      <p class="form-hint">For display only. The tank unit uses the size set in its own settings.</p>
      <p class="form-msg" id="tank-form-msg" role="status"></p>
      <button class="btn btn-primary" type="submit">Save</button>
    </form>`;
    const form = $('tank-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('tank-form-msg');
      const name = form.name.value.trim();
      const capV = form.capacity_l.value === '' ? null : Number(form.capacity_l.value);
      const h = form.height_m.value === '' ? null : Number(form.height_m.value);
      if (!name) { msg.textContent = 'Enter a name for this tank.'; return; }
      if (capV != null && !(capV > 0)) { msg.textContent = 'Capacity must be more than 0 litres.'; return; }
      if (h != null && !(h > 0)) { msg.textContent = 'Height must be more than 0 metres.'; return; }
      msg.textContent = 'Saving…';
      try {
        await source.renameTank(t.id, { name, capacity_l: capV, height_m: h });
        Object.assign(t, { name, capacity_l: capV, height_m: h });
        for (const k of [...cache.keys()]) if (k.includes(t.id)) cache.delete(k);
        msg.textContent = 'Saved.';
        updateTop();
        renderAll();
      } catch (err) {
        msg.textContent = `Not saved: ${err.message}`;
      }
    });
  }
}

start();
