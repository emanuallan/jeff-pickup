-- Player emoji + pokes (anonymous roster features)

-- 1) Emoji on signups (optional)
alter table public.signups
  add column if not exists emoji text not null default '';

alter table public.signups
  add constraint signups_emoji_length
  check (char_length(emoji) <= 8);

-- 2) Pokes table (who poked whom, scoped to a play day)
create table if not exists public.pokes (
  id uuid primary key default gen_random_uuid(),
  play_date date not null,
  from_signup_id uuid not null references public.signups (id) on delete cascade,
  to_signup_id uuid not null references public.signups (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint pokes_no_self check (from_signup_id <> to_signup_id)
);

create index if not exists pokes_by_day_to_created_at
  on public.pokes (play_date, to_signup_id, created_at desc);

alter table public.pokes enable row level security;

drop policy if exists "Public can insert pokes" on public.pokes;
create policy "Public can insert pokes"
  on public.pokes
  for insert
  to anon, authenticated
  with check (true);

-- NOTE: We intentionally do NOT grant broad SELECT on pokes to anon users.
-- Pokes are read via `fetch_my_pokes` (token-gated) to reduce casual scraping.

-- 3) RPC: update emoji for your own signup row (token-gated)
create or replace function public.update_my_signup_emoji(p_signup_id uuid, p_delete_token uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
begin
  cleaned := coalesce(p_emoji, '');
  cleaned := trim(cleaned);

  if char_length(cleaned) > 8 then
    raise exception 'Emoji too long';
  end if;

  update public.signups
  set emoji = cleaned
  where id = p_signup_id
    and delete_token = p_delete_token;
end;
$$;

revoke all on function public.update_my_signup_emoji(uuid, uuid, text) from public;
grant execute on function public.update_my_signup_emoji(uuid, uuid, text) to anon, authenticated;

-- 4) RPC: send poke (token-gated sender; prevents spoofing from_name)
create or replace function public.send_poke(p_from_signup_id uuid, p_delete_token uuid, p_to_signup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
begin
  if p_from_signup_id = p_to_signup_id then
    raise exception 'Cannot poke yourself';
  end if;

  select play_date into d
  from public.signups
  where id = p_from_signup_id
    and delete_token = p_delete_token;

  if d is null then
    raise exception 'Not authorized';
  end if;

  insert into public.pokes (play_date, from_signup_id, to_signup_id)
  select d, p_from_signup_id, p_to_signup_id
  where exists (
    select 1
    from public.signups t
    where t.id = p_to_signup_id
      and t.play_date = d
  );
end;
$$;

revoke all on function public.send_poke(uuid, uuid, uuid) from public;
grant execute on function public.send_poke(uuid, uuid, uuid) to anon, authenticated;

-- 5) RPC: fetch pokes addressed to you (token-gated recipient)
create or replace function public.fetch_my_pokes(p_signup_id uuid, p_delete_token uuid)
returns table (
  id uuid,
  from_player_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.id, fs.player_name as from_player_name, p.created_at
  from public.pokes p
  join public.signups me on me.id = p.to_signup_id
  join public.signups fs on fs.id = p.from_signup_id
  where me.id = p_signup_id
    and me.delete_token = p_delete_token
  order by p.created_at desc
  limit 50;
end;
$$;

revoke all on function public.fetch_my_pokes(uuid, uuid) from public;
grant execute on function public.fetch_my_pokes(uuid, uuid) to anon, authenticated;
