-- Add self-unregister + app settings (active location)

-- 1) Add a per-signup delete token (client stores it in localStorage)
alter table public.signups
  add column if not exists delete_token uuid not null default gen_random_uuid();

create index if not exists signups_by_token
  on public.signups (delete_token);

-- 2) Unregister via function that checks the token
-- (RLS stays enabled; we don't grant broad DELETE.)
create or replace function public.unregister_signup(p_signup_id uuid, p_delete_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.signups
  where id = p_signup_id
    and delete_token = p_delete_token;
end;
$$;

revoke all on function public.unregister_signup(uuid, uuid) from public;
grant execute on function public.unregister_signup(uuid, uuid) to anon, authenticated;

-- 3) App settings (public read; hidden UI controls update)
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "Public can view app settings" on public.app_settings;
create policy "Public can view app settings"
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can update app settings" on public.app_settings;
create policy "Public can update app settings"
  on public.app_settings
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public can insert app settings" on public.app_settings;
create policy "Public can insert app settings"
  on public.app_settings
  for insert
  to anon, authenticated
  with check (true);

-- Seed default active location if absent
insert into public.app_settings (key, value)
values ('active_location', 'shirley_hall_park')
on conflict (key) do nothing;

