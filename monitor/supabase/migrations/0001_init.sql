-- ============================================================================
-- Kinetiq Tank Monitor: live monitoring database (schema 1)
-- ============================================================================
--
-- Data path:  tank unit --LoRa--> receiver --HTTPS--> ingest() --> tables
--                                                          dashboard <-- realtime
--
-- * The receiver calls public.ingest(p_token, p_payload) through the Supabase
--   REST endpoint /rest/v1/rpc/ingest. p_token is that receiver's own device
--   key; only its SHA-256 hash is stored (gateways.token_hash).
-- * Customers log in (Supabase Auth). Row-level security lets each customer
--   read only installations they own. Customers can rename tanks; they can
--   never write readings.
-- * Nothing here controls a pump. This release is read-only monitoring.
--
-- Field names and ranges follow docs-private/live-monitoring-design.md and
-- the V4.x firmware (PROTOCOL_VERSION 2): tanks are nodes 1-10, the receiver
-- is node 100, pump controllers are 101+.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- One per customer property.
create table public.installations (
    id              uuid primary key default gen_random_uuid(),
    owner_id        uuid not null references auth.users (id) on delete cascade,
    name            text not null default 'My property',
    lora_system_id  bigint not null check (lora_system_id between 0 and 4294967295),
    timezone        text not null default 'Pacific/Auckland',
    created_at      timestamptz not null default now()
);
create index installations_owner_idx on public.installations (owner_id);

-- One per receiver (the LoRa-to-internet gateway).
create table public.gateways (
    id              uuid primary key default gen_random_uuid(),
    installation_id uuid not null references public.installations (id) on delete cascade,
    name            text not null default 'Receiver',
    revoked_at      timestamptz,
    firmware        text,
    last_seen_at    timestamptz,
    last_boot_id    bigint,
    uptime_s        bigint,
    wifi_rssi       smallint,
    buffer_used     integer,
    buffer_dropped  integer,
    created_at      timestamptz not null default now()
);
create index gateways_installation_idx on public.gateways (installation_id);

-- Device key hashes live apart from gateways so customers (and realtime) can
-- read receiver health without the hash ever being exposed.
create table public.gateway_keys (
    gateway_id uuid primary key references public.gateways (id) on delete cascade,
    token_hash text not null unique   -- sha256 hex of the device key
);

-- One per tank. Created automatically the first time a tank reports, named
-- "Tank <node>". Dimensions are for display only; the tank unit does the maths.
create table public.tanks (
    id                 uuid primary key default gen_random_uuid(),
    installation_id    uuid not null references public.installations (id) on delete cascade,
    tank_node          smallint not null check (tank_node between 1 and 10),
    name               text not null,
    height_m           real check (height_m > 0),
    capacity_l         real check (capacity_l > 0),
    fill_start_percent real check (fill_start_percent between 0 and 100),
    fill_stop_percent  real check (fill_stop_percent between 0 and 100),
    controller_node    smallint check (controller_node between 101 and 254),
    created_at         timestamptz not null default now(),
    unique (installation_id, tank_node)
);

-- Every accepted telemetry message (append-only history).
create table public.readings (
    id                  bigint generated always as identity primary key,
    tank_id             uuid not null references public.tanks (id) on delete cascade,
    gateway_id          uuid references public.gateways (id) on delete set null,
    packet_id           bigint not null,
    hop_count           smallint,
    heard_at            timestamptz not null,   -- when the receiver heard it
    heard_at_approx     boolean not null default false,  -- receiver had no clock yet
    server_received_at  timestamptz not null default now(),
    water_height_m      real not null,
    tank_percent        real not null,
    tank_volume_l       real not null,
    sensor_status       text check (sensor_status in ('ok', 'fault')),  -- null = sender too old to say
    lora_rssi           smallint,
    lora_snr            real
);
create index readings_tank_time_idx on public.readings (tank_id, heard_at desc);
create index readings_dedupe_idx on public.readings (tank_id, packet_id, heard_at);

-- Latest reading per tank (what the dashboard shows). Only ever moves forward
-- in time: a late, delayed message never overwrites a newer one.
create table public.tank_state (
    tank_id         uuid primary key references public.tanks (id) on delete cascade,
    installation_id uuid not null references public.installations (id) on delete cascade,
    last_heard_at   timestamptz not null,
    heard_at_approx boolean not null default false,
    water_height_m  real not null,
    tank_percent    real not null,
    tank_volume_l   real not null,
    sensor_status   text,
    lora_rssi       smallint,
    lora_snr        real,
    hop_count       smallint,
    updated_at      timestamptz not null default now()
);
create index tank_state_installation_idx on public.tank_state (installation_id);

-- Every pump status report from a controller (RUNNING / STOPPED / ERROR).
create table public.pump_events (
    id                 bigint generated always as identity primary key,
    tank_id            uuid not null references public.tanks (id) on delete cascade,
    gateway_id         uuid references public.gateways (id) on delete set null,
    controller_node    smallint not null check (controller_node between 101 and 254),
    packet_id          bigint not null,
    state              text not null check (state in ('running', 'stopped', 'fault')),
    heard_at           timestamptz not null,
    heard_at_approx    boolean not null default false,
    server_received_at timestamptz not null default now()
);
create index pump_events_tank_time_idx on public.pump_events (tank_id, heard_at desc);
create index pump_events_dedupe_idx on public.pump_events (tank_id, controller_node, packet_id, heard_at);

-- Latest pump status per tank.
create table public.pump_state (
    tank_id         uuid primary key references public.tanks (id) on delete cascade,
    installation_id uuid not null references public.installations (id) on delete cascade,
    controller_node smallint not null,
    state           text not null,
    since           timestamptz not null,   -- heard_at of the report that set this state
    updated_at      timestamptz not null default now()
);
create index pump_state_installation_idx on public.pump_state (installation_id);

-- Receiver online/offline/reboot history.
create table public.gateway_events (
    id         bigint generated always as identity primary key,
    gateway_id uuid not null references public.gateways (id) on delete cascade,
    kind       text not null check (kind in ('first_contact', 'reboot', 'buffer_dropped')),
    at         timestamptz not null default now(),
    detail     jsonb
);
create index gateway_events_gateway_idx on public.gateway_events (gateway_id, at desc);

-- Messages that failed validation: kept with the reason, never shown as data.
create table public.quarantine (
    id          bigint generated always as identity primary key,
    gateway_id  uuid references public.gateways (id) on delete set null,
    received_at timestamptz not null default now(),
    reason      text not null,
    payload     jsonb
);


-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- Number from a JSON field, or null if the field is missing or not a number.
create or replace function public._json_num(j jsonb, key text)
returns double precision
language sql immutable
as $$
    select case when jsonb_typeof(j -> key) = 'number' then (j ->> key)::double precision end
$$;

-- Whole number from a JSON field, or null if missing, not a number or fractional.
create or replace function public._json_int(j jsonb, key text)
returns bigint
language sql immutable
as $$
    select case
        when jsonb_typeof(j -> key) = 'number'
         and (j ->> key)::numeric = trunc((j ->> key)::numeric)
        then (j ->> key)::numeric::bigint
    end
$$;

create or replace function public._token_hash(p_token text)
returns text
language sql immutable
as $$
    select encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

-- True if the logged-in user owns this installation. Used by every policy.
create or replace function public.owns_installation(p_installation_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.installations
        where id = p_installation_id and owner_id = auth.uid()
    )
$$;


-- ----------------------------------------------------------------------------
-- Device keys
-- ----------------------------------------------------------------------------
-- Run as the project owner (SQL editor) to register a receiver. Returns the
-- device key ONCE; only its hash is stored. Put the key in the receiver's
-- private settings, never in a repository.

create or replace function public.create_gateway(p_installation_id uuid, p_name text default 'Receiver')
returns text
language plpgsql security definer
set search_path = public
as $$
declare
    v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    v_id    uuid;
begin
    insert into public.gateways (installation_id, name)
    values (p_installation_id, coalesce(p_name, 'Receiver'))
    returning id into v_id;

    insert into public.gateway_keys (gateway_id, token_hash)
    values (v_id, public._token_hash(v_token));

    return v_token;
end
$$;

-- Revoke a lost or replaced receiver's key.
create or replace function public.revoke_gateway(p_gateway_id uuid)
returns void
language sql security definer
set search_path = public
as $$
    update public.gateways set revoked_at = now() where id = p_gateway_id and revoked_at is null
$$;


-- ----------------------------------------------------------------------------
-- Ingest: the only way data gets in
-- ----------------------------------------------------------------------------
-- Payload (schema 1):
-- {
--   "schema": 1,
--   "gateway": { "boot_id", "firmware", "uptime_s", "wifi_rssi",
--                "buffer_used", "buffer_dropped" },
--   "messages": [ { "kind": "telemetry" | "pump_status", ... }, ... ]
-- }
-- Returns { accepted, duplicates, rejected, results: [{ i, result, reason? }] }.
-- The receiver may delete a buffered message once it has any result for it
-- (accepted, duplicate or rejected); only a failed HTTP call means "keep it".

create or replace function public.ingest(p_token text, p_payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    c_max_messages   constant int := 100;
    c_dedupe_window  constant interval := interval '10 minutes';
    c_future_limit   constant interval := interval '5 minutes';
    c_past_limit     constant interval := interval '30 days';

    v_now        timestamptz := now();
    v_gw         public.gateways%rowtype;
    v_inst       public.installations%rowtype;
    v_gwinfo     jsonb;
    v_boot_id    bigint;
    v_dropped    bigint;
    v_messages   jsonb;
    v_msg        jsonb;
    v_i          int := 0;
    v_results    jsonb := '[]'::jsonb;
    v_accepted   int := 0;
    v_duplicates int := 0;
    v_rejected   int := 0;

    v_kind       text;
    v_reason     text;
    v_result     text;
    v_source     bigint;
    v_tank_node  bigint;
    v_packet     bigint;
    v_system     bigint;
    v_hops       bigint;
    v_heard      timestamptz;
    v_approx     boolean;
    v_height     double precision;
    v_percent    double precision;
    v_volume     double precision;
    v_rssi       double precision;
    v_snr        double precision;
    v_sensor     text;
    v_pump       text;
    v_tank_id    uuid;
begin
    -- ---- authenticate the receiver ------------------------------------------
    if p_token is null or length(p_token) < 32 then
        raise exception 'invalid device key' using errcode = '28000';
    end if;

    select g.* into v_gw
    from public.gateway_keys k
    join public.gateways g on g.id = k.gateway_id
    where k.token_hash = public._token_hash(p_token) and g.revoked_at is null;

    if not found then
        raise exception 'invalid device key' using errcode = '28000';
    end if;

    select * into v_inst from public.installations where id = v_gw.installation_id;

    -- ---- envelope -----------------------------------------------------------
    if p_payload is null or jsonb_typeof(p_payload) <> 'object'
       or public._json_int(p_payload, 'schema') is distinct from 1 then
        insert into public.quarantine (gateway_id, reason, payload)
        values (v_gw.id, 'unsupported schema', p_payload);
        raise exception 'unsupported schema' using errcode = '22023';
    end if;

    v_messages := coalesce(p_payload -> 'messages', '[]'::jsonb);
    if jsonb_typeof(v_messages) <> 'array' or jsonb_array_length(v_messages) > c_max_messages then
        insert into public.quarantine (gateway_id, reason, payload)
        values (v_gw.id, 'messages must be an array of at most 100', p_payload);
        raise exception 'messages must be an array of at most 100' using errcode = '22023';
    end if;

    -- ---- receiver health ----------------------------------------------------
    v_gwinfo  := coalesce(p_payload -> 'gateway', '{}'::jsonb);
    v_boot_id := public._json_int(v_gwinfo, 'boot_id');
    v_dropped := public._json_int(v_gwinfo, 'buffer_dropped');

    if v_gw.last_seen_at is null then
        insert into public.gateway_events (gateway_id, kind, detail)
        values (v_gw.id, 'first_contact', jsonb_build_object('firmware', v_gwinfo ->> 'firmware'));
    elsif v_boot_id is not null and v_gw.last_boot_id is not null and v_boot_id <> v_gw.last_boot_id then
        insert into public.gateway_events (gateway_id, kind, detail)
        values (v_gw.id, 'reboot', jsonb_build_object('previous_boot_id', v_gw.last_boot_id,
                                                      'boot_id', v_boot_id));
    end if;

    if v_dropped is not null and v_dropped > coalesce(v_gw.buffer_dropped, 0)
       and (v_boot_id is null or v_boot_id = v_gw.last_boot_id) then
        insert into public.gateway_events (gateway_id, kind, detail)
        values (v_gw.id, 'buffer_dropped',
                jsonb_build_object('dropped_total', v_dropped,
                                   'new', v_dropped - coalesce(v_gw.buffer_dropped, 0)));
    end if;

    update public.gateways set
        last_seen_at   = v_now,
        last_boot_id   = coalesce(v_boot_id, last_boot_id),
        firmware       = coalesce(left(v_gwinfo ->> 'firmware', 40), firmware),
        uptime_s       = public._json_int(v_gwinfo, 'uptime_s'),
        wifi_rssi      = case when public._json_int(v_gwinfo, 'wifi_rssi') between -127 and 0
                              then public._json_int(v_gwinfo, 'wifi_rssi') end,
        buffer_used    = public._json_int(v_gwinfo, 'buffer_used'),
        buffer_dropped = v_dropped
    where id = v_gw.id;

    -- ---- messages -----------------------------------------------------------
    for v_msg in select value from jsonb_array_elements(v_messages)
    loop
        v_reason := null;
        v_result := null;

        begin
            if jsonb_typeof(v_msg) <> 'object' then
                v_reason := 'message is not an object';
            end if;

            v_kind      := v_msg ->> 'kind';
            v_source    := public._json_int(v_msg, 'source_node');
            v_tank_node := public._json_int(v_msg, 'tank_node');
            v_packet    := public._json_int(v_msg, 'packet_id');
            v_system    := public._json_int(v_msg, 'lora_system_id');
            v_hops      := public._json_int(v_msg, 'hop_count');
            v_rssi      := public._json_num(v_msg, 'lora_rssi');
            v_snr       := public._json_num(v_msg, 'lora_snr');

            -- common checks
            if v_reason is null and coalesce(v_kind, '') not in ('telemetry', 'pump_status') then
                v_reason := 'unknown kind';
            elsif v_reason is null and (v_tank_node is null or v_tank_node not between 1 and 10) then
                v_reason := 'tank_node must be 1-10';
            elsif v_reason is null and (v_packet is null or v_packet not between 0 and 4294967295) then
                v_reason := 'packet_id missing or out of range';
            elsif v_reason is null and v_system is distinct from v_inst.lora_system_id then
                v_reason := 'lora_system_id does not match this installation';
            elsif v_reason is null and v_hops is not null and v_hops not between 0 and 15 then
                v_reason := 'hop_count out of range';
            end if;

            -- when it was heard
            if v_reason is null then
                if v_msg -> 'heard_at' is null or jsonb_typeof(v_msg -> 'heard_at') = 'null' then
                    v_heard  := v_now;
                    v_approx := true;
                elsif jsonb_typeof(v_msg -> 'heard_at') = 'string' then
                    begin
                        v_heard  := (v_msg ->> 'heard_at')::timestamptz;
                        v_approx := false;
                    exception when others then
                        v_reason := 'heard_at is not a valid time';
                    end;
                else
                    v_reason := 'heard_at is not a valid time';
                end if;

                if v_reason is null and v_heard > v_now + c_future_limit then
                    v_reason := 'heard_at is in the future';
                elsif v_reason is null and v_heard < v_now - c_past_limit then
                    v_reason := 'heard_at is more than 30 days old';
                end if;
            end if;

            -- signal quality is optional; drop it if implausible rather than reject
            if v_rssi is not null and v_rssi not between -200 and 20 then v_rssi := null; end if;
            if v_snr  is not null and v_snr  not between -50 and 50  then v_snr  := null; end if;

            -- ---- telemetry ------------------------------------------------
            if v_reason is null and v_kind = 'telemetry' then
                v_height  := public._json_num(v_msg, 'water_height_m');
                v_percent := public._json_num(v_msg, 'tank_percent');
                v_volume  := public._json_num(v_msg, 'tank_volume_l');
                v_sensor  := v_msg ->> 'sensor_status';

                if v_source is distinct from v_tank_node then
                    v_reason := 'telemetry source_node must equal tank_node';
                elsif v_height is null or v_height not between 0 and 6 then
                    v_reason := 'water_height_m missing or out of range (0-6 m)';
                elsif v_percent is null or v_percent not between 0 and 100 then
                    v_reason := 'tank_percent missing or out of range (0-100)';
                elsif v_volume is null or v_volume not between 0 and 10000000 then
                    v_reason := 'tank_volume_l missing or out of range';
                elsif v_sensor is not null and v_sensor not in ('ok', 'fault') then
                    v_reason := 'sensor_status must be ok or fault';
                end if;
            end if;

            -- ---- pump status ------------------------------------------------
            if v_reason is null and v_kind = 'pump_status' then
                v_pump := v_msg ->> 'pump_state';
                if v_source is null or v_source not between 101 and 254 then
                    v_reason := 'pump_status source_node must be a controller (101-254)';
                elsif v_pump is null or v_pump not in ('running', 'stopped', 'fault') then
                    v_reason := 'pump_state must be running, stopped or fault';
                end if;
            end if;

            -- ---- store --------------------------------------------------------
            if v_reason is null then
                -- find or create the tank ("Tank 1", "Tank 2", ...)
                insert into public.tanks (installation_id, tank_node, name)
                values (v_inst.id, v_tank_node, 'Tank ' || v_tank_node)
                on conflict (installation_id, tank_node) do nothing;

                select id into v_tank_id
                from public.tanks
                where installation_id = v_inst.id and tank_node = v_tank_node;

                if v_kind = 'telemetry' then
                    -- duplicate = same tank + packet id heard within 10 minutes
                    -- (sender packet ids restart at 1 after a reboot, so a wider
                    -- match would throw away real readings)
                    if exists (
                        select 1 from public.readings
                        where tank_id = v_tank_id and packet_id = v_packet
                          and heard_at between v_heard - c_dedupe_window and v_heard + c_dedupe_window
                    ) then
                        v_result := 'duplicate';
                    else
                        insert into public.readings (
                            tank_id, gateway_id, packet_id, hop_count, heard_at, heard_at_approx,
                            water_height_m, tank_percent, tank_volume_l, sensor_status, lora_rssi, lora_snr)
                        values (
                            v_tank_id, v_gw.id, v_packet, v_hops, v_heard, v_approx,
                            v_height, v_percent, v_volume, v_sensor, round(v_rssi), v_snr);

                        insert into public.tank_state as ts (
                            tank_id, installation_id, last_heard_at, heard_at_approx,
                            water_height_m, tank_percent, tank_volume_l, sensor_status,
                            lora_rssi, lora_snr, hop_count, updated_at)
                        values (
                            v_tank_id, v_inst.id, v_heard, v_approx,
                            v_height, v_percent, v_volume, v_sensor,
                            round(v_rssi), v_snr, v_hops, v_now)
                        on conflict (tank_id) do update set
                            last_heard_at   = excluded.last_heard_at,
                            heard_at_approx = excluded.heard_at_approx,
                            water_height_m  = excluded.water_height_m,
                            tank_percent    = excluded.tank_percent,
                            tank_volume_l   = excluded.tank_volume_l,
                            sensor_status   = excluded.sensor_status,
                            lora_rssi       = excluded.lora_rssi,
                            lora_snr        = excluded.lora_snr,
                            hop_count       = excluded.hop_count,
                            updated_at      = excluded.updated_at
                        where excluded.last_heard_at >= ts.last_heard_at;

                        v_result := 'accepted';
                    end if;

                else  -- pump_status
                    if exists (
                        select 1 from public.pump_events
                        where tank_id = v_tank_id and controller_node = v_source and packet_id = v_packet
                          and heard_at between v_heard - c_dedupe_window and v_heard + c_dedupe_window
                    ) then
                        v_result := 'duplicate';
                    else
                        insert into public.pump_events (
                            tank_id, gateway_id, controller_node, packet_id, state, heard_at, heard_at_approx)
                        values (v_tank_id, v_gw.id, v_source, v_packet, v_pump, v_heard, v_approx);

                        update public.tanks set controller_node = v_source
                        where id = v_tank_id and controller_node is distinct from v_source;

                        insert into public.pump_state as ps (
                            tank_id, installation_id, controller_node, state, since, updated_at)
                        values (v_tank_id, v_inst.id, v_source, v_pump, v_heard, v_now)
                        on conflict (tank_id) do update set
                            controller_node = excluded.controller_node,
                            state           = excluded.state,
                            since           = excluded.since,
                            updated_at      = excluded.updated_at
                        where excluded.since >= ps.since;

                        v_result := 'accepted';
                    end if;
                end if;
            end if;

        exception when others then
            v_reason := 'internal error: ' || sqlerrm;
        end;

        if v_reason is not null then
            insert into public.quarantine (gateway_id, reason, payload)
            values (v_gw.id, v_reason, v_msg);
            v_rejected := v_rejected + 1;
            v_results := v_results || jsonb_build_object('i', v_i, 'result', 'rejected', 'reason', v_reason);
        elsif v_result = 'duplicate' then
            v_duplicates := v_duplicates + 1;
            v_results := v_results || jsonb_build_object('i', v_i, 'result', 'duplicate');
        else
            v_accepted := v_accepted + 1;
            v_results := v_results || jsonb_build_object('i', v_i, 'result', 'accepted');
        end if;

        v_i := v_i + 1;
    end loop;

    return jsonb_build_object(
        'accepted', v_accepted,
        'duplicates', v_duplicates,
        'rejected', v_rejected,
        'server_time', v_now,
        'results', v_results
    );
end
$$;


-- ----------------------------------------------------------------------------
-- Access control
-- ----------------------------------------------------------------------------
-- "Automatically expose new tables" is OFF in this project, so nothing is
-- reachable from the API unless granted here.

alter table public.installations  enable row level security;
alter table public.gateways       enable row level security;
alter table public.gateway_keys   enable row level security;   -- no policies, no grants
alter table public.tanks          enable row level security;
alter table public.readings       enable row level security;
alter table public.tank_state     enable row level security;
alter table public.pump_events    enable row level security;
alter table public.pump_state     enable row level security;
alter table public.gateway_events enable row level security;
alter table public.quarantine     enable row level security;   -- no policies: owner/admin only

-- Functions are executable by PUBLIC by default; lock them down first.
revoke all on function public.ingest(text, jsonb)        from public;
revoke all on function public.create_gateway(uuid, text) from public;
revoke all on function public.revoke_gateway(uuid)       from public;
revoke all on function public.owns_installation(uuid)    from public;

-- Receivers call ingest() with the public API key plus their own device key.
grant execute on function public.ingest(text, jsonb) to anon, authenticated;
grant execute on function public.owns_installation(uuid) to authenticated;

-- Logged-in customers: read their own data.
grant select on public.installations, public.tanks, public.readings, public.tank_state,
                public.pump_events, public.pump_state, public.gateway_events
    to authenticated;

-- Receiver health (the key hash is in gateway_keys, which is never granted).
grant select on public.gateways to authenticated;

-- Customers may rename their property and tanks, and set tank dimensions.
grant update (name) on public.installations to authenticated;
grant update (name, height_m, capacity_l) on public.tanks to authenticated;

create policy "owner reads installation" on public.installations
    for select to authenticated using (owner_id = auth.uid());
create policy "owner renames installation" on public.installations
    for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner reads gateways" on public.gateways
    for select to authenticated using (public.owns_installation(installation_id));

create policy "owner reads tanks" on public.tanks
    for select to authenticated using (public.owns_installation(installation_id));
create policy "owner edits tanks" on public.tanks
    for update to authenticated
    using (public.owns_installation(installation_id))
    with check (public.owns_installation(installation_id));

create policy "owner reads readings" on public.readings
    for select to authenticated
    using (exists (select 1 from public.tanks t
                   where t.id = tank_id and public.owns_installation(t.installation_id)));

create policy "owner reads tank state" on public.tank_state
    for select to authenticated using (public.owns_installation(installation_id));

create policy "owner reads pump events" on public.pump_events
    for select to authenticated
    using (exists (select 1 from public.tanks t
                   where t.id = tank_id and public.owns_installation(t.installation_id)));

create policy "owner reads pump state" on public.pump_state
    for select to authenticated using (public.owns_installation(installation_id));

create policy "owner reads gateway events" on public.gateway_events
    for select to authenticated
    using (exists (select 1 from public.gateways g
                   where g.id = gateway_id and public.owns_installation(g.installation_id)));


-- ----------------------------------------------------------------------------
-- Realtime: the dashboard subscribes to these so new readings appear live.
-- (Row-level security still applies to what each customer receives.)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.tank_state, public.pump_state, public.gateways;
