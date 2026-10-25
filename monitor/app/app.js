// Kinetiq Tank Monitor dashboard (v3, Qubix-style layout).
//
// One screen per selected tank:
//   dark band: tank picker, range tabs, key facts and a full-width level chart
//   with pump-run bands and water-use bars underneath
//   white cards: live level gauge + tiles, pump, water use + receiver tiles,
//   and the list of tanks in the system (click to switch)
//   drawer: activity feed or tank settings
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

const RANGES = {
  '6h': { label: '6H', long: '6 hours', ms: 6 * 3600_000, bucket: 300, bin: 1800_000 },
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
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
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
  setInterval(tick, 5000);
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
  if (!selected) return;
  if (table === 'tank_state' && row.tank_id === selected) renderLevel();
  if (table === 'pump_state' && row.tank_id === selected) { renderPump(); renderUseTiles(); renderChart(true); }
  if (table === 'gateways') renderUseTiles();
  if (table === 'tank_state' || table === 'pump_state') renderTankList();
}

function tick() {
  document.querySelectorAll('[data-age]').forEach((el) => { el.textContent = ago(el.dataset.age); });
  updateTop();
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

function receiverStatus() {
  const gw = site.gateways[0];
  if (!gw) return { key: 'none', text: 'No receiver linked', short: 'No receiver' };
  if (!gw.last_seen_at) return { key: 'offline', text: 'Receiver not connected yet', short: 'Not connected' };
  return ageSeconds(gw.last_seen_at) <= RECEIVER_OFFLINE_SECONDS
    ? { key: 'online', text: 'Receiver online', short: 'Online' }
    : { key: 'offline', text: `Receiver offline since ${when(gw.last_seen_at)}`, short: 'Offline' };
}

function renderShell() {
  document.title = 'Tank Monitor | Kinetiq';
  app.innerHTML = `
  <div class="dash">
    <header class="topbar">
      <a class="brand" href="../../products/water-monitor.html" aria-label="Kinetiq Tank Monitor, back to the website">
        <img src="../../assets/img/brand/kinetiq-full-white.webp?v=4" alt="Kinetiq" width="1178" height="400">
        <span>Tank Monitor</span>
      </a>
      <nav class="tabs" aria-label="Dashboard">
        <button type="button" class="tab is-on" aria-current="page">Dashboard</button>
        <button type="button" class="tab" data-open="activity">Activity</button>
        <button type="button" class="tab" data-open="settings">Tank settings</button>
      </nav>
      <div class="top-right">
        ${source.demo ? '<span class="demo-tag" title="Sample data. Tank 1 is filling and updates every few seconds; Tank 3 shows an offline tank.">Demo</span>' : ''}
        <span class="pill" id="receiver-pill"></span>
        <button type="button" class="round-btn" data-open="activity" aria-label="Activity">${icon('bell')}<span class="badge" id="fault-badge" hidden></span></button>
        <button type="button" class="round-btn" id="signout" aria-label="${source.demo ? 'Exit demo' : 'Sign out'}" title="${source.demo ? 'Exit demo' : 'Sign out'}">${icon('out')}</button>
      </div>
    </header>

    <div id="receiver-banner"></div>

    <section class="band" aria-labelledby="chart-title">
      <div class="band-bar">
        <div class="picker" id="picker">
          <button type="button" class="picker-btn" id="picker-btn" aria-haspopup="listbox" aria-expanded="false">
            ${icon('menu')}<span class="picker-tank">${icon('tanks')}</span><span id="picker-name"></span><span class="picker-site">· ${esc(site.installation.name)}</span>${icon('down', 'icon caret')}
          </button>
          <ul class="picker-list" id="picker-list" role="listbox" aria-label="Choose a tank" hidden></ul>
        </div>
        <span class="chip" id="fresh-chip"></span>
        <div class="seg" role="group" aria-label="Time range">
          ${Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}" title="Last ${r.long}">${r.label}</button>`).join('')}
        </div>
      </div>
      <h2 id="chart-title" class="visually-hidden">Tank level chart</h2>
      <div class="band-body">
        <dl class="facts" id="facts"></dl>
        <div class="chart-wrap" id="chart-wrap"></div>
      </div>
      <div class="chart-legend">
        <span><i class="lg-line"></i>Level</span>
        <span><i class="lg-run"></i>Pump running</span>
        <span><i class="lg-bar"></i>Water used</span>
        <span id="lg-threshold"><i class="lg-dash"></i>Pump starts / stops</span>
      </div>
    </section>

    <div class="cards">
      <section class="card col-a" aria-labelledby="level-title">
        <div class="card-head"><h2 id="level-title">Live level</h2><span class="muted" id="level-when"></span></div>
        <div id="gauge"></div>
        <div class="tiles" id="level-tiles"></div>
      </section>

      <div class="col-b">
        <section class="card" aria-labelledby="pump-title">
          <div class="card-head"><h2 id="pump-title">Pump</h2></div>
          <div id="pump"></div>
        </section>
        <div class="tiles tiles-cards" id="use-tiles"></div>
      </div>

      <section class="card col-c" aria-labelledby="tanks-title">
        <div class="card-head"><h2 id="tanks-title">Tanks in system</h2><span class="muted" id="tanks-count"></span></div>
        <div class="switch" role="group" aria-label="Show">
          <button type="button" data-filter="all" aria-pressed="true">All tanks</button>
          <button type="button" data-filter="attention" aria-pressed="false">Needs attention</button>
        </div>
        <ul class="tank-list" id="tank-list"></ul>
      </section>
    </div>
    <p class="foot-note">Readings arrive about every 20 seconds. <a href="../../products/water-monitor.html">About the Kinetiq Tank Monitor</a></p>
  </div>

  <div class="drawer-scrim" id="drawer-scrim" hidden></div>
  <aside class="drawer" id="drawer" aria-labelledby="drawer-title" hidden>
    <div class="drawer-head"><h2 id="drawer-title"></h2><button type="button" class="round-btn" id="drawer-close" aria-label="Close">${icon('close')}</button></div>
    <div id="drawer-body"></div>
  </aside>`;

  document.getElementById('signout').addEventListener('click', signOut);
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.open, b)));
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-scrim').addEventListener('click', closeDrawer);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closePicker(); } });

  document.getElementById('picker-btn').addEventListener('click', () => (document.getElementById('picker-list').hidden ? openPicker() : closePicker()));
  document.addEventListener('click', (e) => { if (!e.target.closest('#picker')) closePicker(); });

  document.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    range = b.dataset.range;
    document.querySelectorAll('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderChart();
  }));
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    tankFilter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderTankList();
  }));

  let resizeT, lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(resizeT);
    resizeT = setTimeout(() => renderChart(), 200);
  });

  updateTop();
  renderAll();
}

function renderAll() {
  if (!selected) {
    document.getElementById('chart-wrap').innerHTML = '<p class="chart-empty">Waiting for the first reading. Tanks appear here automatically as soon as each tank unit reports (every 20 seconds).</p>';
    return;
  }
  renderChart();
  renderLevel();
  renderPump();
  renderUseTiles();
  renderTankList();
  clearInterval(chartTimer);
  chartTimer = setInterval(() => renderChart(true), 60_000);
}

function selectTank(id, pushHash = true) {
  selected = id;
  if (pushHash) history.replaceState(null, '', `#/tank/${encodeURIComponent(id)}`);
  updateTop();
  renderAll();
}

function needsAttention(t) {
  const st = stateOf(t.id);
  return !st || freshness(st.last_heard_at).key === 'offline' || st.sensor_status === 'fault' || pumpOf(t.id)?.state === 'fault';
}

function updateTop() {
  const t = selected && tankById(selected);
  const nameEl = document.getElementById('picker-name');
  if (nameEl) nameEl.textContent = t ? t.name : 'No tanks yet';
  const chip = document.getElementById('fresh-chip');
  if (chip && t) {
    const st = stateOf(t.id);
    const f = freshness(st?.last_heard_at);
    chip.className = `chip chip-${f.key}`;
    chip.innerHTML = `<span class="dot" aria-hidden="true"></span>${f.label}${st ? ` <span class="chip-age" data-age="${esc(st.last_heard_at)}">${esc(ago(st.last_heard_at))}</span>` : ''}`;
  }
  const pill = document.getElementById('receiver-pill');
  if (!pill) return;
  const rs = receiverStatus();
  pill.className = `pill pill-${rs.key}`;
  pill.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="pill-text">${esc(rs.text)}</span>`;
  const faults = site.tanks.filter(needsAttention).length;
  const badge = document.getElementById('fault-badge');
  badge.hidden = !faults;
  badge.textContent = faults;
  document.getElementById('receiver-banner').innerHTML = rs.key === 'offline'
    ? `<div class="banner" role="status">${icon('wifi')}<span><strong>${esc(rs.text)}.</strong> Readings can't reach the website until it reconnects. Your tanks and pump keep working as normal, and the receiver sends what it has stored when it's back online.</span></div>`
    : '';
}

function openPicker() {
  const list = document.getElementById('picker-list');
  list.innerHTML = site.tanks.map((t) => {
    const st = stateOf(t.id);
    const f = freshness(st?.last_heard_at);
    return `<li role="option" aria-selected="${t.id === selected}" tabindex="-1" data-id="${esc(t.id)}">
      <span class="dot dot-${f.key}" aria-hidden="true"></span>
      <span class="pick-name">${esc(t.name)}</span>
      <span class="pick-val">${st ? `${nf0.format(st.tank_percent)}%` : '–'}</span>
    </li>`;
  }).join('');
  list.hidden = false;
  document.getElementById('picker-btn').setAttribute('aria-expanded', 'true');
  const opts = [...list.querySelectorAll('[role=option]')];
  opts.forEach((o) => {
    o.addEventListener('click', () => { closePicker(); selectTank(o.dataset.id); });
    o.addEventListener('keydown', (e) => {
      const i = opts.indexOf(o);
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(0, i - 1)].focus(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(); }
    });
  });
  (opts.find((o) => o.dataset.id === selected) ?? opts[0])?.focus();
}

function closePicker() {
  const list = document.getElementById('picker-list');
  if (!list || list.hidden) return;
  list.hidden = true;
  document.getElementById('picker-btn').setAttribute('aria-expanded', 'false');
}

// ---------------------------------------------------------------------------
// Chart band: facts on the left, level line + pump bands + water-use bars
// ---------------------------------------------------------------------------

async function renderChart(quiet = false) {
  const wrap = document.getElementById('chart-wrap');
  if (!wrap || !selected) return;
  const t = tankById(selected);
  const key = range;
  if (!quiet) wrap.innerHTML = '<div class="chart-empty"><span class="spinner" aria-hidden="true"></span></div>';
  let d;
  try { d = await rangeData(t, key, quiet); } catch (err) {
    wrap.innerHTML = `<p class="chart-empty">Couldn't load the chart: ${esc(err.message)}</p>`;
    return;
  }
  if (selected !== t.id || key !== range) return;
  const r = RANGES[key];
  const pts = d.points;
  const st = stateOf(t.id);
  const cap = capacityOf(t);
  document.getElementById('lg-threshold').hidden = t.fill_start_percent == null;

  const facts = document.getElementById('facts');
  if (!pts.length) {
    facts.innerHTML = '';
    wrap.innerHTML = `<p class="chart-empty">No readings in the last ${r.long}.</p>`;
    return;
  }

  const bins = cap ? useBins(pts, d.runs, cap, r.bin, d.since) : [];
  const first = pts[0].p;
  const last = st && freshness(st.last_heard_at).key !== 'offline' ? st.tank_percent : pts.at(-1).p;
  const lo = Math.min(...pts.map((p) => p.p)), hi = Math.max(...pts.map((p) => p.p));
  const change = last - first;
  const totalUse = bins.reduce((s, b) => s + b.litres, 0);
  const runTime = d.runs.reduce((s, run) => s + ((run.end ?? Date.now()) - run.start), 0);
  facts.innerHTML = `
    <div class="fact-main"><dt>Level now</dt><dd>${nf1.format(last)}<small>%</small>
      <span class="delta ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${nf1.format(Math.abs(change))}% <span>${r.long}</span></span></dd></div>
    <div><dt>Water in tank</dt><dd>${st ? `${nf0.format(st.tank_volume_l)} L` : '–'}</dd></div>
    <div><dt>Capacity</dt><dd>${cap ? `${nf0.format(cap)} L` : '–'}</dd></div>
    <div><dt>Depth</dt><dd>${st ? `${nf2.format(st.water_height_m)} m` : '–'}</dd></div>
    <div><dt>Lowest / highest</dt><dd>${nf0.format(lo)}% / ${nf0.format(hi)}%</dd></div>
    ${cap ? `<div><dt>Water used</dt><dd>${nf0.format(Math.round(totalUse / 10) * 10)} L</dd></div>` : ''}
    <div><dt>Pump ran</dt><dd>${d.runs.length ? `${d.runs.length}× · ${duration(runTime)}` : 'Not at all'}</dd></div>`;

  const now = Date.now(), since = d.since;
  const W = Math.max(300, wrap.clientWidth);
  const small = W < 640;
  const H = small ? 300 : 430;
  const barH = cap ? (small ? 56 : 92) : 0;
  const pad = { l: 8, r: small ? 44 : 58, t: 16, b: 26 };
  const lineBottom = H - pad.b - (barH ? barH + 10 : 0);
  const x = (ms) => pad.l + ((ms - since) / (now - since)) * (W - pad.l - pad.r);
  const y = (p) => pad.t + (1 - p / 100) * (lineBottom - pad.t);

  const gap = r.bucket * 1000 * 2.5;
  let line = '', area = '', prev = null;
  const drawn = [...pts];
  if (st && freshness(st.last_heard_at).key !== 'offline') drawn.push({ t: now, p: st.tank_percent });
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
    return `<rect class="c-run" x="${x1.toFixed(1)}" y="${pad.t}" width="${Math.max(2, x2 - x1).toFixed(1)}" height="${(lineBottom - pad.t).toFixed(1)}"/>`;
  }).join('');

  const grid = [0, 25, 50, 75, 100].map((p) =>
    `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/><text class="c-axis" x="${W - pad.r + 10}" y="${y(p) + 4}">${p}%</text>`).join('');
  const thresholds = t.fill_start_percent != null
    ? [t.fill_start_percent, t.fill_stop_percent].map((p) => `<line class="c-threshold" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/>`).join('') : '';

  // current value tag on the right axis, like a price tag
  const ly = y(last);
  const nowTag = `<line class="c-now" x1="${pad.l}" x2="${W - pad.r}" y1="${ly}" y2="${ly}"/>
    <rect class="c-tag" x="${W - pad.r + 2}" y="${ly - 10}" width="${pad.r - 4}" height="20" rx="5"/>
    <text class="c-tag-text" x="${W - pad.r / 2}" y="${ly + 4}" text-anchor="middle">${nf1.format(last)}%</text>`;

  const maxUse = Math.max(1, ...bins.map((b) => b.litres));
  const binPx = x(Math.min(now, since + r.bin)) - x(since);
  const barW = Math.max(2, binPx * (binPx > 12 ? 0.6 : 0.8));
  const barsTop = lineBottom + 10;
  const bars = bins.map((b) => {
    const mid = x(Math.max(since, b.t) + Math.min(r.bin, now - Math.max(since, b.t)) / 2);
    const h = (b.litres / maxUse) * barH;
    return `<rect class="c-bar" x="${(mid - barW / 2).toFixed(1)}" y="${(barsTop + barH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, b.litres > 0 ? 1.5 : 0).toFixed(1)}" rx="1"/>`;
  }).join('');

  const ticks = [];
  if (r.ms <= 86400_000) {
    const every = r.ms <= 6 * 3600_000 ? 1 : (small ? 6 : 3);
    const f0 = new Date(since); f0.setMinutes(0, 0, 0); f0.setHours(f0.getHours() + 1);
    for (let tt = f0.getTime(); tt < now; tt += 3600_000) if (new Date(tt).getHours() % every === 0) ticks.push([tt, timeFmt.format(new Date(tt))]);
  } else {
    const step = r.ms <= 7 * 86400_000 ? (small ? 2 : 1) : (small ? 7 : 3);
    const f0 = new Date(since); f0.setHours(0, 0, 0, 0); f0.setDate(f0.getDate() + 1);
    for (let tt = f0.getTime(), i = 0; tt < now; tt += 86400_000, i++) if (i % step === 0) ticks.push([tt, r.ms <= 7 * 86400_000 ? weekday.format(new Date(tt)) : shortDay.format(new Date(tt))]);
  }
  const xTicks = ticks.map(([tt, label]) => `<text class="c-axis" x="${x(tt).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(label)}</text>`).join('');

  wrap.innerHTML = `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
         aria-label="${esc(t.name)} over the last ${r.long}: from ${nf0.format(first)}% to ${nf0.format(last)}%, lowest ${nf0.format(lo)}%, highest ${nf0.format(hi)}%.">
      <defs>
        <linearGradient id="g-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#8cc7f7" stop-opacity=".22"/>
          <stop offset="100%" stop-color="#8cc7f7" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grid}${bands}${thresholds}
      <path class="c-area" d="${area}" fill="url(#g-area)"/>
      <path class="c-line" d="${line}"/>
      ${bars}
      ${nowTag}
      <line class="c-cursor" id="c-cursor" x1="0" x2="0" y1="${pad.t}" y2="${barH ? barsTop + barH : lineBottom}" visibility="hidden"/>
      <circle class="c-dot" id="c-dot" r="5" cx="0" cy="0" visibility="hidden"/>
      ${xTicks}
    </svg>
    <div class="c-tip" id="c-tip" hidden></div>`;

  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('#c-tip');
  const cursor = wrap.querySelector('#c-cursor');
  const dot = wrap.querySelector('#c-dot');
  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = pts[0];
    for (const p of pts) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    const bx = x(best.t);
    cursor.setAttribute('x1', bx); cursor.setAttribute('x2', bx); cursor.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', bx); dot.setAttribute('cy', y(best.p)); dot.setAttribute('visibility', 'visible');
    const bin = bins.find((b) => best.t >= b.t && best.t < b.t + r.bin);
    const running = overlapsRun(d.runs, best.t, best.t);
    tip.innerHTML = `<p class="tip-when">${esc(when(new Date(best.t).toISOString()))}</p>
      <p><i class="lg-line"></i>Level <strong>${nf1.format(best.p)}%</strong>${cap ? ` · ${nf0.format((best.p / 100) * cap)} L` : ''}</p>
      ${bin ? `<p><i class="lg-bar"></i>Used <strong>${nf0.format(bin.litres)} L</strong> ${r.bin >= 86400_000 ? 'that day' : r.bin >= 3600_000 ? 'that hour' : 'in 30 min'}</p>` : ''}
      ${running ? '<p><i class="lg-run"></i>Pump running</p>' : ''}`;
    tip.hidden = false;
    const left = (bx / W) * rect.width;
    tip.style.left = `${left > rect.width / 2 ? left - tip.offsetWidth - 14 : left + 14}px`;
  };
  svg.addEventListener('pointermove', (e) => show(e.clientX));
  svg.addEventListener('pointerdown', (e) => show(e.clientX));
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function gaugeSvg(t, st) {
  const pct = st ? Math.max(0, Math.min(100, st.tank_percent)) : 0;
  const cx = 110, cy = 110, R = 84, start = 135, sweep = 270;
  const pt = (deg, rad = R) => [cx + rad * Math.cos((deg * Math.PI) / 180), cy + rad * Math.sin((deg * Math.PI) / 180)];
  const arc = (from, to, rad = R) => {
    const [x1, y1] = pt(from, rad), [x2, y2] = pt(to, rad);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${rad},${rad} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };
  const deg = (p) => start + (sweep * p) / 100;
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = deg(i * 5), [x1, y1] = pt(a, R + 12), [x2, y2] = pt(a, R + (i % 5 === 0 ? 20 : 16));
    return `<line class="g-tick ${i % 5 === 0 ? 'major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  const labels = [0, 25, 50, 75, 100].map((p) => { const [lx, ly] = pt(deg(p), R + 32); return `<text class="g-label" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle">${p}</text>`; }).join('');
  const marks = t.fill_start_percent != null ? [t.fill_start_percent, t.fill_stop_percent].map((p) => {
    const [x1, y1] = pt(deg(p), R - 12), [x2, y2] = pt(deg(p), R + 10);
    return `<line class="g-mark" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('') : '';
  const stale = freshness(st?.last_heard_at).key === 'offline';
  return `<svg viewBox="-22 -26 264 236" role="img" aria-label="${st ? `${nf1.format(pct)}% full` : 'No reading yet'}">
      <path class="g-track" d="${arc(start, start + sweep)}"/>
      ${pct > 0 ? `<path class="g-fill ${stale ? 'is-stale' : ''}" d="${arc(start, deg(pct))}"/>` : ''}
      ${ticks}${labels}${marks}
      <text class="g-value" x="${cx}" y="${cy + 6}" text-anchor="middle">${st ? nf1.format(pct) : '–'}<tspan class="g-unit">%</tspan></text>
      <text class="g-cap" x="${cx}" y="${cy + 30}" text-anchor="middle">${st ? `${nf0.format(st.tank_volume_l)} L` : ''}</text>
    </svg>`;
}

const tile = (label, value, extra = '', cls = '') =>
  `<div class="tile ${cls}"><p class="tile-v">${value}</p><p class="tile-l">${label}</p>${extra}</div>`;

async function renderLevel() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const cap = capacityOf(t);
  document.getElementById('level-when').innerHTML = st ? `<span data-age="${esc(st.last_heard_at)}">${esc(ago(st.last_heard_at))}</span>` : '';
  document.getElementById('gauge').innerHTML = `<div class="gauge">${gaugeSvg(t, st)}</div>
    ${t.fill_start_percent != null ? `<p class="gauge-note"><i class="g-mark-key"></i>Pump fills below ${nf0.format(t.fill_start_percent)}%, stops at ${nf0.format(t.fill_stop_percent)}%</p>` : ''}`;
  const sensor = st?.sensor_status === 'fault' ? ['Fault', 'bad'] : st?.sensor_status === 'ok' ? ['OK', 'good'] : ['Not reported', ''];
  const tilesEl = document.getElementById('level-tiles');
  const draw = (days) => {
    tilesEl.innerHTML =
      tile('Water lasts about', esc(days)) +
      tile('Depth', st ? `${nf2.format(st.water_height_m)} m` : '–', t.height_m ? `<p class="tile-s">of ${nf2.format(t.height_m)} m</p>` : '') +
      tile('Level sensor', sensor[0], '', sensor[1]) +
      tile('Radio signal', st?.lora_rssi != null ? `${signal(st.lora_rssi)} <span class="tile-unit">${st.lora_rssi} dBm</span>` : '–', st ? `<p class="tile-s">${st.hop_count ? `Relayed ${st.hop_count}×` : 'Direct to receiver'}</p>` : '');
  };
  draw('…');
  try {
    const w = await weekData(t);
    if (selected !== t.id) return;
    draw(daysLeftText(cap && st ? usageStats(w.points, w.runs, cap, st.tank_volume_l) : null));
  } catch { draw('–'); }
}

async function renderPump() {
  const t = tankById(selected);
  const pump = pumpOf(t.id);
  const el = document.getElementById('pump');
  const state = pump?.state ?? 'unknown';
  const label = { running: 'Running', stopped: 'Off', fault: 'Safety stop', unknown: 'Not reported' }[state];
  let runs = [];
  try { runs = (await weekData(t)).runs; } catch { /* show what we have */ }
  if (selected !== t.id) return;

  // 24 one-hour cells: how much of each hour the pump ran
  const now = Date.now();
  const hourStart = binStart(now, 3600_000) - 23 * 3600_000;
  const cells = Array.from({ length: 24 }, (_, i) => {
    const a = hourStart + i * 3600_000, b = a + 3600_000;
    const ran = runs.reduce((s, r) => s + Math.max(0, Math.min(b, r.end ?? now) - Math.max(a, r.start)), 0);
    return { a, ran };
  });
  const ran24 = cells.reduce((s, c) => s + c.ran, 0);
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const todayMs = runs.reduce((s, r) => {
    const a = Math.max(r.start, midnight.getTime()), b = r.end ?? now;
    return b > a ? s + (b - a) : s;
  }, 0);
  const lastDone = runs.filter((r) => r.end).at(-1);

  el.innerHTML = `
    <div class="pump-grid">
      <div class="pump-left">
        <div class="pump-state pump-${state}">
          <span class="pump-orb">${icon('pump')}</span>
          <div>
            <p class="pump-label">${label}</p>
            <p class="muted">${pump ? (state === 'running' ? `Since ${esc(timeFmt.format(new Date(pump.since)))} · ${esc(duration(now - Date.parse(pump.since)))}` : state === 'fault' ? `Since ${esc(when(pump.since))}` : `Since ${esc(when(pump.since))}`) : 'No report yet'}</p>
          </div>
        </div>
        <div class="runbar" role="img" aria-label="Pump ran ${esc(duration(ran24))} in the last 24 hours">
          ${cells.map((c) => `<i class="${c.ran > 0 ? 'on' : ''}" style="--f:${Math.min(1, c.ran / 3600_000).toFixed(2)}" title="${esc(hourFmt.format(new Date(c.a)))}: ${c.ran ? esc(duration(c.ran)) : 'off'}"></i>`).join('')}
        </div>
        <p class="runbar-key"><span>Last 24 hours</span><span>Ran ${esc(duration(ran24))}</span></p>
      </div>
      <dl class="pump-list">
        <div><dt><i class="k k-run"></i>Run time today</dt><dd>${esc(duration(todayMs))}</dd></div>
        <div><dt><i class="k k-fill"></i>Fills in 7 days</dt><dd>${runs.length}</dd></div>
        <div><dt><i class="k k-last"></i>Last fill</dt><dd>${lastDone ? esc(when(new Date(lastDone.end).toISOString())) : '–'}</dd></div>
        <div><dt><i class="k k-ctl"></i>Controller</dt><dd>${t.controller_node ? `Node ${t.controller_node}` : '–'}</dd></div>
      </dl>
    </div>
    ${state === 'fault' ? `<p class="alert">${icon('alert')}<span><strong>Stopped by a safety check.</strong> The tank wasn't filling as expected. Check the pump, pipes and water supply, then turn the pump controller off and on again to reset it.</span></p>` : ''}
    ${sensorFault(t) ? `<p class="alert">${icon('alert')}<span><strong>Level sensor fault.</strong> The tank won't ask for water until the sensor reads normally. Check the probe and its cable.</span></p>` : ''}`;
}

const sensorFault = (t) => stateOf(t.id)?.sensor_status === 'fault';

async function renderUseTiles() {
  const t = tankById(selected);
  const el = document.getElementById('use-tiles');
  const cap = capacityOf(t);
  const st = stateOf(t.id);
  const gw = site.gateways[0];
  const rs = receiverStatus();
  const reporting = site.tanks.filter((x) => stateOf(x.id) && freshness(stateOf(x.id).last_heard_at).key !== 'offline').length;
  const receiverTile = `<div class="card tile-card">
      <p class="tile-l">Receiver</p>
      <p class="tile-big ${rs.key === 'online' ? 'good' : 'bad'}">${esc(rs.short)}</p>
      <p class="tile-s">${reporting} of ${site.tanks.length} tanks reporting${gw?.wifi_rssi != null ? ` · Wi-Fi ${gw.wifi_rssi} dBm` : ''}</p>
    </div>`;
  const lastTile = `<div class="card tile-card">
      <p class="tile-l">Last reading</p>
      <p class="tile-big">${st ? esc(timeFmt.format(new Date(st.last_heard_at))) : '–'}</p>
      <p class="tile-s">${st ? `${esc(when(st.last_heard_at).split(' ')[0])}${st.heard_at_approx ? ' · time approx.' : ''}` : 'Waiting for the tank unit'}</p>
    </div>`;
  if (!cap) {
    el.innerHTML = `<div class="card tile-card"><p class="tile-l">Water used today</p><p class="tile-s">Set the tank size in Tank settings to see water use.</p></div>
      <div class="card tile-card"><p class="tile-l">Daily average</p><p class="tile-big">–</p></div>${receiverTile}${lastTile}`;
    return;
  }
  let today = null, stats = null;
  try {
    const w = await weekData(t);
    if (selected !== t.id) return;
    stats = usageStats(w.points, w.runs, cap, st?.tank_volume_l);
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    today = useBins(w.points, w.runs, cap, 86400_000, midnight.getTime()).reduce((s, b) => s + b.litres, 0);
  } catch { /* leave blanks */ }
  const r10 = (v) => nf0.format(Math.round(v / 10) * 10);
  // Compare with the share of an average day that has passed so far.
  const dayFrac = (Date.now() - new Date().setHours(0, 0, 0, 0)) / 86400_000;
  const expected = stats?.enough ? stats.perDay * dayFrac : null;
  const vs = today != null && expected > 50 ? Math.round(((today - expected) / expected) * 100) : null;
  el.innerHTML = `
    <div class="card tile-card">
      <p class="tile-l">Water used today</p>
      <p class="tile-big">${today != null ? r10(today) : '–'}<small> L</small>${vs != null ? `<span class="delta ${vs <= 0 ? 'up' : 'down'}">${vs > 0 ? '▲' : '▼'} ${Math.abs(vs)}%</span>` : ''}</p>
      <p class="tile-s">${vs != null ? 'vs a usual day by this time' : 'Since midnight, not counting pump fills'}</p>
    </div>
    <div class="card tile-card">
      <p class="tile-l">Daily average</p>
      <p class="tile-big">${stats?.enough ? r10(stats.perDay) : '–'}<small> L</small></p>
      <p class="tile-s">${stats?.enough ? 'Over the last 7 days' : 'Needs a full day of readings'}</p>
    </div>
    ${receiverTile}${lastTile}`;
}

let tankFilter = 'all';

async function renderTankList() {
  const list = document.getElementById('tank-list');
  if (!list) return;
  document.getElementById('tanks-count').textContent = `${site.tanks.length} tank${site.tanks.length === 1 ? '' : 's'}`;
  const shown = site.tanks.filter((t) => tankFilter === 'all' || needsAttention(t));
  if (!shown.length) { list.innerHTML = '<li class="list-empty">Nothing needs attention. All tanks are reporting normally.</li>'; return; }
  list.innerHTML = shown.map((t) => {
    const st = stateOf(t.id);
    const f = freshness(st?.last_heard_at);
    const pump = pumpOf(t.id);
    const pct = st ? Math.max(0, Math.min(100, st.tank_percent)) : 0;
    let sub = f.label;
    if (pump?.state === 'running') sub = 'Filling';
    if (pump?.state === 'fault') sub = 'Pump safety stop';
    if (st?.sensor_status === 'fault') sub = 'Sensor fault';
    return `<li>
      <button type="button" class="tank-row ${t.id === selected ? 'is-selected' : ''} row-${f.key}" data-tank="${esc(t.id)}" aria-pressed="${t.id === selected}">
        <span class="mini-tank" aria-hidden="true"><i style="height:${pct}%"></i></span>
        <span class="row-main">
          <span class="row-name">${esc(t.name)}</span>
          <span class="row-sub"><span class="dot dot-${needsAttention(t) ? 'offline' : f.key}" aria-hidden="true"></span>${esc(sub)}</span>
        </span>
        <svg class="spark" id="spark-${esc(t.id)}" viewBox="0 0 80 30" aria-hidden="true"></svg>
        <span class="row-nums"><span class="row-pct">${st ? `${nf0.format(st.tank_percent)}%` : '–'}</span><span class="row-l">${st ? `${nf0.format(st.tank_volume_l)} L` : 'No reading'}</span></span>
      </button>
    </li>`;
  }).join('');
  list.querySelectorAll('[data-tank]').forEach((b) => b.addEventListener('click', () => {
    selectTank(b.dataset.tank);
    document.querySelector('.band').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
  for (const t of shown) {
    try {
      const pts = await sparkData(t);
      const svg = document.getElementById(`spark-${t.id}`);
      if (!svg || pts.length < 2) continue;
      const t0 = pts[0].t, t1 = pts.at(-1).t;
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(((p.t - t0) / Math.max(1, t1 - t0)) * 78 + 1).toFixed(1)},${(29 - (p.p / 100) * 28).toFixed(1)}`).join('');
      svg.innerHTML = `<path d="${d}"/>`;
    } catch { /* sparkline is optional */ }
  }
}

// ---------------------------------------------------------------------------
// Drawer: activity or tank settings
// ---------------------------------------------------------------------------

let drawerOpener = null;

async function openDrawer(kind, opener) {
  drawerOpener = opener;
  const body = document.getElementById('drawer-body');
  document.getElementById('drawer-title').textContent = kind === 'settings' ? 'Tank settings' : 'Activity';
  document.getElementById('drawer').hidden = false;
  document.getElementById('drawer-scrim').hidden = false;
  if (kind === 'settings') renderSettings(body);
  else {
    body.innerHTML = '<p class="muted">Loading…</p>';
    body.innerHTML = await activityHtml();
  }
  document.getElementById('drawer-close').focus();
}

function closeDrawer() {
  const d = document.getElementById('drawer');
  if (!d || d.hidden) return;
  d.hidden = true;
  document.getElementById('drawer-scrim').hidden = true;
  drawerOpener?.focus();
}

async function activityHtml() {
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
  items.sort((a, b) => b.at - a.at);
  if (!items.length) return '<p class="muted">Nothing in the last 7 days.</p>';
  return `<p class="muted drawer-sub">Last 7 days, all tanks</p><ul class="activity">${items.slice(0, 30).map((i) => `
    <li class="act act-${i.kind}">
      <span class="act-icon">${icon(i.kind === 'fault' || i.kind === 'offline' ? 'alert' : 'pump')}</span>
      <span class="act-main"><strong>${esc(i.tank.name)}</strong> ${esc(i.text)}<span class="muted">${esc(i.detail)}</span></span>
      <span class="act-when">${esc(when(new Date(i.at).toISOString()))}</span>
    </li>`).join('')}</ul>`;
}

function renderSettings(body) {
  const t = tankById(selected);
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
  const form = document.getElementById('tank-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('tank-form-msg');
    const name = form.name.value.trim();
    const cap = form.capacity_l.value === '' ? null : Number(form.capacity_l.value);
    const h = form.height_m.value === '' ? null : Number(form.height_m.value);
    if (!name) { msg.textContent = 'Enter a name for this tank.'; return; }
    if (cap != null && !(cap > 0)) { msg.textContent = 'Capacity must be more than 0 litres.'; return; }
    if (h != null && !(h > 0)) { msg.textContent = 'Height must be more than 0 metres.'; return; }
    msg.textContent = 'Saving…';
    try {
      await source.renameTank(t.id, { name, capacity_l: cap, height_m: h });
      Object.assign(t, { name, capacity_l: cap, height_m: h });
      for (const k of [...cache.keys()]) if (k.includes(t.id)) cache.delete(k);
      msg.textContent = 'Saved.';
      updateTop();
      renderAll();
    } catch (err) {
      msg.textContent = `Not saved: ${err.message}`;
    }
  });
}

start();
