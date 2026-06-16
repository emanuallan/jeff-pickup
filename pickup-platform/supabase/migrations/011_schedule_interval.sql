-- Recurring schedule frequency: every N weeks from an anchor date.

alter table public.schedules
  add column interval_weeks int not null default 1
    check (interval_weeks >= 1 and interval_weeks <= 52);

alter table public.schedules
  add column anchor_date date not null default current_date;

-- Align existing schedules so weekly behavior is unchanged.
update public.schedules
set anchor_date = created_at::date;

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
  v_weeks_since int;
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
      if d < r.anchor_date then
        continue;
      end if;

      v_weeks_since := ((d - r.anchor_date) / 7)::int;
      if v_weeks_since % r.interval_weeks <> 0 then
        continue;
      end if;

      v_dow := extract(dow from d)::int;
      if v_dow = any(r.byweekday) then
        v_starts_at := (d + r.start_time) at time zone r.timezone;

        if exists (
          select 1 from public.schedule_event_skips sk
          where sk.schedule_id = r.id and sk.starts_at = v_starts_at
        ) then
          continue;
        end if;

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
