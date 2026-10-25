#!/usr/bin/env node
// Receiver simulator for the Kinetiq Tank Monitor backend.
//
// Pretends to be a receiver (gateway): it models tanks that slowly empty and
// a pump that fills them between 70% and 90% (the same hysteresis as Tank
// Sender V4.x), and uploads in exactly the format Receiver V4.4 will use
// (schema 1, see supabase/migrations/0001_init.sql).
//
// Usage (from monitor/simulator):
//   node simulate.mjs --dry-run            print payloads, send nothing
//   node simulate.mjs                      send to Supabase (needs .env)
//   node simulate.mjs --tanks 3 --speed 30 --chaos
//
// Options:
//   --tanks N     number of tanks (1-10, default 2)
//   --speed X     run time X times faster (default 1 = real time, 20 s per reading)
//   --chaos       also send duplicates, late readings, garbage and reboots
//   --once        send one batch and exit
//   --dry-run     print what would be sent
//
// Settings come from monitor/simulator/.env (git-ignored), see .env.example:
//   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DEVICE_KEY, LORA_SYSTEM_ID

import { readFileSync, existsSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const envFile = new URL('./.env', import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const DRY_RUN = flag('dry-run');
const CHAOS = flag('chaos');
const ONCE = flag('once');
const TANKS = Math.min(10, Math.max(1, Number(opt('tanks', 2))));
const SPEED = Math.max(1, Number(opt('speed', 1)));

const SUPABASE_URL = process.env.SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const DEVICE_KEY = process.env.DEVICE_KEY;
const LORA_SYSTEM_ID = Number(process.env.LORA_SYSTEM_ID ?? 123456);

if (!DRY_RUN && (!SUPABASE_URL || !PUBLISHABLE_KEY || !DEVICE_KEY)) {
  console.error('Missing settings. Copy .env.example to .env and fill it in, or use --dry-run.');
  process.exit(1);
}

// Same timings as the firmware.
const TELEMETRY_INTERVAL_S = 20;     // Tank Sender TELEMETRY_INTERVAL
const UPLOAD_INTERVAL_S = 20;        // Receiver V4.4 upload rule
const FILL_START = 70;               // Tank Sender FILL_START_PERCENT
const FILL_STOP = 90;                // Tank Sender FILL_STOP_PERCENT
const CONTROLLER_NODE = 101;
const BUFFER_SIZE = 300;             // Receiver V4.4 ring buffer

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

// Tank 1 is a 3.0 m / 30,000 L tank like the bench unit; others vary.
const tanks = Array.from({ length: TANKS }, (_, i) => ({
  node: i + 1,
  heightM: i === 0 ? 3.0 : 2.4 + (i % 3) * 0.3,
  capacityL: i === 0 ? 30000 : 22000 + (i % 4) * 4000,
  percent: 72 + Math.random() * 15,
  usePerTick: 0.08 + Math.random() * 0.12,   // % per 20 s while not filling
  fillPerTick: 0.35 + Math.random() * 0.2,   // % per 20 s while pump runs
  pumpRunning: false,
  packetId: 1,
}));

let controllerPacketId = 1;
let bootId = Math.floor(Math.random() * 2 ** 32);
let uptimeS = 0;
let buffer = [];
let dropped = 0;
let simClock = Date.now();          // simulated "now" (runs SPEED times faster)
let backoffS = 0;

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

function push(msg) {
  if (buffer.length >= BUFFER_SIZE) { buffer.shift(); dropped++; }
  buffer.push(msg);
}

function tick() {
  simClock += TELEMETRY_INTERVAL_S * 1000;
  uptimeS += TELEMETRY_INTERVAL_S;
  const heardAt = new Date(Math.min(simClock, Date.now())).toISOString();

  for (const t of tanks) {
    t.percent += t.pumpRunning ? t.fillPerTick : -t.usePerTick;
    t.percent = Math.min(100, Math.max(0, t.percent + (Math.random() - 0.5) * 0.06));

    const msg = {
      kind: 'telemetry',
      lora_system_id: LORA_SYSTEM_ID,
      source_node: t.node,
      tank_node: t.node,
      packet_id: t.packetId++,
      hop_count: t.node > 3 ? 1 : 0,
      heard_at: heardAt,
      water_height_m: round((t.percent / 100) * t.heightM, 3),
      tank_percent: round(t.percent, 1),
      tank_volume_l: round((t.percent / 100) * t.capacityL, 0),
      sensor_status: 'ok',
      lora_rssi: -70 - t.node * 4 - Math.round(Math.random() * 6),
      lora_snr: round(9 - t.node * 0.6 + Math.random(), 2),
    };
    push(msg);

    // Pump logic (sender decides, controller confirms with a STATUS)
    let newState = null;
    if (!t.pumpRunning && t.percent < FILL_START) newState = 'running';
    if (t.pumpRunning && t.percent >= FILL_STOP) newState = 'stopped';
    if (newState) {
      t.pumpRunning = newState === 'running';
      push({
        kind: 'pump_status',
        lora_system_id: LORA_SYSTEM_ID,
        source_node: CONTROLLER_NODE,
        tank_node: t.node,
        packet_id: controllerPacketId++,
        hop_count: 0,
        heard_at: heardAt,
        pump_state: newState,
      });
      console.log(`  Tank ${t.node}: pump ${newState.toUpperCase()} at ${t.percent.toFixed(1)}%`);
    }

    if (CHAOS) {
      const r = Math.random();
      if (r < 0.10) push({ ...msg, hop_count: (msg.hop_count ?? 0) + 1 });            // relayed duplicate
      else if (r < 0.13) push({ ...msg, packet_id: msg.packet_id + 100000,            // reading delivered late
                               heard_at: new Date(Date.parse(heardAt) - 8 * 60_000).toISOString(),
                               tank_percent: round(Math.max(0, t.percent - 3), 1) });
      else if (r < 0.15) push({ ...msg, packet_id: msg.packet_id + 200000, tank_percent: 140 });  // garbage
    }
  }

  if (CHAOS && Math.random() < 0.01) {
    bootId = Math.floor(Math.random() * 2 ** 32);
    uptimeS = 0;
    console.log('  (chaos) receiver reboot');
  }
}

// ---------------------------------------------------------------------------
// Upload (the same rules Receiver V4.4 will follow)
// ---------------------------------------------------------------------------

async function upload() {
  const batch = buffer.slice(0, 50);
  const body = {
    p_token: DEVICE_KEY ?? 'dry-run',
    p_payload: {
      schema: 1,
      gateway: {
        boot_id: bootId, firmware: 'simulator-1.0', uptime_s: uptimeS,
        wifi_rssi: -58 - Math.round(Math.random() * 6), buffer_used: buffer.length, buffer_dropped: dropped,
      },
      messages: batch,
    },
  };

  if (DRY_RUN) {
    console.log(JSON.stringify(body.p_payload, null, 2));
    buffer = buffer.slice(batch.length);
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ingest`, {
      method: 'POST',
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

    const r = JSON.parse(text);
    // Any result (accepted, duplicate or rejected) means the server has it.
    buffer = buffer.slice(batch.length);
    backoffS = 0;
    const rejected = r.results.filter((x) => x.result === 'rejected');
    console.log(`${new Date().toLocaleTimeString()}  sent ${batch.length}: ` +
      `${r.accepted} accepted, ${r.duplicates} duplicate, ${r.rejected} rejected` +
      (rejected.length ? `  (${rejected[0].reason})` : '') +
      `  | buffer ${buffer.length}`);
  } catch (err) {
    backoffS = Math.min(300, backoffS ? backoffS * 2 : 5);
    console.log(`${new Date().toLocaleTimeString()}  upload failed, keeping ${buffer.length} buffered, ` +
      `retry in ${backoffS}s: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(`Simulating ${TANKS} tank(s), system ${LORA_SYSTEM_ID}, ${SPEED}x speed` +
  `${CHAOS ? ', chaos on' : ''}${DRY_RUN ? ', dry run' : ''}`);

tick();
await upload();
if (ONCE) process.exit(0);

const wait = (s) => new Promise((r) => setTimeout(r, (s * 1000) / SPEED));
let sinceUpload = 0;
for (;;) {
  await wait(TELEMETRY_INTERVAL_S);
  tick();
  sinceUpload += TELEMETRY_INTERVAL_S;
  if (sinceUpload >= Math.max(UPLOAD_INTERVAL_S, backoffS)) {
    sinceUpload = 0;
    await upload();
  }
}
