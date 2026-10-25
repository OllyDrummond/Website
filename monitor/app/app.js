// Kinetiq Tank Monitor dashboard (v2, "control room").
//
// One screen per selected tank:
//   hero photo with glass panels (level, water, days left, status)
//   level chart with range tabs and water-use bars underneath
//   gauge, water use, pump and receiver cards
//   all tanks (click to switch) and recent pump activity
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
  if (table === 'tank_state' && row.tank_id === selected) { renderHero(); renderGauge(); }
  if (table === 'pump_state') { renderHero(); renderPumpCard(); renderActivity(); if (row.tank_id === selected) renderChart(true); }
  if (table === 'gateways') renderSystemCard();
  if (table === 'tank_state') renderTankList();
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
  const nav = [
    ['top', 'grid', 'Overview'],
    ['history', 'chart', 'History'],
    ['tanks', 'tanks', 'All tanks'],
    ['activity', 'bell', 'Activity'],
  ];
  app.innerHTML = `
  <div class="dash">
    <nav class="rail" aria-label="Dashboard">
      <a class="rail-logo" href="../../index.html" aria-label="Kinetiq website"><img src="../../assets/img/brand/nz-64.png?v=3" alt="" width="64" height="64"></a>
      <div class="rail-items">
        ${nav.map(([id, ic, label], i) => `<button type="button" class="rail-btn ${i === 0 ? 'is-on' : ''}" data-jump="${id}" aria-label="${label}" title="${label}">${icon(ic)}<span>${label}</span></button>`).join('')}
        <button type="button" class="rail-btn" id="open-settings" aria-label="Tank settings" title="Tank settings">${icon('cog')}<span>Settings</span></button>
      </div>
      <button type="button" class="rail-btn rail-out" id="signout" aria-label="${source.demo ? 'Exit demo' : 'Sign out'}" title="${source.demo ? 'Exit demo' : 'Sign out'}">${icon('out')}<span>${source.demo ? 'Exit' : 'Sign out'}</span></button>
    </nav>

    <div class="dash-main">
      <header class="topbar">
        <div class="picker" id="picker">
          <button type="button" class="picker-btn" id="picker-btn" aria-haspopup="listbox" aria-expanded="false">
            ${icon('tanks')}<span id="picker-name"></span>${icon('down', 'icon caret')}
          </button>
          <ul class="picker-list" id="picker-list" role="listbox" aria-label="Choose a tank" hidden></ul>
        </div>
        <p class="site-name">${esc(site.installation.name)}</p>
        <div class="top-right">
          <span class="top-date">${icon('calendar')}${esc(dateLong.format(new Date()))}</span>
          <span class="pill" id="receiver-pill"></span>
        </div>
      </header>
      ${source.demo ? '<p class="demo-note">Demo with sample data. Tank 1 is filling and updates every few seconds; Tank 3 shows what an offline tank looks like.</p>' : ''}
      <div id="receiver-banner"></div>

      <section class="hero" id="top" aria-label="Selected tank">
        <img class="hero-bg" src="../../assets/img/photos/nz-farm-tank.webp" alt="" width="1536" height="1024">
        <div class="hero-inner" id="hero" aria-live="polite"></div>
      </section>

      <section class="card chart-card" id="history" aria-labelledby="chart-title">
        <div class="chart-top">
          <div>
            <h2 id="chart-title">Tank level</h2>
            <div class="chart-stats" id="chart-stats"></div>
          </div>
          <div class="seg" role="group" aria-label="Time range">
            ${Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}" title="Last ${r.long}">${r.label}</button>`).join('')}
          </div>
        </div>
        <div class="chart-wrap" id="chart-wrap"></div>
        <div class="chart-legend">
          <span><i class="lg-line"></i>Level</span>
          <span><i class="lg-run"></i>Pump running</span>
          <span><i class="lg-bar"></i>Water used</span>
          <span id="lg-threshold"><i class="lg-dash"></i>Fill starts / stops</span>
        </div>
      </section>

      <div class="grid-4">
        <section class="card" aria-labelledby="gauge-title"><h2 id="gauge-title" class="card-title">${icon('drop')}Live level</h2><div id="gauge"></div></section>
        <section class="card" aria-labelledby="use-title"><h2 id="use-title" class="card-title">${icon('chart')}Water use</h2><div id="use"></div></section>
        <section class="card" aria-labelledby="pump-title"><h2 id="pump-title" class="card-title">${icon('pump')}Pump</h2><div id="pump"></div></section>
        <section class="card" aria-labelledby="sys-title"><h2 id="sys-title" class="card-title">${icon('receiver')}Receiver</h2><div id="system"></div></section>
      </div>

      <div class="grid-2">
        <section class="card" id="tanks" aria-labelledby="tanks-title">
          <div class="card-head"><h2 id="tanks-title" class="card-title">${icon('tanks')}All tanks</h2><span class="muted" id="tanks-count"></span></div>
          <ul class="tank-list" id="tank-list"></ul>
        </section>
        <section class="card" id="activity" aria-labelledby="act-title">
          <div class="card-head">
            <h2 id="act-title" class="card-title">${icon('bell')}Activity</h2>
            <div class="seg seg-sm" role="group" aria-label="Show">
              <button type="button" data-act="all" aria-pressed="true">All</button>
              <button type="button" data-act="faults" aria-pressed="false">Faults</button>
            </div>
          </div>
          <ul class="activity" id="activity-list"></ul>
        </section>
      </div>
      <p class="foot-note">Readings arrive about every 20 seconds. <a href="../../products/water-monitor.html">About the Kinetiq Tank Monitor</a></p>
    </div>
  </div>

  <div class="drawer-scrim" id="drawer-scrim" hidden></div>
  <aside class="drawer" id="drawer" aria-labelledby="drawer-title" hidden>
    <div class="drawer-head"><h2 id="drawer-title">Tank settings</h2><button type="button" class="icon-btn" id="drawer-close" aria-label="Close">${icon('close')}</button></div>
    <form id="tank-form" class="tank-form" novalidate></form>
  </aside>`;

  // navigation
  document.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    document.getElementById(b.dataset.jump)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    document.querySelectorAll('.rail-btn').forEach((x) => x.classList.toggle('is-on', x === b));
  }));
  document.getElementById('signout').addEventListener('click', signOut);
  document.getElementById('open-settings').addEventListener('click', openDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-scrim').addEventListener('click', closeDrawer);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closePicker(); } });

  // tank picker
  const pickBtn = document.getElementById('picker-btn');
  pickBtn.addEventListener('click', () => (document.getElementById('picker-list').hidden ? openPicker() : closePicker()));
  document.addEventListener('click', (e) => { if (!e.target.closest('#picker')) closePicker(); });

  document.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    range = b.dataset.range;
    document.querySelectorAll('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderChart();
  }));
  document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    activityFilter = b.dataset.act;
    document.querySelectorAll('[data-act]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderActivity();
  }));

  let resizeT;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => renderChart(), 200); });

  updateTop();
  renderAll();
}

function renderAll() {
  if (!selected) {
    document.getElementById('hero').innerHTML = `<div class="hero-empty"><h1>Waiting for the first reading</h1><p>Your receiver is linked. Tanks appear here automatically as soon as each tank unit sends its first reading (every 20 seconds).</p></div>`;
    return;
  }
  renderHero();
  renderChart();
  renderGauge();
  renderUseCard();
  renderPumpCard();
  renderSystemCard();
  renderTankList();
  renderActivity();
  clearInterval(chartTimer);
  chartTimer = setInterval(() => renderChart(true), 60_000);
}

function selectTank(id, pushHash = true) {
  selected = id;
  if (pushHash) history.replaceState(null, '', `#/tank/${encodeURIComponent(id)}`);
  updateTop();
  renderAll();
}

function updateTop() {
  const t = selected && tankById(selected);
  const nameEl = document.getElementById('picker-name');
  if (nameEl) nameEl.textContent = t ? t.name : 'No tanks yet';
  const pill = document.getElementById('receiver-pill');
  if (!pill) return;
  const rs = receiverStatus();
  pill.className = `pill pill-${rs.key}`;
  pill.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(rs.text)}`;
  const banner = document.getElementById('receiver-banner');
  banner.innerHTML = rs.key === 'offline'
    ? `<div class="banner banner-warn" role="status">${icon('wifi')}<span><strong>${esc(rs.text)}.</strong> Readings can't reach the website until it reconnects. Your tanks and pump keep working as normal, and the receiver sends what it has stored when it's back online.</span></div>`
    : '';
}

function openPicker() {
  const list = document.getElementById('picker-list');
  list.innerHTML = site.tanks.map((t) => {
    const st = stateOf(t.id);
    const f = freshness(st?.last_heard_at);
    return `<li role="option" aria-selected="${t.id === selected}" tabindex="-1" data-id="${esc(t.id)}">
      <span class="pick-name">${esc(t.name)}</span>
      <span class="pick-val">${st ? `${nf0.format(st.tank_percent)}%` : '–'}</span>
      <span class="dot dot-${f.key}" aria-hidden="true"></span>
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
// Hero: glass panels over the photo
// ---------------------------------------------------------------------------

async function renderHero() {
  const t = tankById(selected);
  const st = stateOf(t.id);
  const pump = pumpOf(t.id);
  const f = freshness(st?.last_heard_at);
  const cap = capacityOf(t);
  const idx = site.tanks.indexOf(t);

  let pumpText = 'Not reported yet', pumpKey = 'unknown';
  if (pump?.state === 'running') { pumpText = `Running, ${duration(Date.now() - Date.parse(pump.since))}`; pumpKey = 'running'; }
  else if (pump?.state === 'stopped') { pumpText = `Off since ${timeFmt.format(new Date(pump.since))}`; pumpKey = 'stopped'; }
  else if (pump?.state === 'fault') { pumpText = 'Stopped by safety check'; pumpKey = 'fault'; }

  const sensor = st?.sensor_status === 'fault' ? ['fault', 'Fault'] : st?.sensor_status === 'ok' ? ['ok', 'OK'] : ['unknown', 'Not reported'];

  const el = document.getElementById('hero');
  el.innerHTML = `
    <div class="hero-left">
      <div class="hero-title">
        <h1>${esc(t.name)}</h1>
        <span class="chip chip-${f.key}"><span class="dot" aria-hidden="true"></span>${f.label}${st ? ` <span class="chip-age" data-age="${esc(st.last_heard_at)}">${esc(ago(st.last_heard_at))}</span>` : ''}</span>
      </div>
      <div class="glass-row">
        <div class="glass stat stat-main"><p>Level</p><p class="stat-v">${st ? nf1.format(st.tank_percent) : '–'}<small>%</small></p></div>
        <div class="glass stat"><p>Water</p><p class="stat-v">${st ? nf0.format(st.tank_volume_l) : '–'}<small> L</small></p>${cap ? `<p class="stat-sub">of ${nf0.format(cap)} L</p>` : ''}</div>
        <div class="glass stat"><p>Lasts about</p><p class="stat-v stat-v-sm" id="hero-days">…</p><p class="stat-sub">at your average use</p></div>
      </div>
      ${site.tanks.length > 1 ? `<div class="hero-nav">
        <button type="button" class="glass-btn" id="prev-tank" aria-label="Previous tank" ${idx <= 0 ? 'disabled' : ''}>${icon('left')}</button>
        <span>${idx + 1} of ${site.tanks.length}</span>
        <button type="button" class="glass-btn" id="next-tank" aria-label="Next tank" ${idx >= site.tanks.length - 1 ? 'disabled' : ''}>${icon('right')}</button>
      </div>` : ''}
    </div>
    <div class="glass status-panel">
      <div class="status-head"><h2>Status</h2><span class="tag tag-${pumpKey === 'fault' || sensor[0] === 'fault' ? 'fault' : f.key === 'offline' ? 'offline' : 'ok'}">${pumpKey === 'fault' || sensor[0] === 'fault' ? 'Needs attention' : f.key === 'offline' ? 'Offline' : 'Normal'}</span></div>
      <dl>
        <div><dt>Last reading</dt><dd>${st ? esc(when(st.last_heard_at)) : 'None yet'}${st?.heard_at_approx ? ' (approx.)' : ''}</dd></div>
        <div><dt>Pump</dt><dd class="st-${pumpKey}">${pumpKey === 'running' ? `<span class="spin">${icon('pump')}</span>` : ''}${esc(pumpText)}</dd></div>
        <div><dt>Depth</dt><dd>${st ? `${nf2.format(st.water_height_m)} m` : '–'}${t.height_m ? ` of ${nf2.format(t.height_m)} m` : ''}</dd></div>
        <div><dt>Level sensor</dt><dd class="st-${sensor[0]}">${sensor[1]}</dd></div>
        <div><dt>Radio</dt><dd>${st?.lora_rssi != null ? `${signal(st.lora_rssi, true)} ${st.lora_rssi} dBm` : 'Unknown'}</dd></div>
        <div><dt>Route</dt><dd>${st?.hop_count ? `Relayed ${st.hop_count}×` : st ? 'Direct' : '–'}</dd></div>
      </dl>
    </div>
    ${pumpKey === 'fault' ? `<div class="glass hero-alert" role="alert">${icon('alert')}<span><strong>Pump stopped by a safety check</strong> ${esc(when(pump.since))}. The tank wasn't filling as expected. Check the pump, pipes and water supply, then turn the pump controller off and on again to reset it.</span></div>` : ''}
    ${sensor[0] === 'fault' ? `<div class="glass hero-alert" role="alert">${icon('alert')}<span><strong>Level sensor fault.</strong> This reading may be wrong, so the tank won't ask for water until the sensor reads normally. Check the probe and its cable.</span></div>` : ''}`;

  document.getElementById('prev-tank')?.addEventListener('click', () => selectTank(site.tanks[idx - 1].id));
  document.getElementById('next-tank')?.addEventListener('click', () => selectTank(site.tanks[idx + 1].id));

  try {
    const w = await weekData(t);
    if (selected !== t.id) return;
    const stats = cap && st ? usageStats(w.points, w.runs, cap, st.tank_volume_l) : null;
    const d = document.getElementById('hero-days');
    if (d) d.textContent = daysLeftText(stats);
  } catch { /* leave placeholder */ }
}

// ---------------------------------------------------------------------------
// Chart: level line + pump bands + water-use bars
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
  document.getElementById('lg-threshold').hidden = t.fill_start_percent == null;

  if (!pts.length) {
    document.getElementById('chart-stats').innerHTML = '';
    wrap.innerHTML = `<p class="chart-empty">No readings in the last ${r.long}.</p>`;
    return;
  }

  const cap = capacityOf(t);
  const bins = cap ? useBins(pts, d.runs, cap, r.bin, d.since) : [];
  const live = stateOf(t.id);
  const first = pts[0].p, last = live && freshness(live.last_heard_at).key !== 'offline' ? live.tank_percent : pts.at(-1).p;
  const lo = Math.min(...pts.map((p) => p.p)), hi = Math.max(...pts.map((p) => p.p));
  const change = last - first;
  const totalUse = bins.reduce((s, b) => s + b.litres, 0);
  const runTime = d.runs.reduce((s, run) => s + ((run.end ?? Date.now()) - run.start), 0);
  document.getElementById('chart-stats').innerHTML = `
    <p class="cs-main">${nf1.format(last)}<small>%</small>
      <span class="delta ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${nf1.format(Math.abs(change))}%</span>
      <span class="cs-over">over ${r.long}</span></p>
    <dl class="cs-row">
      <div><dt>Lowest</dt><dd>${nf1.format(lo)}%</dd></div>
      <div><dt>Highest</dt><dd>${nf1.format(hi)}%</dd></div>
      ${cap ? `<div><dt>Water used</dt><dd>${nf0.format(Math.round(totalUse / 10) * 10)} L</dd></div>` : ''}
      <div><dt>Pump ran</dt><dd>${d.runs.length ? `${d.runs.length}× · ${duration(runTime)}` : 'Not at all'}</dd></div>
    </dl>`;

  const now = Date.now(), since = d.since;
  const W = Math.max(300, wrap.clientWidth), H = W < 600 ? 260 : 320;
  const barH = cap ? (W < 600 ? 48 : 64) : 0;
  const pad = { l: 44, r: 14, t: 14, b: 26 };
  const lineBottom = H - pad.b - (barH ? barH + 14 : 0);
  const x = (ms) => pad.l + ((ms - since) / (now - since)) * (W - pad.l - pad.r);
  const y = (p) => pad.t + (1 - p / 100) * (lineBottom - pad.t);

  const gap = r.bucket * 1000 * 2.5;
  let line = '', area = '', prev = null;
  for (const pt of pts) {
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

  const grid = [0, 25, 50, 75, 100].map((p) =>
    `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/><text class="c-axis" x="${pad.l - 10}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`).join('');
  const thresholds = t.fill_start_percent != null
    ? [t.fill_start_percent, t.fill_stop_percent].map((p) => `<line class="c-threshold" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/>`).join('') : '';

  // use bars
  const maxUse = Math.max(1, ...bins.map((b) => b.litres));
  const barW = Math.max(2, (x(Math.min(now, since + r.bin)) - x(since)) * 0.62);
  const barsTop = lineBottom + 14;
  const bars = bins.map((b) => {
    const mid = x(Math.max(since, b.t) + Math.min(r.bin, now - Math.max(since, b.t)) / 2);
    const h = (b.litres / maxUse) * barH;
    return `<rect class="c-bar" x="${(mid - barW / 2).toFixed(1)}" y="${(barsTop + barH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, b.litres > 0 ? 1.5 : 0).toFixed(1)}" rx="1.5"/>`;
  }).join('');

  // time labels
  const ticks = [];
  if (r.ms <= 86400_000) {
    const f0 = new Date(since); f0.setMinutes(0, 0, 0); f0.setHours(f0.getHours() + 1);
    for (let tt = f0.getTime(); tt < now; tt += 3600_000) if (new Date(tt).getHours() % (W < 600 ? 6 : 3) === 0) ticks.push([tt, timeFmt.format(new Date(tt))]);
  } else {
    const step = r.ms <= 7 * 86400_000 ? 1 : (W < 600 ? 7 : 4);
    const f0 = new Date(since); f0.setHours(0, 0, 0, 0); f0.setDate(f0.getDate() + 1);
    for (let tt = f0.getTime(), i = 0; tt < now; tt += 86400_000, i++) if (i % step === 0) ticks.push([tt, step === 1 ? weekday.format(new Date(tt)) : shortDay.format(new Date(tt))]);
  }
  const xTicks = ticks.map(([tt, label]) => `<text class="c-axis" x="${x(tt).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(label)}</text>`).join('');

  wrap.innerHTML = `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
         aria-label="${esc(t.name)} over the last ${r.long}: from ${nf0.format(first)}% to ${nf0.format(last)}%, lowest ${nf0.format(lo)}%, highest ${nf0.format(hi)}%.">
      <defs>
        <linearGradient id="g-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--water)" stop-opacity=".38"/>
          <stop offset="100%" stop-color="var(--water)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grid}${bands}${thresholds}
      <path class="c-area" d="${area}" fill="url(#g-area)"/>
      <path class="c-line" d="${line}"/>
      ${barH ? `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${barsTop + barH}" y2="${barsTop + barH}"/><text class="c-axis" x="${pad.l - 10}" y="${barsTop + barH / 2 + 4}" text-anchor="end">Use</text>${bars}` : ''}
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
      ${bin ? `<p><i class="lg-bar"></i>Used <strong>${nf0.format(bin.litres)} L</strong> ${r.bin < 86400_000 ? 'that hour' : 'that day'}</p>` : ''}
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

function renderGauge() {
  const t = tankById(selected);
  const st = stateOf(t.id);
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
  const f = freshness(st?.last_heard_at);
  document.getElementById('gauge').innerHTML = `
    <div class="gauge">
      <svg viewBox="-22 -26 264 236" role="img" aria-label="${st ? `${nf1.format(pct)}% full` : 'No reading yet'}">
        <path class="g-track" d="${arc(start, start + sweep)}"/>
        ${pct > 0 ? `<path class="g-fill ${f.key === 'offline' ? 'is-stale' : ''}" d="${arc(start, deg(pct))}"/>` : ''}
        ${ticks}${labels}${marks}
        <text class="g-value" x="${cx}" y="${cy + 6}" text-anchor="middle">${st ? nf1.format(pct) : '–'}<tspan class="g-unit">%</tspan></text>
        <text class="g-cap" x="${cx}" y="${cy + 30}" text-anchor="middle">${st ? `${nf0.format(st.tank_volume_l)} L` : ''}</text>
      </svg>
    </div>
    ${t.fill_start_percent != null ? `<p class="card-foot-note"><i class="g-mark-key"></i>Pump fills below ${nf0.format(t.fill_start_percent)}% and stops at ${nf0.format(t.fill_stop_percent)}%</p>` : ''}`;
}

async function renderUseCard() {
  const t = tankById(selected);
  const el = document.getElementById('use');
  const cap = capacityOf(t);
  const st = stateOf(t.id);
  if (!cap) { el.innerHTML = '<p class="muted">Set the tank size in Settings to see water use.</p>'; return; }
  el.innerHTML = '<p class="muted">Working it out…</p>';
  try {
    const w = await weekData(t);
    if (selected !== t.id) return;
    const stats = usageStats(w.points, w.runs, cap, st?.tank_volume_l);
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const today = useBins(w.points, w.runs, cap, 3600_000, midnight.getTime());
    const todayTotal = today.reduce((s, b) => s + b.litres, 0);
    const maxH = Math.max(1, ...today.map((b) => b.litres));
    const hours = Array.from({ length: 24 }, (_, h) => today[h]?.litres ?? null);
    const nowH = new Date().getHours();
    el.innerHTML = `
      <div class="kv-big">
        <div><p class="kv-label">Today so far</p><p class="kv-value">${nf0.format(Math.round(todayTotal / 10) * 10)}<small> L</small></p></div>
        <div><p class="kv-label">Daily average</p><p class="kv-value">${stats?.enough ? nf0.format(Math.round(stats.perDay / 10) * 10) : '–'}<small> L</small></p></div>
      </div>
      <div class="hour-bars" role="img" aria-label="Water used each hour today">
        ${hours.map((v, h) => `<i class="${h === nowH ? 'now' : ''} ${v == null ? 'future' : ''}" style="height:${v == null ? 4 : Math.max(4, (v / maxH) * 100)}%" title="${hourFmt.format(new Date(midnight.getTime() + h * 3600_000))}: ${v == null ? 'still to come' : `${nf0.format(v)} L`}"></i>`).join('')}
      </div>
      <div class="hour-axis"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span></div>
      <p class="card-foot-note">${stats?.enough ? `At that rate the water lasts ${daysLeftText(stats).toLowerCase()} with no refill or rain.` : 'Daily average appears after a full day of readings.'}</p>`;
  } catch {
    el.innerHTML = '<p class="muted">Water use is unavailable right now.</p>';
  }
}

async function renderPumpCard() {
  const t = tankById(selected);
  const pump = pumpOf(t.id);
  const el = document.getElementById('pump');
  const state = pump?.state ?? 'unknown';
  const label = { running: 'Running', stopped: 'Off', fault: 'Safety stop', unknown: 'Unknown' }[state];
  let runs = [];
  try { runs = (await weekData(t)).runs; } catch { /* show what we have */ }
  if (selected !== t.id) return;
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const todayMs = runs.reduce((s, r) => {
    const a = Math.max(r.start, midnight.getTime()), b = r.end ?? Date.now();
    return b > a ? s + (b - a) : s;
  }, 0);
  const lastDone = runs.filter((r) => r.end).at(-1);
  el.innerHTML = `
    <div class="pump-state pump-${state}">
      <span class="pump-orb">${icon('pump')}</span>
      <div>
        <p class="pump-label">${label}</p>
        <p class="muted">${pump ? (state === 'running' ? `Since ${esc(timeFmt.format(new Date(pump.since)))}, ${esc(duration(Date.now() - Date.parse(pump.since)))}` : esc(when(pump.since))) : 'No report from the controller yet'}</p>
      </div>
    </div>
    <dl class="kv-list">
      <div><dt>Run time today</dt><dd>${esc(duration(todayMs))}</dd></div>
      <div><dt>Fills in 7 days</dt><dd>${runs.length}</dd></div>
      <div><dt>Last fill ended</dt><dd>${lastDone ? esc(when(new Date(lastDone.end).toISOString())) : '–'}</dd></div>
      <div><dt>Controller</dt><dd>${t.controller_node ? `Node ${t.controller_node}` : '–'}</dd></div>
    </dl>`;
}

function renderSystemCard() {
  const gw = site.gateways[0];
  const rs = receiverStatus();
  const reporting = site.tanks.filter((t) => freshness(stateOf(t.id)?.last_heard_at).key !== 'offline' && stateOf(t.id)).length;
  const up = gw?.uptime_s;
  const upText = up == null ? '–' : up >= 86400 ? `${Math.floor(up / 86400)} days ${Math.floor((up % 86400) / 3600)} h` : `${Math.floor(up / 3600)} h ${Math.floor((up % 3600) / 60)} min`;
  const wifi = gw?.wifi_rssi;
  document.getElementById('system').innerHTML = `
    <div class="pump-state sys-${rs.key}">
      <span class="pump-orb">${icon('wifi')}</span>
      <div><p class="pump-label">${esc(rs.short)}</p><p class="muted">${gw?.last_seen_at ? `Last contact <span data-age="${esc(gw.last_seen_at)}">${esc(ago(gw.last_seen_at))}</span>` : 'Waiting for first contact'}</p></div>
    </div>
    <dl class="kv-list">
      <div><dt>Tanks reporting</dt><dd>${reporting} of ${site.tanks.length}</dd></div>
      <div><dt>Wi-Fi signal</dt><dd>${wifi != null ? `${signal(wifi > -55 ? -70 : wifi > -67 ? -90 : wifi > -75 ? -105 : -115)} ${wifi} dBm` : '–'}</dd></div>
      <div><dt>Running for</dt><dd>${esc(upText)}</dd></div>
      <div><dt>Firmware</dt><dd>${esc(gw?.firmware ?? '–')}</dd></div>
    </dl>`;
}

async function renderTankList() {
  const list = document.getElementById('tank-list');
  if (!list) return;
  document.getElementById('tanks-count').textContent = `${site.tanks.length} tank${site.tanks.length === 1 ? '' : 's'}`;
  list.innerHTML = site.tanks.map((t) => {
    const st = stateOf(t.id);
    const f = freshness(st?.last_heard_at);
    const pump = pumpOf(t.id);
    const pct = st ? Math.max(0, Math.min(100, st.tank_percent)) : 0;
    return `<li>
      <button type="button" class="tank-row ${t.id === selected ? 'is-selected' : ''} row-${f.key}" data-tank="${esc(t.id)}" aria-pressed="${t.id === selected}">
        <span class="mini-tank" aria-hidden="true"><i style="height:${pct}%"></i></span>
        <span class="row-main">
          <span class="row-name">${esc(t.name)}${pump?.state === 'running' ? `<span class="row-tag">${icon('pump')}Filling</span>` : ''}${pump?.state === 'fault' ? '<span class="row-tag row-tag-fault">Safety stop</span>' : ''}</span>
          <span class="row-sub"><span class="dot dot-${f.key}" aria-hidden="true"></span>${f.label}${st ? ` · ${nf0.format(st.tank_volume_l)} L` : ''}</span>
        </span>
        <svg class="spark" id="spark-${esc(t.id)}" viewBox="0 0 120 36" aria-hidden="true"></svg>
        <span class="row-pct">${st ? `${nf0.format(st.tank_percent)}%` : '–'}</span>
      </button>
    </li>`;
  }).join('');
  list.querySelectorAll('[data-tank]').forEach((b) => b.addEventListener('click', () => {
    selectTank(b.dataset.tank);
    document.getElementById('top').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
  for (const t of site.tanks) {
    try {
      const pts = await sparkData(t);
      const svg = document.getElementById(`spark-${t.id}`);
      if (!svg || pts.length < 2) continue;
      const t0 = pts[0].t, t1 = pts.at(-1).t;
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(((p.t - t0) / Math.max(1, t1 - t0)) * 116 + 2).toFixed(1)},${(34 - (p.p / 100) * 32).toFixed(1)}`).join('');
      svg.innerHTML = `<path d="${d}"/>`;
    } catch { /* sparkline is optional */ }
  }
}

async function renderActivity() {
  const el = document.getElementById('activity-list');
  if (!el) return;
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
  const shown = items
    .filter((i) => activityFilter === 'all' || i.kind === 'fault' || i.kind === 'offline')
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);
  el.innerHTML = shown.length ? shown.map((i) => `
    <li class="act act-${i.kind}">
      <span class="act-icon">${icon(i.kind === 'fault' || i.kind === 'offline' ? 'alert' : 'pump')}</span>
      <span class="act-main"><strong>${esc(i.tank.name)}</strong> ${esc(i.text)}<span class="muted">${esc(i.detail)}</span></span>
      <span class="act-when">${esc(when(new Date(i.at).toISOString()))}</span>
    </li>`).join('')
    : `<li class="act-empty">${activityFilter === 'faults' ? 'No faults in the last 7 days.' : 'Nothing in the last 7 days.'}</li>`;
}

// ---------------------------------------------------------------------------
// Settings drawer
// ---------------------------------------------------------------------------

function openDrawer() {
  const t = tankById(selected);
  if (!t) return;
  const form = document.getElementById('tank-form');
  form.innerHTML = `
    <p class="muted">Settings for <strong>${esc(t.name)}</strong> (tank unit node ${t.tank_node}).</p>
    <label for="f-name">Name</label>
    <input id="f-name" name="name" maxlength="40" value="${esc(t.name)}" required>
    <label for="f-cap">Capacity (litres)</label>
    <input id="f-cap" name="capacity_l" type="number" min="1" step="1" inputmode="numeric" value="${t.capacity_l ?? ''}" placeholder="e.g. 30000">
    <label for="f-h">Height (metres)</label>
    <input id="f-h" name="height_m" type="number" min="0.1" step="0.01" inputmode="decimal" value="${t.height_m ?? ''}" placeholder="e.g. 3.0">
    <p class="form-hint">For display only. The tank unit uses the size set in its own settings.</p>
    <p class="form-msg" id="tank-form-msg" role="status"></p>
    <button class="btn btn-primary" type="submit">Save</button>`;
  form.onsubmit = async (e) => {
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
  };
  document.getElementById('drawer').hidden = false;
  document.getElementById('drawer-scrim').hidden = false;
  document.getElementById('f-name').focus();
}

function closeDrawer() {
  const d = document.getElementById('drawer');
  if (!d || d.hidden) return;
  d.hidden = true;
  document.getElementById('drawer-scrim').hidden = true;
  document.getElementById('open-settings')?.focus();
}

start();
