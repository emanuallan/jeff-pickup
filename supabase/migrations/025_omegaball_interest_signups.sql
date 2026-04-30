-- Recreational OmegaBall League: interest signups (temporary, separate from pickup)

create table if not exists public.omegaball_interest_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint omegaball_interest_signups_name_len check (char_length(trim(name)) > 0 and char_length(name) <= 60)
);

create index if not exists omegaball_interest_signups_created_at
  on public.omegaball_interest_signups (created_at);

alter table public.omegaball_interest_signups enable row level security;

-- Public read of interest list
drop policy if exists "Public can view omegaball interest signups" on public.omegaball_interest_signups;
create policy "Public can view omegaball interest signups"
  on public.omegaball_interest_signups
  for select
  to anon, authenticated
  using (true);

-- Public signup (insert only)
drop policy if exists "Public can create omegaball interest signups" on public.omegaball_interest_signups;
create policy "Public can create omegaball interest signups"
  on public.omegaball_interest_signups
  for insert
  to anon, authenticated
  with check (true);

