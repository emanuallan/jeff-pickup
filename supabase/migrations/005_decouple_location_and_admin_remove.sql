-- Decouple signups from location (one list per day) and add admin removal.

-- Ensure pgcrypto is available for password hashing.
create extension if not exists pgcrypto;

-- 1) Update uniqueness: prevent duplicate names per play_date (case-insensitive).
drop index if exists public.signups_unique_name_per_day;

create unique index if not exists signups_unique_name_per_day
  on public.signups (play_date, lower(player_name));

-- Keep fast reads by date.
create index if not exists signups_by_day_created_at
  on public.signups (play_date, created_at);

-- (Old index becomes unnecessary, but keep drop safe if it exists.)
drop index if exists public.signups_by_day_location_created_at;

-- 2) Admin secret storage (not publicly readable).
create table if not exists public.admin_secrets (
  key text primary key,
  value text not null
);

alter table public.admin_secrets enable row level security;

-- No public access to secrets.
drop policy if exists "No access to admin secrets" on public.admin_secrets;
create policy "No access to admin secrets"
  on public.admin_secrets
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Seed empty pin hash placeholder
insert into public.admin_secrets (key, value)
values ('admin_pin_hash', '')
on conflict (key) do nothing;

-- 3) Admin removal RPC: deletes any signup if PIN matches server-side hash.
create or replace function public.admin_remove_signup(p_signup_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  select value into stored_hash
  from public.admin_secrets
  where key = 'admin_pin_hash';

  if stored_hash is null or stored_hash = '' then
    raise exception 'Admin PIN not configured';
  end if;

  if crypt(p_pin, stored_hash) <> stored_hash then
    raise exception 'Incorrect PIN';
  end if;

  delete from public.signups where id = p_signup_id;
end;
$$;

revoke all on function public.admin_remove_signup(uuid, text) from public;
grant execute on function public.admin_remove_signup(uuid, text) to anon, authenticated;

