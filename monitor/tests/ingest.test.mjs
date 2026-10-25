// Runs the real migration in an in-process PostgreSQL (PGlite) with stand-ins
// for the parts of Supabase it relies on (roles, auth.uid(), the realtime
// publication), then checks every ingest and access rule.
//
//   cd monitor/tests && npm install && npm test

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const MIGRATION = process.env.MIGRATION ?? new URL('../supabase/migrations/0001_init.sql', import.meta.url);

const USER_A = '00000000-0000-4000-8000-00000000000a';
const USER_B = '00000000-0000-4000-8000-00000000000b';
const SYSTEM_A = 123456;
const SYSTEM_B = 777;

let db, tokenA, tokenB, instA;

// Minimal Supabase environment.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create publication supabase_realtime;
`;

const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();

function telemetry(over = {}) {
  return {
    kind: 'telemetry', lora_system_id: SYSTEM_A, source_node: 1, tank_node: 1,
    packet_id: 1, hop_count: 0, heard_at: iso(), water_height_m: 2.1,
    tank_percent: 70, tank_volume_l: 21000, lora_rssi: -84, lora_snr: 9.5, ...over,
  };
}

function pump(over = {}) {
  return {
    kind: 'pump_status', lora_system_id: SYSTEM_A, source_node: 101, tank_node: 1,
    packet_id: 1, hop_count: 0, heard_at: iso(), pump_state: 'running', ...over,
  };
}

const payload = (messages, gateway = { boot_id: 1, firmware: 'receiver-4.4' }) =>
  ({ schema: 1, gateway, messages });

async function ingest(token, body) {
  const r = await db.query('select public.ingest($1, $2) as r', [token, body]);
  return r.rows[0].r;
}

async function one(sql, params = []) {
  return (await db.query(sql, params)).rows[0];
}

// Run fn as a logged-in customer (or anon), then return to the superuser.
async function as(role, userId, fn) {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  try { return await fn(); }
  finally { await db.exec('reset role'); }
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync(MIGRATION, 'utf8'));

  await db.query('insert into auth.users (id) values ($1), ($2)', [USER_A, USER_B]);
  instA = (await one(`insert into installations (owner_id, name, lora_system_id)
                      values ($1, 'Drummond farm', $2) returning id`, [USER_A, SYSTEM_A])).id;
  const instB = (await one(`insert into installations (owner_id, name, lora_system_id)
                            values ($1, 'Neighbour', $2) returning id`, [USER_B, SYSTEM_B])).id;
  tokenA = (await one('select create_gateway($1) as t', [instA])).t;
  tokenB = (await one('select create_gateway($1) as t', [instB])).t;
});

// ---------------------------------------------------------------------------
// Device keys
// ---------------------------------------------------------------------------

test('device keys are long, random and stored only as a hash', async () => {
  assert.equal(tokenA.length, 64);
  assert.notEqual(tokenA, tokenB);
  const stored = await one('select token_hash from gateway_keys limit 1');
  assert.notEqual(stored.token_hash, tokenA);
  assert.equal(stored.token_hash.length, 64);
});

test('an unknown or short device key is refused', async () => {
  await assert.rejects(ingest('x'.repeat(64), payload([telemetry()])), /invalid device key/);
  await assert.rejects(ingest('short', payload([telemetry()])), /invalid device key/);
  await assert.rejects(ingest(null, payload([telemetry()])), /invalid device key/);
});

// ---------------------------------------------------------------------------
// Normal telemetry
// ---------------------------------------------------------------------------

test('a reading is stored, the tank is created as "Tank 1" and current state is set', async () => {
  const r = await ingest(tokenA, payload([telemetry({ packet_id: 10, heard_at: iso(60_000) })]));
  assert.equal(r.accepted, 1);
  assert.deepEqual(r.results, [{ i: 0, result: 'accepted' }]);

  const tank = await one('select * from tanks where installation_id = $1 and tank_node = 1', [instA]);
  assert.equal(tank.name, 'Tank 1');

  const state = await one('select * from tank_state where tank_id = $1', [tank.id]);
  assert.equal(state.tank_percent, 70);
  assert.equal(state.water_height_m, 2.1);
  assert.equal(state.tank_volume_l, 21000);
  assert.equal(state.heard_at_approx, false);
});

test('the same packet heard twice (retry or relay) is stored once', async () => {
  const msg = telemetry({ packet_id: 11, heard_at: iso(50_000) });
  const r = await ingest(tokenA, payload([msg, { ...msg, hop_count: 1 }]));
  assert.equal(r.accepted, 1);
  assert.equal(r.duplicates, 1);
  const n = await one(`select count(*)::int as n from readings r join tanks t on t.id = r.tank_id
                       where t.installation_id = $1 and r.packet_id = 11`, [instA]);
  assert.equal(n.n, 1);
});

test('after a sender reboot, a reused packet id is a new reading', async () => {
  const early = telemetry({ packet_id: 2, heard_at: iso(40 * 60_000), tank_percent: 50 });
  const later = telemetry({ packet_id: 2, heard_at: iso(5 * 60_000),  tank_percent: 51 });
  const r = await ingest(tokenA, payload([early, later]));
  assert.equal(r.accepted, 2);
});

test('a late, older reading goes into history but never replaces a newer current value', async () => {
  await ingest(tokenA, payload([telemetry({ packet_id: 20, heard_at: iso(1_000), tank_percent: 75 })]));
  const r = await ingest(tokenA, payload([telemetry({ packet_id: 19, heard_at: iso(10 * 60_000), tank_percent: 40 })]));
  assert.equal(r.accepted, 1);
  const state = await one(`select s.tank_percent from tank_state s join tanks t on t.id = s.tank_id
                           where t.installation_id = $1 and t.tank_node = 1`, [instA]);
  assert.equal(state.tank_percent, 75);
});

test('a reading with no receiver clock time is stored with the server time, marked approximate', async () => {
  const r = await ingest(tokenA, payload([telemetry({ tank_node: 2, source_node: 2, packet_id: 1, heard_at: null })]));
  assert.equal(r.accepted, 1);
  const s = await one(`select s.heard_at_approx from tank_state s join tanks t on t.id = s.tank_id
                       where t.installation_id = $1 and t.tank_node = 2`, [instA]);
  assert.equal(s.heard_at_approx, true);
});

test('sensor status from Tank Sender V4.4 is kept', async () => {
  await ingest(tokenA, payload([telemetry({ tank_node: 3, source_node: 3, packet_id: 1, sensor_status: 'fault' })]));
  const s = await one(`select s.sensor_status from tank_state s join tanks t on t.id = s.tank_id
                       where t.installation_id = $1 and t.tank_node = 3`, [instA]);
  assert.equal(s.sensor_status, 'fault');
});

// ---------------------------------------------------------------------------
// Bad data is rejected and quarantined, one message at a time
// ---------------------------------------------------------------------------

test('bad messages are rejected with a reason while good ones in the same batch are kept', async () => {
  const before = (await one('select count(*)::int as n from quarantine')).n;
  const bad = [
    telemetry({ packet_id: 900, tank_percent: 140 }),
    telemetry({ packet_id: 901, lora_system_id: SYSTEM_B }),
    telemetry({ packet_id: 902, heard_at: new Date(Date.now() + 60 * 60_000).toISOString() }),
    telemetry({ packet_id: 903, heard_at: 'yesterday-ish' }),
    telemetry({ packet_id: 904, tank_node: 11, source_node: 11 }),
    telemetry({ packet_id: 905, source_node: 2 }),
    telemetry({ packet_id: 906, tank_percent: '70' }),
    telemetry({ packet_id: 907, water_height_m: -0.5 }),
    { ...telemetry({ packet_id: 908 }), kind: 'gps_fix' },
    (() => { const m = telemetry({ packet_id: 909 }); delete m.kind; return m; })(),
    (() => { const m = telemetry({ packet_id: 910 }); delete m.tank_percent; return m; })(),
    'not an object',
    pump({ packet_id: 911, source_node: 5 }),
    pump({ packet_id: 912, pump_state: 'exploded' }),
    telemetry({ packet_id: 913, packet_id: 1.5 }),
  ];
  const good = telemetry({ packet_id: 30, heard_at: iso(500) });
  const r = await ingest(tokenA, payload([...bad, good]));

  assert.equal(r.rejected, bad.length);
  assert.equal(r.accepted, 1);
  assert.equal(r.results.at(-1).result, 'accepted');
  for (const res of r.results.slice(0, -1)) {
    assert.equal(res.result, 'rejected');
    assert.ok(res.reason && res.reason.length > 3, `missing reason for message ${res.i}`);
  }
  const after = (await one('select count(*)::int as n from quarantine')).n;
  assert.equal(after - before, bad.length);
});

test('implausible signal values are dropped, not rejected', async () => {
  const r = await ingest(tokenA, payload([telemetry({ tank_node: 4, source_node: 4, packet_id: 1, lora_rssi: 999, lora_snr: -400 })]));
  assert.equal(r.accepted, 1);
  const s = await one(`select s.lora_rssi, s.lora_snr from tank_state s join tanks t on t.id = s.tank_id
                       where t.installation_id = $1 and t.tank_node = 4`, [instA]);
  assert.equal(s.lora_rssi, null);
  assert.equal(s.lora_snr, null);
});

test('an unsupported schema or an oversized batch is refused as a whole', async () => {
  await assert.rejects(ingest(tokenA, { schema: 2, messages: [] }), /unsupported schema/);
  await assert.rejects(ingest(tokenA, { messages: [] }), /unsupported schema/);
  const big = Array.from({ length: 101 }, (_, i) => telemetry({ packet_id: 5000 + i }));
  await assert.rejects(ingest(tokenA, payload(big)), /at most 100/);
});

// ---------------------------------------------------------------------------
// Pump status
// ---------------------------------------------------------------------------

test('pump status updates the current pump state and records the controller', async () => {
  const r = await ingest(tokenA, payload([pump({ packet_id: 40, heard_at: iso(2_000), pump_state: 'running' })]));
  assert.equal(r.accepted, 1);
  const s = await one(`select p.state, p.controller_node, t.controller_node as tank_ctrl
                       from pump_state p join tanks t on t.id = p.tank_id
                       where t.installation_id = $1 and t.tank_node = 1`, [instA]);
  assert.equal(s.state, 'running');
  assert.equal(s.controller_node, 101);
  assert.equal(s.tank_ctrl, 101);
});

test('a late "stopped" report does not override a newer "running"', async () => {
  await ingest(tokenA, payload([pump({ packet_id: 39, heard_at: iso(8 * 60_000), pump_state: 'stopped' })]));
  const s = await one(`select p.state from pump_state p join tanks t on t.id = p.tank_id
                       where t.installation_id = $1 and t.tank_node = 1`, [instA]);
  assert.equal(s.state, 'running');
});

test('a controller fault (fill-safety lockout) is recorded', async () => {
  await ingest(tokenA, payload([pump({ packet_id: 41, heard_at: iso(), pump_state: 'fault' })]));
  const s = await one(`select p.state from pump_state p join tanks t on t.id = p.tank_id
                       where t.installation_id = $1 and t.tank_node = 1`, [instA]);
  assert.equal(s.state, 'fault');
});

// ---------------------------------------------------------------------------
// Receiver health
// ---------------------------------------------------------------------------

test('receiver health, reboots and dropped readings are tracked', async () => {
  await ingest(tokenA, payload([], { boot_id: 1, firmware: 'receiver-4.4', uptime_s: 100, wifi_rssi: -60, buffer_used: 0, buffer_dropped: 0 }));
  await ingest(tokenA, payload([], { boot_id: 2, firmware: 'receiver-4.4', uptime_s: 5, wifi_rssi: -62, buffer_used: 3, buffer_dropped: 0 }));
  await ingest(tokenA, payload([], { boot_id: 2, firmware: 'receiver-4.4', uptime_s: 65, wifi_rssi: -62, buffer_used: 0, buffer_dropped: 4 }));

  const gw = await one('select g.* from gateways g where g.installation_id = $1', [instA]);
  assert.equal(Number(gw.last_boot_id), 2);
  assert.equal(gw.wifi_rssi, -62);
  assert.ok(gw.last_seen_at);

  const kinds = (await db.query(`select kind from gateway_events e join gateways g on g.id = e.gateway_id
                                 where g.installation_id = $1 order by e.id`, [instA])).rows.map(r => r.kind);
  assert.ok(kinds.includes('first_contact'));
  assert.ok(kinds.includes('reboot'));
  assert.ok(kinds.includes('buffer_dropped'));
});

test('a revoked receiver key stops working', async () => {
  const instB = (await one('select installation_id from gateways g join installations i on i.id = g.installation_id where i.owner_id = $1', [USER_B])).installation_id;
  const spare = (await one('select create_gateway($1, $2) as t', [instB, 'Spare'])).t;
  const r = await ingest(spare, payload([], { boot_id: 9 }));
  assert.equal(r.accepted, 0);
  const id = (await one(`select id from gateways where name = 'Spare'`)).id;
  await db.query('select revoke_gateway($1)', [id]);
  await assert.rejects(ingest(spare, payload([], { boot_id: 9 })), /invalid device key/);
});

// ---------------------------------------------------------------------------
// Customer privacy and permissions
// ---------------------------------------------------------------------------

test('a customer sees only their own tanks, readings and pump state', async () => {
  const mine = await as('authenticated', USER_A, () => db.query('select name from tanks order by tank_node'));
  assert.ok(mine.rows.length >= 4);

  const theirs = await as('authenticated', USER_B, async () => ({
    tanks:    (await db.query('select * from tanks')).rows.length,
    readings: (await db.query('select * from readings')).rows.length,
    state:    (await db.query('select * from tank_state')).rows.length,
    pump:     (await db.query('select * from pump_state')).rows.length,
    inst:     (await db.query('select * from installations')).rows,
  }));
  assert.equal(theirs.tanks, 0);
  assert.equal(theirs.readings, 0);
  assert.equal(theirs.state, 0);
  assert.equal(theirs.pump, 0);
  assert.equal(theirs.inst.length, 1);
  assert.equal(theirs.inst[0].name, 'Neighbour');
});

test('a customer can rename a tank but cannot write readings or see key hashes', async () => {
  await as('authenticated', USER_A, async () => {
    await db.query(`update tanks set name = 'House tank' where tank_node = 1`);
    const t = await one(`select name from tanks where tank_node = 1`);
    assert.equal(t.name, 'House tank');
  });
  await as('authenticated', USER_A, () =>
    assert.rejects(db.query(`insert into readings (tank_id, packet_id, heard_at, water_height_m, tank_percent, tank_volume_l)
                             select id, 1, now(), 1, 1, 1 from tanks limit 1`), /permission denied/));
  await as('authenticated', USER_A, () =>
    assert.rejects(db.query(`update tank_state set tank_percent = 100`), /permission denied/));
  await as('authenticated', USER_A, () =>
    assert.rejects(db.query('select * from gateway_keys'), /permission denied/));
  await as('authenticated', USER_A, () =>
    assert.rejects(db.query(`update tanks set installation_id = gen_random_uuid()`), /permission denied/));
});

test('another customer cannot rename my tanks', async () => {
  await as('authenticated', USER_B, () => db.query(`update tanks set name = 'Hacked'`));
  const t = await one(`select count(*)::int as n from tanks where name = 'Hacked'`);
  assert.equal(t.n, 0);
});

test('a visitor who is not logged in can only call ingest, and only with a valid key', async () => {
  await as('anon', null, () => assert.rejects(db.query('select * from tanks'), /permission denied/));
  await as('anon', null, () => assert.rejects(db.query('select * from readings'), /permission denied/));
  await as('anon', null, () => assert.rejects(db.query(`select create_gateway(gen_random_uuid())`), /permission denied/));
  const r = await as('anon', null, () => ingest(tokenA, payload([telemetry({ packet_id: 60, heard_at: iso(100) })])));
  assert.equal(r.accepted, 1);
});

test('the dashboard tables are published for live updates', async () => {
  const rows = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows;
  assert.deepEqual(rows.map(r => r.tablename), ['gateways', 'pump_state', 'tank_state']);
});

// ---------------------------------------------------------------------------
// The simulator speaks exactly the format ingest() expects
// ---------------------------------------------------------------------------

test('a batch produced by the receiver simulator is accepted in full', async () => {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const out = execFileSync(process.execPath,
    [fileURLToPath(new URL('../simulator/simulate.mjs', import.meta.url)), '--dry-run', '--once', '--tanks', '5'],
    { encoding: 'utf8', env: { ...process.env, LORA_SYSTEM_ID: String(SYSTEM_A) } });
  const body = JSON.parse(out.slice(out.indexOf('{')));
  // Use packet ids that cannot collide with earlier tests.
  body.messages.forEach((m, i) => { m.packet_id = 70000 + i; });
  const r = await ingest(tokenA, body);
  assert.equal(r.rejected, 0, JSON.stringify(r.results));
  assert.equal(r.accepted, body.messages.length);
});
