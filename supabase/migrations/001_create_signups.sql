-- Jeff Pickup FC: shared pickup signups (public select/insert)

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  play_date date not null,
  location text not null,
  player_name text not null,
  created_at timestamptz not null default now()
);

-- Prevent duplicate names per play_date + location (case-insensitive).
create unique index if not exists signups_unique_name_per_day
  on public.signups (play_date, location, lower(player_name));

create index if not exists signups_by_day_location_created_at
  on public.signups (play_date, location, created_at);

alter table public.signups enable row level security;

-- Public read of roster
drop policy if exists "Public can view signups" on public.signups;
create policy "Public can view signups"
  on public.signups
  for select
  to anon, authenticated
  using (true);

-- Public signup (insert only)
drop policy if exists "Public can create signups" on public.signups;
create policy "Public can create signups"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);

