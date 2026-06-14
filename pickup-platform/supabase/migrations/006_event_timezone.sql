-- Store the display timezone on each event so server-rendered pages show the
-- correct local time (materializer already interprets schedule start_time in
-- schedule.timezone; this column records that zone for formatting).

alter table public.events
  add column timezone text not null default 'UTC';

-- Backfill materialized events from their source schedule.
update public.events e
set timezone = s.timezone
from public.schedules s
where e.schedule_id = s.id;

-- ---------------------------------------------------------------------------
-- Materializer: copy schedule timezone onto each generated event
-- ---------------------------------------------------------------------------

create or replace function public.materialize_events(
  p_window_days int default 30,
  p_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  r record;
  d date;
  v_starts_at timestamptz;
  v_dow int;
begin
  if p_window_days < 1 or p_window_days > 90 then
    raise exception 'window_days must be between 1 and 90';
  end if;

  for r in
    select s.*
    from public.schedules s
    where s.is_active
      and (p_org_id is null or s.org_id = p_org_id)
  loop
    for d in
      select gs::date
      from generate_series(
        current_date,
        current_date + (p_window_days - 1),
        interval '1 day'
      ) gs
    loop
      v_dow := extract(dow from d)::int;
      if v_dow = any(r.byweekday) then
        v_starts_at := (d + r.start_time) at time zone r.timezone;

        insert into public.events (
          org_id, schedule_id, location_id, starts_at,
          capacity, min_players, status, timezone
        )
        values (
          r.org_id, r.id, r.location_id, v_starts_at,
          r.capacity, r.min_players, 'tentative', r.timezone
        )
        on conflict (schedule_id, starts_at) do nothing;

        if found then
          v_inserted := v_inserted + 1;
        end if;
      end if;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.materialize_events(int, uuid) from public;
grant execute on function public.materialize_events(int, uuid) to service_role;
