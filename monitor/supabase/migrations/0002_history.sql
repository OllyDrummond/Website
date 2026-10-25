-- ============================================================================
-- Tank history for dashboard charts
-- ============================================================================
-- Readings arrive every 20 s (about 4,300 per tank per day), far more than a
-- chart needs. tank_history() averages them into time buckets on the server.
--
-- SECURITY INVOKER: it runs with the caller's rights, so row-level security on
-- readings still applies and a customer only ever gets their own tank's data.

create or replace function public.tank_history(
    p_tank_id        uuid,
    p_since          timestamptz,
    p_bucket_seconds integer default 300
)
returns table (
    bucket      timestamptz,
    avg_percent real,
    min_percent real,
    max_percent real,
    readings    integer
)
language sql stable security invoker
set search_path = public
as $$
    with b as (select greatest(coalesce(p_bucket_seconds, 300), 20) as s)
    select
        to_timestamp(floor(extract(epoch from r.heard_at) / b.s) * b.s) as bucket,
        avg(r.tank_percent)::real,
        min(r.tank_percent)::real,
        max(r.tank_percent)::real,
        count(*)::integer
    from public.readings r, b
    where r.tank_id = p_tank_id
      and r.heard_at >= p_since
    group by 1
    order by 1
$$;

revoke all on function public.tank_history(uuid, timestamptz, integer) from public;
grant execute on function public.tank_history(uuid, timestamptz, integer) to authenticated;
