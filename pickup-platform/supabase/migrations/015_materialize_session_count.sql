-- Keep a rolling buffer of upcoming sessions per schedule (default 5)
-- instead of materializing a fixed calendar-day window.
-- Must drop first: Postgres cannot rename parameters via CREATE OR REPLACE.

drop function if exists public.materialize_events(int, uuid);

create function public.materialize_events(
  p_session_count int default 5,
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
  v_weeks_since int;
  v_total int;
  v_max_date date;
begin
  if p_session_count < 1 or p_session_count > 30 then
    raise exception 'session_count must be between 1 and 30';
  end if;

  v_max_date := current_date + 365;

  for r in
    select s.*
    from public.schedules s
    where s.is_active
      and (p_org_id is null or s.org_id = p_org_id)
  loop
    v_total := 0;
    d := current_date;

    while v_total < p_session_count and d <= v_max_date loop
      if d >= r.anchor_date then
        v_weeks_since := ((d - r.anchor_date) / 7)::int;
        if v_weeks_since % r.interval_weeks = 0 then
          v_dow := extract(dow from d)::int;
          if v_dow = any(r.byweekday) then
            v_starts_at := (d + r.start_time) at time zone r.timezone;

            if not exists (
              select 1 from public.schedule_event_skips sk
              where sk.schedule_id = r.id and sk.starts_at = v_starts_at
            ) and v_starts_at >= now() then
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

              if exists (
                select 1 from public.events e
                where e.schedule_id = r.id and e.starts_at = v_starts_at
              ) then
                v_total := v_total + 1;
              end if;
            end if;
          end if;
        end if;
      end if;

      d := d + 1;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.materialize_events(int, uuid) from public;
grant execute on function public.materialize_events(int, uuid) to service_role;
