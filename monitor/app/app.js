// Kinetiq Tank Monitor dashboard.
// Screens: sign in, all tanks, one tank. Data comes from data.js (Supabase or
// the in-browser demo). Read-only except renaming tanks and setting their size.

import { supabaseConfigured, createSupabaseSource, createDemoSource } from './data.js';
import { LIVE_SECONDS, OFFLINE_SECONDS, RECEIVER_OFFLINE_SECONDS } from './config.js';

const app = document.getElementById('app');

let source = null;
let site = null;            // { installation, gateways, tanks, tankState, pumpState }
let unsubscribe = null;
let chartRange = '24h';
let chartTimer = null;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf0 = new Intl.NumberFormat('en-NZ', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
const shortDay = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('en-NZ', { weekday: 'short' });

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
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400_000);
  const t = timeFmt.format(d);
  if (d.toDateString() === today.toDateString()) return `today ${t}`;
  if (d.toDateString() === yesterday.toDateString()) return `yesterday ${t}`;
  return `${dayFmt.format(d)} ${t}`;
}

function duration(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

// Live / Delayed / Offline from the age of the last reading.
function freshness(iso) {
  if (!iso) return { key: 'none', label: 'No readings yet' };
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

const byTank = (rows) => new Map(rows.map((r) => [r.tank_id, r]));

// ---------------------------------------------------------------------------
// Water use and days left
// ---------------------------------------------------------------------------
// From the last 7 days of hourly averages: add up every fall in water level,
// skipping any hour the pump was running (filling hides use), and divide by
// the time covered. Needs at least a day of usable data.

const USAGE_DAYS = 7;
const usageCache = new Map();   // tankId -> { at, stats }

function capacityOf(t, st) {
  if (t.capacity_l) return t.capacity_l;
  if (st && st.tank_percent > 1) return st.tank_volume_l / (st.tank_percent / 100);
  return null;
}

function computeUsage(t, hist, runs) {
  const st = site.stateByTank.get(t.id);
  const cap = capacityOf(t, st);
  if (!cap || hist.length < 2) return null;
  const pts = hist.map((r) => ({ t: Date.parse(r.bucket) + 1800_000, p: r.avg_percent }));
  const pumping = (a, b) => runs.some((r) => r.start < b + 1800_000 && (r.end ?? Date.now()) > a - 1800_000);
  let used = 0, ms = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (b.t - a.t > 1.5 * 3600_000 || pumping(a.t, b.t)) continue;
    const dl = ((b.p - a.p) / 100) * cap;
    if (dl < 0) used -= dl;
    ms += b.t - a.t;
  }
  if (ms < 86400_000) return { enough: false };
  const perDay = used / (ms / 86400_000);
  const daysLeft = perDay > 1 && st ? st.tank_volume_l / perDay : null;
  return { enough: true, perDay, daysLeft };
}

async function usageFor(t) {
  const hit = usageCache.get(t.id);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.stats;
  const since = new Date(Date.now() - USAGE_DAYS * 86400_000).toISOString();
  const [hist, events] = await Promise.all([source.history(t.id, since, 3600), source.pumpEvents(t.id, since)]);
  const stats = computeUsage(t, hist, pumpRuns(events, Date.parse(since)));
  usageCache.set(t.id, { at: Date.now(), stats });
  return stats;
}

function usageText(stats) {
  if (!stats) return { use: '–', left: '–' };
  if (!stats.enough) return { use: 'Not enough data yet', left: 'Not enough data yet' };
  const use = `${nf0.format(Math.round(stats.perDay / 10) * 10)} L a day`;
  let left = '–';
  if (stats.daysLeft != null) {
    left = stats.daysLeft > 60 ? 'More than 60 days'
      : stats.daysLeft < 1 ? 'Less than a day'
      : `About ${nf0.format(Math.floor(stats.daysLeft))} day${Math.floor(stats.daysLeft) === 1 ? '' : 's'}`;
  }
  return { use, left };
}

function fillUsage() {
  document.querySelectorAll('[data-usage]').forEach(async (el) => {
    const t = site.tanks.find((x) => x.id === el.dataset.usage);
    if (!t) return;
    try {
      const u = usageText(await usageFor(t));
      el.querySelector('[data-use]').textContent = u.use;
      el.querySelector('[data-left]').textContent = u.left;
    } catch {
      el.querySelector('[data-use]').textContent = 'Unavailable';
      el.querySelector('[data-left]').textContent = 'Unavailable';
    }
  });
}

function usageBlock(t, cls) {
  const cached = usageCache.get(t.id);
  const u = cached ? usageText(cached.stats) : { use: '…', left: '…' };
  return `<dl class="${cls}" data-usage="${esc(t.id)}">
    <div><dt>Average use</dt><dd data-use>${esc(u.use)}</dd></div>
    <div><dt>Water left</dt><dd data-left>${esc(u.left)}</dd></div>
  </dl>`;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function wantsDemo() {
  if (new URLSearchParams(location.search).has('demo')) return true;
  try { return sessionStorage.getItem('kinetiq-demo') === '1'; } catch { return false; }
}

async function start() {
  if (wantsDemo() || !supabaseConfigured) {
    if (wantsDemo()) { source = createDemoSource(); return openSite(); }
    return renderLogin();
  }
  try {
    source = await createSupabaseSource();
    const session = await source.getSession();
    if (session) return openSite();
  } catch (err) {
    console.error(err);
  }
  renderLogin();
}

async function openSite() {
  app.innerHTML = `<div class="loading" role="status">Loading your tanks…</div>`;
  try {
    site = await source.loadSite();
  } catch (err) {
    app.innerHTML = `<div class="loading" role="alert">Couldn't load your tanks: ${esc(err.message)}. Check your internet connection and reload the page.</div>`;
    return;
  }
  if (!site) {
    app.innerHTML = shell(`<section class="empty"><h1>No system linked yet</h1>
      <p>Your account is set up, but no tank monitor has been linked to it. Contact Kinetiq and we'll connect your receiver.</p></section>`);
    bindShell();
    return;
  }
  site.stateByTank = byTank(site.tankState);
  site.pumpByTank = byTank(site.pumpState);
  unsubscribe?.();
  unsubscribe = source.subscribe(onLiveChange);
  addEventListener('hashchange', route);
  route();
  setInterval(refreshAges, 5000);
}

function onLiveChange({ table, row }) {
  if (!site || !row) return;
  if (table === 'tank_state') site.stateByTank.set(row.tank_id, row);
  if (table === 'pump_state') site.pumpByTank.set(row.tank_id, row);
  if (table === 'gateways') {
    const i = site.gateways.findIndex((g) => g.id === row.id);
    if (i >= 0) site.gateways[i] = row; else site.gateways.push(row);
  }
  const id = currentTankId();
  if (id) updateTankLive(id, table); else renderOverview(true);
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function renderLogin(message = '') {
  document.title = 'Sign in | Kinetiq Tank Monitor';
  app.innerHTML = `
  <main class="login">
    <div class="login-card">
      <img class="login-logo" src="../../assets/img/brand/kinetiq-full-dark.webp?v=4" alt="Kinetiq, engineering solutions" width="1178" height="400">
      <h1>Tank Monitor</h1>
      <p class="login-sub">Sign in to see your tanks.</p>
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
      <p class="notice">Customer accounts aren't switched on yet. You can explore the demo with sample data.</p>`}
      <div class="login-demo">
        <button class="btn ${supabaseConfigured ? 'btn-ghost' : 'btn-primary'}" type="button" id="demo-btn">View the demo</button>
      </div>
    </div>
    <p class="login-foot"><a href="../../products/water-monitor.html">About the Kinetiq Tank Monitor</a></p>
  </main>`;

  document.getElementById('demo-btn').addEventListener('click', () => {
    try { sessionStorage.setItem('kinetiq-demo', '1'); } catch { /* demo still works for this page */ }
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
    try {
      await source.signIn(email, password);
      openSite();
    } catch (err) {
      msg.textContent = err.message;
    }
  });
  document.getElementById('forgot').addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) { msg.textContent = 'Enter your email above first, then press "Forgot your password?" again.'; return; }
    try {
      await source.resetPassword(email);
      msg.textContent = `If ${email} has an account, we've emailed a link to reset the password.`;
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

// ---------------------------------------------------------------------------
// Page frame
// ---------------------------------------------------------------------------

function receiverStatus() {
  const gw = site.gateways[0];
  if (!gw) return { key: 'none', text: 'No receiver linked' };
  if (!gw.last_seen_at) return { key: 'offline', text: 'Receiver not connected yet' };
  const online = ageSeconds(gw.last_seen_at) <= RECEIVER_OFFLINE_SECONDS;
  return online
    ? { key: 'online', text: 'Receiver online' }
    : { key: 'offline', text: `Receiver offline since ${when(gw.last_seen_at)}` };
}

function shell(inner) {
  const rs = site ? receiverStatus() : null;
  return `
  <header class="topbar">
    <a class="top-brand" href="#/" aria-label="All tanks">
      <img class="logo-light" src="../../assets/img/brand/kinetiq-full-dark.webp?v=4" alt="Kinetiq" width="1178" height="400">
      <img class="logo-dark" src="../../assets/img/brand/kinetiq-full-white.webp?v=4" alt="" width="1178" height="400" aria-hidden="true">
    </a>
    <div class="top-site">
      ${site ? `<p class="site-name">${esc(site.installation.name)}</p>` : ''}
      ${rs ? `<p class="pill pill-${rs.key}" id="receiver-pill"><span class="dot" aria-hidden="true"></span><span id="receiver-text">${esc(rs.text)}</span></p>` : ''}
    </div>
    <button class="btn btn-ghost btn-sm" type="button" id="signout">${source?.demo ? 'Exit demo' : 'Sign out'}</button>
  </header>
  ${source?.demo ? `<p class="demo-bar">Demo with sample data. Tank 1 and Tank 2 update every few seconds; Tank 3 shows what an offline tank looks like.</p>` : ''}
  <div id="receiver-banner">${receiverBanner()}</div>
  <main id="main" class="main">${inner}</main>`;
}

function receiverBanner() {
  if (!site) return '';
  const rs = receiverStatus();
  if (rs.key !== 'offline') return '';
  return `<div class="banner banner-warn" role="status">
    <strong>${esc(rs.text)}.</strong>
    Readings can't reach the website until it reconnects. Your tanks and pump keep working as normal, and the receiver sends what it has stored when it's back online.
  </div>`;
}

function bindShell() {
  document.getElementById('signout')?.addEventListener('click', async () => {
    try { sessionStorage.removeItem('kinetiq-demo'); } catch { /* ignore */ }
    unsubscribe?.();
    await source?.signOut();
    location.href = location.pathname;
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function currentTankId() {
  const m = location.hash.match(/^#\/tank\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function route() {
  clearInterval(chartTimer);
  const id = currentTankId();
  if (id && site.tanks.some((t) => t.id === id)) renderTank(id);
  else renderOverview();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Pieces shared by both screens
// ---------------------------------------------------------------------------

function tankGraphic(pct, fresh, size = 'md') {
  const level = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const h = 120, top = 14;
  const waterY = top + (h - top) * (1 - level / 100);
  return `
  <svg class="tank-svg tank-${size} ${fresh === 'offline' || fresh === 'none' ? 'is-stale' : ''}" viewBox="0 0 100 ${h + 6}" aria-hidden="true">
    <defs><clipPath id="clip-${size}-${Math.round(level * 10)}"><path d="M6 ${top + 8} Q6 ${top} 50 ${top - 6} Q94 ${top} 94 ${top + 8} V${h - 4} Q94 ${h} 90 ${h} H10 Q6 ${h} 6 ${h - 4} Z"/></clipPath></defs>
    <g clip-path="url(#clip-${size}-${Math.round(level * 10)})">
      <rect class="tank-air" x="0" y="0" width="100" height="${h}"/>
      <rect class="tank-water" x="0" y="${waterY}" width="100" height="${h - waterY}"/>
      <rect class="tank-surface" x="0" y="${waterY}" width="100" height="1.6"/>
    </g>
    <path class="tank-ribs" d="M6 ${top + 30} H94 M6 ${top + 56} H94 M6 ${top + 82} H94"/>
    <path class="tank-shell" d="M6 ${top + 8} Q6 ${top} 50 ${top - 6} Q94 ${top} 94 ${top + 8} V${h - 4} Q94 ${h} 90 ${h} H10 Q6 ${h} 6 ${h - 4} Z"/>
    <rect class="tank-lid" x="40" y="${top - 10}" width="20" height="5" rx="1.5"/>
  </svg>`;
}

function freshnessChip(state) {
  const f = freshness(state?.last_heard_at);
  const age = state?.last_heard_at ? ` <span class="chip-age" data-age="${esc(state.last_heard_at)}">${esc(ago(state.last_heard_at))}</span>` : '';
  return `<span class="chip chip-${f.key}"><span class="dot" aria-hidden="true"></span>${f.label}${age}</span>`;
}

function pumpLine(tank, pump, state) {
  const stale = freshness(state?.last_heard_at).key === 'offline';
  if (!pump) return `<p class="pump pump-unknown">${icon('pump')}<span>Pump status not reported yet</span></p>`;
  const since = `<span data-age="${esc(pump.since)}">${esc(ago(pump.since))}</span>`;
  if (pump.state === 'running') {
    return `<p class="pump pump-running">${icon('pump')}<span><strong>Filling</strong>, pump running since ${esc(timeFmt.format(new Date(pump.since)))} (${since})${stale ? '. Last reported; the tank unit is offline.' : ''}</span></p>`;
  }
  if (pump.state === 'fault') {
    return `<div class="pump pump-fault" role="alert">${icon('alert')}<span><strong>Pump stopped by a safety check</strong> ${esc(when(pump.since))}. The tank wasn't filling as expected. Check the pump, pipes and water supply, then turn the pump controller off and on again to reset it.</span></div>`;
  }
  return `<p class="pump pump-stopped">${icon('pump')}<span>Pump off since ${esc(when(pump.since))}</span></p>`;
}

function sensorWarning(state) {
  if (state?.sensor_status !== 'fault') return '';
  return `<div class="banner banner-crit" role="alert">${icon('alert')}<span><strong>Level sensor fault.</strong> This reading may be wrong, so the tank won't ask for water until the sensor reads normally. Check the probe and its cable.</span></div>`;
}

function icon(name) {
  const paths = {
    pump: '<circle cx="12" cy="12" r="8"/><path d="M12 12 8 6M12 12l6 2M12 12l-2 7"/>',
    alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    signal: '',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${paths[name]}</svg>`;
}

function signal(rssi) {
  const n = signalBars(rssi);
  const label = rssi == null ? 'Signal unknown' : `Radio signal ${['', 'weak', 'fair', 'good', 'strong'][n]} (${rssi} dBm)`;
  return `<span class="signal" title="${esc(label)}"><span class="visually-hidden">${esc(label)}</span>${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}" style="height:${4 + i * 3}px"></i>`).join('')}</span>`;
}

// ---------------------------------------------------------------------------
// All tanks
// ---------------------------------------------------------------------------

function renderOverview(isUpdate = false) {
  document.title = 'Your tanks | Kinetiq Tank Monitor';
  const tanks = site.tanks;
  const filling = tanks.filter((t) => site.pumpByTank.get(t.id)?.state === 'running').length;
  const offline = tanks.filter((t) => freshness(site.stateByTank.get(t.id)?.last_heard_at).key === 'offline').length;
  const summary = [
    `${tanks.length} tank${tanks.length === 1 ? '' : 's'}`,
    filling ? `${filling} filling` : null,
    offline ? `${offline} offline` : null,
  ].filter(Boolean).join(', ');

  const cards = tanks.map((t) => {
    const st = site.stateByTank.get(t.id);
    const pump = site.pumpByTank.get(t.id);
    const f = freshness(st?.last_heard_at);
    return `
    <a class="tank-card tank-${f.key}" href="#/tank/${encodeURIComponent(t.id)}">
      <div class="card-head">
        <h2>${esc(t.name)}</h2>
        ${freshnessChip(st)}
      </div>
      ${sensorWarning(st)}
      <div class="card-body">
        ${tankGraphic(st?.tank_percent, f.key)}
        <div class="card-figures">
          <p class="big-pct">${st ? nf0.format(st.tank_percent) : '–'}<small>%</small></p>
          <p class="litres">${st ? `${nf0.format(st.tank_volume_l)} L` : 'No reading yet'}${t.capacity_l ? `<span> of ${nf0.format(t.capacity_l)} L</span>` : ''}</p>
          ${st ? `<p class="height">${nf2.format(st.water_height_m)} m deep</p>` : ''}
        </div>
      </div>
      ${st ? usageBlock(t, 'card-usage') : ''}
      <div class="card-foot">
        ${pumpLine(t, pump, st)}
        ${signal(st?.lora_rssi)}
      </div>
    </a>`;
  }).join('');

  const html = `
    <div class="page-head">
      <h1>Your tanks</h1>
      <p class="page-sub">${esc(summary)}</p>
    </div>
    ${tanks.length ? `<div class="tank-grid">${cards}</div>` : `
    <section class="empty"><h2>Waiting for the first reading</h2>
      <p>Your receiver is linked. Tanks appear here automatically as soon as each tank unit sends its first reading (every 20 seconds).</p></section>`}`;

  if (isUpdate && document.querySelector('.tank-grid, .empty')) {
    document.getElementById('main').innerHTML = html;
    document.getElementById('receiver-banner').innerHTML = receiverBanner();
    updateReceiverPill();
    fillUsage();
    return;
  }
  app.innerHTML = shell(html);
  bindShell();
  fillUsage();
}

function updateReceiverPill() {
  const pill = document.getElementById('receiver-pill');
  if (!pill) return;
  const rs = receiverStatus();
  pill.className = `pill pill-${rs.key}`;
  document.getElementById('receiver-text').textContent = rs.text;
}

function refreshAges() {
  document.querySelectorAll('[data-age]').forEach((el) => { el.textContent = ago(el.dataset.age); });
  if (!site) return;
  updateReceiverPill();
  // Freshness changes with time even without new data.
  if (!currentTankId()) {
    const cards = [...document.querySelectorAll('.tank-card')];
    const changed = cards.some((card, i) => {
      const t = site.tanks[i];
      return t && !card.classList.contains(`tank-${freshness(site.stateByTank.get(t.id)?.last_heard_at).key}`);
    });
    if (changed) renderOverview(true);
  }
}

// ---------------------------------------------------------------------------
// One tank
// ---------------------------------------------------------------------------

const RANGES = {
  '24h': { label: '24 hours', ms: 86400_000, bucket: 300 },
  '7d': { label: '7 days', ms: 7 * 86400_000, bucket: 1800 },
  '30d': { label: '30 days', ms: 30 * 86400_000, bucket: 7200 },
};

function tankHeader(t) {
  const st = site.stateByTank.get(t.id);
  const f = freshness(st?.last_heard_at);
  return `
    <div class="detail-head">
      <div class="detail-title">
        <h1 id="tank-name">${esc(t.name)}</h1>
        <button class="link-btn" type="button" id="rename-btn">Rename</button>
        ${freshnessChip(st)}
      </div>
      ${sensorWarning(st)}
      <div class="detail-top">
        ${tankGraphic(st?.tank_percent, f.key, 'lg')}
        <dl class="figures">
          <div class="fig-main"><dt>Level</dt><dd>${st ? nf1.format(st.tank_percent) : '–'}<small>%</small></dd></div>
          <div><dt>Water</dt><dd>${st ? nf0.format(st.tank_volume_l) : '–'}<small> L</small></dd>${t.capacity_l ? `<p>of ${nf0.format(t.capacity_l)} L</p>` : ''}</div>
          <div><dt>Depth</dt><dd>${st ? nf2.format(st.water_height_m) : '–'}<small> m</small></dd>${t.height_m ? `<p>of ${nf2.format(t.height_m)} m</p>` : ''}</div>
          <div><dt>Last reading</dt><dd class="fig-small">${st ? esc(when(st.last_heard_at)) : 'None yet'}</dd>${st?.heard_at_approx ? '<p>Time approximate</p>' : ''}</div>
        </dl>
      </div>
      ${st ? `${usageBlock(t, 'detail-usage')}<p class="usage-note">Average use is worked out from the last ${USAGE_DAYS} days, leaving out times the pump was filling. Water left assumes that rate, with no refill or rain.</p>` : ''}
      ${pumpLine(t, site.pumpByTank.get(t.id), st)}
    </div>`;
}

function renderTank(id) {
  const t = site.tanks.find((x) => x.id === id);
  document.title = `${t.name} | Kinetiq Tank Monitor`;
  const st = site.stateByTank.get(t.id);

  app.innerHTML = shell(`
    <a class="back" href="#/">${icon('back')}All tanks</a>
    <section id="tank-live" aria-live="polite">${tankHeader(t)}</section>

    <section class="panel" aria-labelledby="chart-title">
      <div class="panel-head">
        <h2 id="chart-title">Tank level</h2>
        <div class="seg" role="group" aria-label="Time range">
          ${Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === chartRange}">${r.label}</button>`).join('')}
        </div>
      </div>
      <p class="panel-sub">Percent full. Shaded bands show when the pump was running${t.fill_start_percent != null ? `; dashed lines show where filling starts (${nf0.format(t.fill_start_percent)}%) and stops (${nf0.format(t.fill_stop_percent)}%)` : ''}.</p>
      <div class="chart-wrap" id="chart-wrap"><div class="chart-loading">Loading chart…</div></div>
    </section>

    <div class="detail-grid">
      <section class="panel" aria-labelledby="runs-title">
        <h2 id="runs-title">Pump runs</h2>
        <div id="runs"><p class="muted">Loading…</p></div>
      </section>

      <section class="panel" aria-labelledby="info-title">
        <h2 id="info-title">Tank details</h2>
        <form id="tank-form" class="tank-form" novalidate>
          <label for="f-name">Name</label>
          <input id="f-name" name="name" maxlength="40" value="${esc(t.name)}" required>
          <div class="form-row">
            <div><label for="f-cap">Capacity (L)</label><input id="f-cap" name="capacity_l" type="number" min="1" step="1" inputmode="numeric" value="${t.capacity_l ?? ''}" placeholder="e.g. 30000"></div>
            <div><label for="f-h">Height (m)</label><input id="f-h" name="height_m" type="number" min="0.1" step="0.01" inputmode="decimal" value="${t.height_m ?? ''}" placeholder="e.g. 3.0"></div>
          </div>
          <p class="form-hint">For display only. The tank unit uses the size set in its own settings.</p>
          <p class="form-msg" id="tank-form-msg" role="status"></p>
          <button class="btn btn-primary btn-sm" type="submit">Save</button>
        </form>
        <dl class="info">
          <div><dt>Tank unit</dt><dd>Node ${t.tank_node}</dd></div>
          <div><dt>Pump controller</dt><dd>${t.controller_node ? `Node ${t.controller_node}` : 'Not reported yet'}</dd></div>
          <div><dt>Radio signal</dt><dd>${st?.lora_rssi != null ? `${signal(st.lora_rssi)} ${st.lora_rssi} dBm` : 'Unknown'}</dd></div>
          <div><dt>Route</dt><dd>${st?.hop_count ? `Relayed ${st.hop_count} time${st.hop_count > 1 ? 's' : ''}` : st ? 'Direct to the receiver' : 'Unknown'}</dd></div>
        </dl>
      </section>
    </div>`);
  bindShell();

  document.getElementById('rename-btn').addEventListener('click', () => {
    const input = document.getElementById('f-name');
    input.focus();
    input.select();
  });

  document.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    chartRange = b.dataset.range;
    document.querySelectorAll('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    loadChart(t);
  }));

  document.getElementById('tank-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const msg = document.getElementById('tank-form-msg');
    const name = f.name.value.trim();
    const cap = f.capacity_l.value === '' ? null : Number(f.capacity_l.value);
    const h = f.height_m.value === '' ? null : Number(f.height_m.value);
    if (!name) { msg.textContent = 'Enter a name for this tank.'; return; }
    if (cap != null && !(cap > 0)) { msg.textContent = 'Capacity must be more than 0 litres.'; return; }
    if (h != null && !(h > 0)) { msg.textContent = 'Height must be more than 0 metres.'; return; }
    msg.textContent = 'Saving…';
    try {
      await source.renameTank(t.id, { name, capacity_l: cap, height_m: h });
      Object.assign(t, { name, capacity_l: cap, height_m: h });
      msg.textContent = 'Saved.';
      usageCache.delete(t.id);   // capacity may have changed
      document.getElementById('tank-live').innerHTML = tankHeader(t);
      fillUsage();
      document.title = `${t.name} | Kinetiq Tank Monitor`;
    } catch (err) {
      msg.textContent = `Not saved: ${err.message}`;
    }
  });

  loadChart(t);
  fillUsage();
  chartTimer = setInterval(() => loadChart(t, true), 60_000);
}

function updateTankLive(id, table) {
  const t = site.tanks.find((x) => x.id === id);
  if (!t) return;
  const live = document.getElementById('tank-live');
  if (live) { live.innerHTML = tankHeader(t); fillUsage(); }
  document.getElementById('receiver-banner').innerHTML = receiverBanner();
  updateReceiverPill();
  if (table === 'pump_state') loadChart(t, true);
}

// ---------------------------------------------------------------------------
// Chart and pump runs
// ---------------------------------------------------------------------------

async function loadChart(t, quiet = false) {
  const wrap = document.getElementById('chart-wrap');
  if (!wrap) return;
  const range = RANGES[chartRange];
  const since = new Date(Date.now() - range.ms).toISOString();
  if (!quiet) wrap.innerHTML = '<div class="chart-loading">Loading chart…</div>';
  try {
    const [hist, events] = await Promise.all([
      source.history(t.id, since, range.bucket),
      source.pumpEvents(t.id, since),
    ]);
    const runs = pumpRuns(events, Date.parse(since));
    drawChart(wrap, t, hist, runs, Date.parse(since), range);
    renderRuns(runs);
  } catch (err) {
    wrap.innerHTML = `<p class="chart-loading">Couldn't load the chart: ${esc(err.message)}</p>`;
  }
}

// Turn running/stopped/fault events into runs [{ start, end, endState }].
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

function renderRuns(runs) {
  const el = document.getElementById('runs');
  if (!el) return;
  if (!runs.length) {
    el.innerHTML = `<p class="muted">The pump hasn't run in the last ${RANGES[chartRange].label}.</p>`;
    return;
  }
  const rows = runs.slice().reverse().slice(0, 12).map((r) => {
    const end = r.end ?? Date.now();
    const status = r.end == null ? '<span class="tag tag-running">Running now</span>'
      : r.endState === 'fault' ? '<span class="tag tag-fault">Stopped by safety check</span>'
      : '';
    return `<li>
      <span class="run-when">${r.startedBefore ? 'Before ' : ''}${esc(when(new Date(r.start).toISOString()))}</span>
      <span class="run-len">${esc(duration(end - r.start))}</span>
      ${status}
    </li>`;
  }).join('');
  const total = runs.reduce((ms, r) => ms + ((r.end ?? Date.now()) - r.start), 0);
  el.innerHTML = `<p class="runs-total">${runs.length} run${runs.length === 1 ? '' : 's'}, ${esc(duration(total))} in total over ${RANGES[chartRange].label}</p><ul class="runs">${rows}</ul>`;
}

function drawChart(wrap, t, hist, runs, since, range) {
  const now = Date.now();
  if (!hist.length) {
    wrap.innerHTML = `<p class="chart-loading">No readings in the last ${range.label}.</p>`;
    return;
  }
  const W = Math.max(320, wrap.clientWidth), H = 260;
  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const x = (ms) => pad.l + ((ms - since) / (now - since)) * (W - pad.l - pad.r);
  const y = (p) => pad.t + (1 - p / 100) * (H - pad.t - pad.b);

  // Line with breaks where readings stopped (gap of more than 2.5 buckets).
  const gap = range.bucket * 1000 * 2.5;
  let d = '', area = '', prev = null, segStart = null;
  const pts = hist.map((r) => ({ t: Date.parse(r.bucket) + (range.bucket * 500), p: r.avg_percent }));
  for (const pt of pts) {
    const X = x(pt.t).toFixed(1), Y = y(pt.p).toFixed(1);
    if (!prev || pt.t - prev.t > gap) {
      if (prev) area += `L${x(prev.t).toFixed(1)},${y(0)}Z`;
      d += `M${X},${Y}`;
      area += `M${X},${y(0)}L${X},${Y}`;
      segStart = pt;
    } else {
      d += `L${X},${Y}`;
      area += `L${X},${Y}`;
    }
    prev = pt;
  }
  if (prev) area += `L${x(prev.t).toFixed(1)},${y(0)}Z`;

  const bands = runs.map((r) => {
    const x1 = x(r.start), x2 = x(r.end ?? now);
    return `<rect class="c-run" x="${x1.toFixed(1)}" y="${pad.t}" width="${Math.max(1.5, x2 - x1).toFixed(1)}" height="${H - pad.t - pad.b}"><title>Pump ran ${esc(when(new Date(r.start).toISOString()))}, ${esc(duration((r.end ?? now) - r.start))}</title></rect>`;
  }).join('');

  const grid = [0, 25, 50, 75, 100].map((p) =>
    `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/><text class="c-axis" x="${pad.l - 8}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`).join('');

  const thresholds = t.fill_start_percent != null ? [t.fill_start_percent, t.fill_stop_percent].map((p) =>
    `<line class="c-threshold" x1="${pad.l}" x2="${W - pad.r}" y1="${y(p)}" y2="${y(p)}"/>`).join('') : '';

  // Time labels
  const ticks = [];
  if (range.ms <= 86400_000) {
    const first = new Date(since); first.setMinutes(0, 0, 0); first.setHours(first.getHours() + 1);
    for (let tt = first.getTime(); tt < now; tt += 3600_000) if (new Date(tt).getHours() % 4 === 0) ticks.push([tt, timeFmt.format(new Date(tt))]);
  } else {
    const step = range.ms <= 7 * 86400_000 ? 1 : 5;
    const first = new Date(since); first.setHours(0, 0, 0, 0); first.setDate(first.getDate() + 1);
    for (let tt = first.getTime(), i = 0; tt < now; tt += 86400_000, i++) if (i % step === 0) ticks.push([tt, step === 1 ? weekday.format(new Date(tt)) : shortDay.format(new Date(tt))]);
  }
  const xTicks = ticks.map(([tt, label]) => `<text class="c-axis" x="${x(tt).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(label)}</text>`).join('');

  wrap.innerHTML = `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t.name)} level over the last ${range.label}, from ${nf0.format(pts[0].p)}% to ${nf0.format(pts.at(-1).p)}%">
      ${grid}${bands}${thresholds}
      <path class="c-area" d="${area}"/>
      <path class="c-line" d="${d}"/>
      <line class="c-cursor" id="c-cursor" x1="0" x2="0" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/>
      <circle class="c-dot" id="c-dot" r="4" cx="0" cy="0" visibility="hidden"/>
      ${xTicks}
    </svg>
    <div class="c-tip" id="c-tip" hidden></div>`;

  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('#c-tip');
  const cursor = wrap.querySelector('#c-cursor');
  const dot = wrap.querySelector('#c-dot');
  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = pts[0];
    for (const p of pts) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    cursor.setAttribute('x1', x(best.t)); cursor.setAttribute('x2', x(best.t)); cursor.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', x(best.t)); dot.setAttribute('cy', y(best.p)); dot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.textContent = `${when(new Date(best.t).toISOString())}: ${nf1.format(best.p)}%`;
    const left = (x(best.t) / W) * rect.width;
    tip.style.left = `${Math.min(rect.width - 150, Math.max(0, left - 75))}px`;
  });
  svg.addEventListener('pointerleave', () => {
    tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden');
  });
}

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const id = currentTankId();
    const t = id && site?.tanks.find((x) => x.id === id);
    if (t) loadChart(t, true);
  }, 200);
});

start();
