// Data sources for the dashboard. Both expose the same methods so the screens
// don't care where the data comes from:
//
//   getSession(), signIn(email, password), signOut(), resetPassword(email)
//   loadSite()                     -> { installation, gateways, tanks, tankState, pumpState }
//   history(tankId, sinceIso, bucketSeconds) -> [{ bucket, avg_percent, min_percent, max_percent }]
//   pumpEvents(tankId, sinceIso)  -> [{ state, heard_at, controller_node }] oldest first
//   renameTank(tankId, fields)
//   subscribe(onChange)           -> unsubscribe()   onChange({ table, row })
//
// SupabaseSource reads the real database (see ../supabase/migrations).
// DemoSource simulates a farm in the browser, with the same rules as the
// firmware (fill starts below 70%, stops at 90%, readings every 20 s).

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

export async function createSupabaseSource() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let installationId = null;

  const must = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    demo: false,

    async getSession() {
      return must(await sb.auth.getSession()).session;
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials'
        ? 'That email and password don\'t match an account.' : error.message);
    },

    async signOut() { await sb.auth.signOut(); },

    async resetPassword(email) {
      must(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] }));
    },

    async loadSite() {
      const installs = must(await sb.from('installations').select('*').order('created_at'));
      if (!installs.length) return null;
      const installation = installs[0];
      installationId = installation.id;
      const [gateways, tanks, tankState, pumpState] = await Promise.all([
        sb.from('gateways').select('*').eq('installation_id', installationId).is('revoked_at', null),
        sb.from('tanks').select('*').eq('installation_id', installationId).order('tank_node'),
        sb.from('tank_state').select('*').eq('installation_id', installationId),
        sb.from('pump_state').select('*').eq('installation_id', installationId),
      ]).then((rs) => rs.map(must));
      return { installation, installations: installs, gateways, tanks, tankState, pumpState };
    },

    async history(tankId, sinceIso, bucketSeconds) {
      return must(await sb.rpc('tank_history', { p_tank_id: tankId, p_since: sinceIso, p_bucket_seconds: bucketSeconds }));
    },

    async pumpEvents(tankId, sinceIso) {
      // Include the last event before the window so a run already in progress shows.
      const [inWindow, before] = await Promise.all([
        sb.from('pump_events').select('state, heard_at, controller_node')
          .eq('tank_id', tankId).gte('heard_at', sinceIso).order('heard_at').limit(1000),
        sb.from('pump_events').select('state, heard_at, controller_node')
          .eq('tank_id', tankId).lt('heard_at', sinceIso).order('heard_at', { ascending: false }).limit(1),
      ]).then((rs) => rs.map(must));
      return [...before, ...inWindow];
    },

    async renameTank(tankId, fields) {
      must(await sb.from('tanks').update(fields).eq('id', tankId));
    },

    subscribe(onChange) {
      if (!installationId) return () => {};
      const filter = `installation_id=eq.${installationId}`;
      const ch = sb.channel(`site-${installationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tank_state', filter }, (p) => onChange({ table: 'tank_state', row: p.new }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pump_state', filter }, (p) => onChange({ table: 'pump_state', row: p.new }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gateways', filter }, (p) => onChange({ table: 'gateways', row: p.new }))
        .subscribe();
      return () => sb.removeChannel(ch);
    },
  };
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

const STEP_S = 300;                   // history resolution: 5 minutes
const DAYS = 31;
const LIVE_TICK_MS = 4000;            // demo moves faster than real time

// A small deterministic random generator so the demo looks the same each load.
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// Household-style use: low overnight, peaks morning and evening (litres/hour).
function useLph(date, base) {
  const h = date.getHours() + date.getMinutes() / 60;
  const morning = Math.exp(-((h - 7.5) ** 2) / 2.5);
  const evening = Math.exp(-((h - 18.5) ** 2) / 3);
  return base * (0.25 + 1.6 * morning + 1.3 * evening);
}

function simulateTank(spec, now) {
  const rand = rng(spec.seed);
  const start = now - DAYS * 86400_000;
  let litres = spec.capacity * spec.startPercent / 100;
  let pumping = false;
  const points = [];
  const events = [];
  let packet = 1;

  for (let t = start; t <= now; t += STEP_S * 1000) {
    const d = new Date(t);
    const dayFactor = 0.8 + 0.4 * Math.sin((t / 86400_000) * 0.9 + spec.seed);
    litres -= useLph(d, spec.baseUse * dayFactor) * (STEP_S / 3600) * (0.8 + rand() * 0.4);
    if (pumping) litres += spec.pumpLpm * (STEP_S / 60);
    litres = Math.max(0, Math.min(spec.capacity, litres));
    const pct = (litres / spec.capacity) * 100;

    if (!pumping && pct < spec.start) { pumping = true;  events.push({ state: 'running', heard_at: new Date(t).toISOString(), controller_node: 100 + spec.node }); }
    else if (pumping && pct >= spec.stop) { pumping = false; events.push({ state: 'stopped', heard_at: new Date(t).toISOString(), controller_node: 100 + spec.node }); }

    points.push({ t, pct });
    packet += STEP_S / 20;
  }
  return { points, events, litres, pumping, packet };
}

export function createDemoSource() {
  const now = Date.now();
  const installation = { id: 'demo', name: 'Demo farm', lora_system_id: 123456, timezone: 'Pacific/Auckland' };

  const specs = [
    { id: 't1', node: 1, capacity: 30000, height: 3.0, start: 70, stop: 90, startPercent: 74, baseUse: 260, pumpLpm: 45, seed: 11 },
    { id: 't2', node: 2, capacity: 22000, height: 2.4, start: 70, stop: 90, startPercent: 86, baseUse: 150, pumpLpm: 38, seed: 23 },
    { id: 't3', node: 3, capacity: 25000, height: 2.7, start: 70, stop: 90, startPercent: 80, baseUse: 120, pumpLpm: 40, seed: 37 },
  ];

  const sims = new Map();
  const tanks = [];
  const tankState = [];
  const pumpState = [];

  for (const s of specs) {
    const sim = simulateTank(s, now);
    // Tank 3's unit went quiet 2 hours ago (shows the Offline state).
    if (s.id === 't3') sim.points = sim.points.filter((p) => p.t < now - 2 * 3600_000);
    sims.set(s.id, { spec: s, ...sim });

    tanks.push({
      id: s.id, installation_id: 'demo', tank_node: s.node, name: `Tank ${s.node}`,
      height_m: s.height, capacity_l: s.capacity, fill_start_percent: s.start, fill_stop_percent: s.stop, controller_node: 100 + s.node, low_alert_percent: 25,
    });
    const last = sim.points.at(-1);
    tankState.push(stateRow(s, last.pct, new Date(last.t).toISOString(), s.id === 't3' ? -97 : -78 - s.node * 3));
    const lastEvent = sim.events.at(-1);
    if (lastEvent) pumpState.push({ tank_id: s.id, installation_id: 'demo', controller_node: 100 + s.node, state: lastEvent.state, since: lastEvent.heard_at });
  }

  // Make the demo open part-way through a fill on Tank 1: the level dipped
  // below 70% about 50 minutes ago and has been rising since.
  {
    const t1 = sims.get('t1');
    const fillStart = now - 50 * 60_000;
    const dipStart = fillStart - 6 * 3600_000;
    const startPct = t1.points.find((p) => p.t >= dipStart).pct;
    t1.points = t1.points.map((p) => {
      if (p.t < dipStart) return p;
      if (p.t < fillStart) return { t: p.t, pct: startPct + (69.4 - startPct) * ((p.t - dipStart) / (fillStart - dipStart)) };
      return { t: p.t, pct: 69.4 + 7.2 * ((p.t - fillStart) / (now - fillStart)) };
    });
    t1.events = t1.events.filter((e) => Date.parse(e.heard_at) < dipStart);
    if (t1.events.at(-1)?.state === 'running') t1.events.push({ state: 'stopped', heard_at: new Date(dipStart).toISOString(), controller_node: 101 });
    const ev = { state: 'running', heard_at: new Date(fillStart).toISOString(), controller_node: 101 };
    t1.events.push(ev);
    t1.pumping = true;
    const last = t1.points.at(-1);
    Object.assign(tankState.find((x) => x.tank_id === 't1'), stateRow(t1.spec, last.pct, new Date(last.t).toISOString(), -81));
    const ps = pumpState.find((p) => p.tank_id === 't1');
    if (ps) Object.assign(ps, { state: 'running', since: ev.heard_at });
    else pumpState.push({ tank_id: 't1', installation_id: 'demo', controller_node: 101, state: 'running', since: ev.heard_at });
  }

  const gateways = [{
    id: 'g1', installation_id: 'demo', name: 'House receiver', firmware: 'receiver-4.4',
    last_seen_at: new Date(now).toISOString(), wifi_rssi: -61, uptime_s: 6 * 86400 + 3 * 3600, buffer_used: 0, buffer_dropped: 0,
  }];

  function stateRow(spec, pct, iso, rssi) {
    return {
      tank_id: spec.id, installation_id: 'demo', last_heard_at: iso, heard_at_approx: false,
      water_height_m: +(pct / 100 * spec.height).toFixed(3), tank_percent: +pct.toFixed(1),
      tank_volume_l: Math.round(pct / 100 * spec.capacity), sensor_status: 'ok',
      lora_rssi: rssi, lora_snr: 8.5, hop_count: 0,
    };
  }

  let listeners = [];
  let timer = null;

  function liveTick() {
    const t = Date.now();
    for (const id of ['t1', 't2']) {
      const sim = sims.get(id);
      const s = sim.spec;
      const lastPct = sim.points.at(-1).pct;
      let litres = s.capacity * lastPct / 100;
      litres -= useLph(new Date(t), s.baseUse) * (20 / 3600);
      if (sim.pumping) litres += s.pumpLpm * (20 / 60) * 6;   // sped up so the demo visibly moves
      const pct = Math.max(0, Math.min(100, (litres / s.capacity) * 100));
      sim.points.push({ t, pct });

      const iso = new Date(t).toISOString();
      const row = stateRow(s, pct, iso, -78 - s.node * 3);
      Object.assign(tankState.find((x) => x.tank_id === id), row);
      listeners.forEach((fn) => fn({ table: 'tank_state', row }));

      let change = null;
      if (!sim.pumping && pct < s.start) change = 'running';
      if (sim.pumping && pct >= s.stop) change = 'stopped';
      if (change) {
        sim.pumping = change === 'running';
        sim.events.push({ state: change, heard_at: iso, controller_node: 100 + s.node });
        const ps = { tank_id: id, installation_id: 'demo', controller_node: 100 + s.node, state: change, since: iso };
        const existing = pumpState.find((p) => p.tank_id === id);
        if (existing) Object.assign(existing, ps); else pumpState.push(ps);
        listeners.forEach((fn) => fn({ table: 'pump_state', row: ps }));
      }
    }
    gateways[0].last_seen_at = new Date(t).toISOString();
    listeners.forEach((fn) => fn({ table: 'gateways', row: gateways[0] }));
  }

  return {
    demo: true,
    async getSession() { return { user: { email: 'demo@kinetiq.example' } }; },
    async signIn() {},
    async signOut() {},
    async resetPassword() {},

    async loadSite() {
      return {
        installation, installations: [installation],
        gateways: structuredClone(gateways), tanks: structuredClone(tanks),
        tankState: structuredClone(tankState), pumpState: structuredClone(pumpState),
      };
    },

    async history(tankId, sinceIso, bucketSeconds) {
      const since = Date.parse(sinceIso);
      const size = bucketSeconds * 1000;
      const buckets = new Map();
      for (const p of sims.get(tankId).points) {
        if (p.t < since) continue;
        const key = Math.floor(p.t / size) * size;
        const b = buckets.get(key) ?? { sum: 0, n: 0, min: 101, max: -1 };
        b.sum += p.pct; b.n++; b.min = Math.min(b.min, p.pct); b.max = Math.max(b.max, p.pct);
        buckets.set(key, b);
      }
      return [...buckets].map(([k, b]) => ({
        bucket: new Date(k).toISOString(), avg_percent: b.sum / b.n, min_percent: b.min, max_percent: b.max, readings: b.n,
      }));
    },

    async pumpEvents(tankId, sinceIso) {
      const since = Date.parse(sinceIso);
      const all = sims.get(tankId).events;
      const before = all.filter((e) => Date.parse(e.heard_at) < since).slice(-1);
      return [...before, ...all.filter((e) => Date.parse(e.heard_at) >= since)];
    },

    async renameTank(tankId, fields) {
      Object.assign(tanks.find((t) => t.id === tankId), fields);
    },

    subscribe(onChange) {
      listeners.push(onChange);
      timer ??= setInterval(liveTick, LIVE_TICK_MS);
      return () => {
        listeners = listeners.filter((fn) => fn !== onChange);
        if (!listeners.length) { clearInterval(timer); timer = null; }
      };
    },
  };
}
