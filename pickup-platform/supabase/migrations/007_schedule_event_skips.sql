-- When an organizer deletes a future recurring session, record the skip so the
-- materializer never recreates that (schedule_id, starts_at) pair.

create table public.schedule_event_skips (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (schedule_id, starts_at)
);

create index schedule_event_skips_schedule_id_idx
  on public.schedule_event_skips (schedule_id);

grant select, insert, delete on public.schedule_event_skips to authenticated;

alter table public.schedule_event_skips enable row level security;

create policy "Org admins can manage schedule event skips"
  on public.schedule_event_skips for all
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']))
  with check (public.is_org_member(org_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- Materializer: honour skipped occurrences
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

        -- Skip dates the organizer explicitly removed from the series.
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
