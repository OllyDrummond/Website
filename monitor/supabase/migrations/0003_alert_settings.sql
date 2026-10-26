-- Per-tank alert setting the owner can change on the website:
-- warn when the level drops below this percentage (null = no low-level alert).

alter table public.tanks
    add column low_alert_percent real default 25 check (low_alert_percent between 0 and 100);

grant update (low_alert_percent) on public.tanks to authenticated;
