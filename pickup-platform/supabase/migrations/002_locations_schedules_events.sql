-- Headcount Phase 1: locations, schedules, events + materializer

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  label text not null,
  address text not null default '',
  maps_url text not null default '',
  lat double precision not null default 0,
  lon double precision not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index locations_org_id_idx on public.locations (org_id);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  title text not null default 'Weekly session',
  byweekday int[] not null check (array_length(byweekday, 1) >= 1),
  start_time time not null default '18:00',
  duration_min int not null default 90 check (duration_min > 0 and duration_min <= 480),
  capacity int not null default 20 check (capacity >= 2 and capacity <= 999),
  min_players int not null default 10 check (min_players >= 2 and min_players <= 999),
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (min_players <= capacity)
);

create index schedules_org_id_idx on public.schedules (org_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  location_id uuid not null references public.locations(id) on delete restrict,
  starts_at timestamptz not null,
  capacity int not null default 20 check (capacity >= 2 and capacity <= 999),
  min_players int not null default 10 check (min_players >= 2 and min_players <= 999),
  status text not null default 'tentative'
    check (status in ('tentative', 'on', 'cancelled')),
  announcement text not null default '',
  created_at timestamptz not null default now(),
  unique (schedule_id, starts_at)
);

create index events_org_id_starts_at_idx on public.events (org_id, starts_at);
create index events_starts_at_idx on public.events (starts_at);

-- ---------------------------------------------------------------------------
-- API grants
-- ---------------------------------------------------------------------------

grant select on public.locations to anon, authenticated;
grant insert, update, delete on public.locations to authenticated;

grant select on public.schedules to anon, authenticated;
grant insert, update, delete on public.schedules to authenticated;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.locations enable row level security;
alter table public.schedules enable row level security;
alter table public.events enable row level security;

-- Locations
create policy "Anyone can view locations for active orgs"
  on public.locations for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.orgs o
      where o.id = locations.org_id and o.status = 'active'
    )
  );

create policy "Org admins can manage locations"
  on public.locations for all
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']))
  with check (public.is_org_member(org_id, array['owner', 'admin']));

-- Schedules
create policy "Anyone can view schedules for active orgs"
  on public.schedules for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.orgs o
      where o.id = schedules.org_id and o.status = 'active'
    )
  );

create policy "Org admins can manage schedules"
  on public.schedules for all
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']))
  with check (public.is_org_member(org_id, array['owner', 'admin']));

-- Events
create policy "Anyone can view events for active orgs"
  on public.events for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.orgs o
      where o.id = events.org_id and o.status = 'active'
    )
  );

create policy "Org admins can manage events"
  on public.events for all
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']))
  with check (public.is_org_member(org_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- Materializer: rolling window of events from active schedules
-- byweekday: 0=Sunday … 6=Saturday (matches PostgreSQL extract(dow))
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
          capacity, min_players, status
        )
        values (
          r.org_id, r.id, r.location_id, v_starts_at,
          r.capacity, r.min_players, 'tentative'
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

-- Only service role / postgres should call materialize directly
revoke all on function public.materialize_events(int, uuid) from public;
grant execute on function public.materialize_events(int, uuid) to service_role;
