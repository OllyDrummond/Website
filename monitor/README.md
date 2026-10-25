# Kinetiq Tank Monitor: live monitoring

Backend for remote tank monitoring. The receiver (LoRa gateway) uploads readings over Wi-Fi to Supabase. Customers log in to a dashboard and see only their own system.

Design and reasoning: `docs-private/live-monitoring-design.md` (kept off the public site).

```text
tank unit --LoRa--> receiver --HTTPS--> Supabase ingest() --> tables --realtime--> dashboard
```

Read-only for now: nothing here can switch a pump.

## Folders

| Path | What it is |
|---|---|
| `supabase/migrations/0001_init.sql` | Tables, the `ingest()` upload function, device keys, row-level security, realtime |
| `tests/` | Runs the migration in an in-process PostgreSQL (PGlite) and checks every rule (22 tests) |
| `simulator/` | Pretends to be a receiver: models tanks and the pump, uploads in the real format |

## Run the tests

```bash
cd monitor/tests
npm install
npm test
```

## How the receiver uploads

`POST https://<project>.supabase.co/rest/v1/rpc/ingest`

Headers:
- `apikey: <publishable key>`
- `Authorization: Bearer <publishable key>`
- `Content-Type: application/json`

The publishable key is public by design. The receiver's own device key goes in the body, and only its SHA-256 hash is stored.

```json
{
  "p_token": "<device key>",
  "p_payload": {
    "schema": 1,
    "gateway": { "boot_id": 2914487110, "firmware": "receiver-4.4", "uptime_s": 86400,
                 "wifi_rssi": -61, "buffer_used": 2, "buffer_dropped": 0 },
    "messages": [
      { "kind": "telemetry", "lora_system_id": 123456, "source_node": 1, "tank_node": 1,
        "packet_id": 1042, "hop_count": 0, "heard_at": "2026-10-25T03:20:02Z",
        "water_height_m": 2.1, "tank_percent": 70.0, "tank_volume_l": 21000,
        "sensor_status": "ok", "lora_rssi": -84, "lora_snr": 9.5 },
      { "kind": "pump_status", "lora_system_id": 123456, "source_node": 101, "tank_node": 1,
        "packet_id": 77, "hop_count": 0, "heard_at": "2026-10-25T03:20:05Z",
        "pump_state": "running" }
    ]
  }
}
```

Response:

```json
{ "accepted": 1, "duplicates": 0, "rejected": 0, "server_time": "…", "results": [ { "i": 0, "result": "accepted" } ] }
```

- Any per-message result (`accepted`, `duplicate`, `rejected`) means the server has the message, so the receiver can drop it from its buffer.
- Only a failed HTTP call means "keep it and retry".
- Rejected messages are kept in `quarantine` with the reason.

Rules enforced by `ingest()`:
- Duplicate = same tank + packet id heard within 10 minutes. Sender packet ids restart at 1 on reboot.
- A late reading goes into history but never overwrites a newer current value.
- `heard_at: null` (receiver has no internet time yet) uses the server time, marked approximate.
- Up to 100 messages per call.
- Tanks are created automatically as "Tank 1", "Tank 2" and so on.

## Set up a customer (Supabase SQL editor)

1. Create the user: Authentication > Users > Add user. Copy their user id.
2. Create their installation. `lora_system_id` must match `SYSTEM_ID` in their firmware:

   ```sql
   insert into installations (owner_id, name, lora_system_id)
   values ('<user id>', 'Drummond farm', 123456)
   returning id;
   ```

3. Register their receiver. The device key is shown **once**; put it in the receiver's private settings:

   ```sql
   select create_gateway('<installation id>', 'House receiver');
   ```

4. If a receiver is lost or replaced:

   ```sql
   select revoke_gateway('<gateway id>');
   ```

## Run the simulator against Supabase

```bash
cd monitor/simulator
cp .env.example .env          # fill in URL, publishable key, device key
node simulate.mjs --tanks 3 --speed 30
node simulate.mjs --chaos     # adds duplicates, late readings, garbage, reboots
node simulate.mjs --dry-run   # print payloads only
```
