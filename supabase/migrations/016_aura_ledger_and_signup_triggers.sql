-- Aura: per normalized player name, default 1000, unbounded (may go negative).
-- Register +5 / -5, first-in-week (Mon ISO) +2 with cap 500 on sum of positive week_proxy, weekly undo on last delete in week.

create table if not exists public.player_aura (
  name_key text primary key
    check (name_key = lower(name_key) and name_key = trim(both from name_key) and name_key <> ''),
  aura bigint not null default 1000,
  updated_at timestamptz not null default now()
);

create table if not exists public.aura_ledger (
  id bigserial primary key,
  name_key text not null
    check (name_key = lower(name_key) and name_key = trim(both from name_key) and name_key <> ''),
  delta bigint not null,
  reason text not null,
  ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aura_ledger_name_reason on public.aura_ledger (name_key, reason);

alter table public.player_aura enable row level security;
alter table public.aura_ledger enable row level security;

drop policy if exists "Public can read player_aura" on public.player_aura;
create policy "Public can read player_aura"
  on public.player_aura
  for select
  to anon, authenticated
  using (true);

-- Ledger is not publicly readable; written only by bump_aura (definer).

create or replace function public.bump_aura(
  p_name text,
  p_delta bigint,
  p_reason text,
  p_ref jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nk text;
  wpos bigint;
begin
  nk := nullif(lower(trim(p_name)), '');
  if nk is null then
    return;
  end if;

  if p_reason = 'week_proxy' and p_delta > 0 then
    select coalesce(sum(l.delta), 0)::bigint into wpos
    from public.aura_ledger l
    where l.name_key = nk
      and l.reason = 'week_proxy'
      and l.delta > 0;
    if wpos >= 500 then
      return;
    end if;
  end if;

  insert into public.aura_ledger (name_key, delta, reason, ref)
  values (nk, p_delta, p_reason, coalesce(p_ref, '{}'::jsonb));

  insert into public.player_aura (name_key, aura, updated_at)
  values (nk, 1000 + p_delta, now())
  on conflict (name_key) do update set
    aura = public.player_aura.aura + p_delta,
    updated_at = now();
end;
$$;

-- bump_aura is for triggers / send_poke only — do not expose to clients
revoke all on function public.bump_aura(text, bigint, text, jsonb) from public;

create or replace function public.signups_aura_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nk text;
  ws date;
  others int;
begin
  nk := lower(trim(new.player_name));
  if nk = '' then
    return new;
  end if;

  perform public.bump_aura(nk, 5, 'register', jsonb_build_object('signup_id', new.id, 'play_date', new.play_date::text));

  ws := date_trunc('week', new.play_date::timestamp)::date;
  select count(*)::int into others
  from public.signups s
  where lower(trim(s.player_name)) = nk
    and s.id <> new.id
    and date_trunc('week', s.play_date::timestamp)::date = ws;

  if others = 0 then
    perform public.bump_aura(
      nk,
      2,
      'week_proxy',
      jsonb_build_object('week_start', ws::text, 'signup_id', new.id, 'play_date', new.play_date::text)
    );
  end if;

  return new;
end;
$$;

create or replace function public.signups_aura_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nk text;
  ws date;
  rem int;
  had_week_grant boolean;
begin
  nk := lower(trim(old.player_name));
  if nk = '' then
    return old;
  end if;

  perform public.bump_aura(nk, -5, 'register_undo', jsonb_build_object('signup_id', old.id, 'play_date', old.play_date::text));

  ws := date_trunc('week', old.play_date::timestamp)::date;
  select count(*)::int into rem
  from public.signups s
  where lower(trim(s.player_name)) = nk
    and date_trunc('week', s.play_date::timestamp)::date = ws;

  if rem = 0 then
    select exists(
      select 1
      from public.aura_ledger l
      where l.name_key = nk
        and l.reason = 'week_proxy'
        and l.delta > 0
        and (l.ref->>'week_start') = ws::text
    ) into had_week_grant;

    if had_week_grant then
      perform public.bump_aura(
        nk,
        -2,
        'week_proxy',
        jsonb_build_object('week_start', ws::text, 'signup_id', old.id, 'play_date', old.play_date::text, 'undo', true)
      );
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists signups_aura_after_insert on public.signups;
create trigger signups_aura_after_insert
  after insert on public.signups
  for each row execute function public.signups_aura_after_insert();

drop trigger if exists signups_aura_after_delete on public.signups;
create trigger signups_aura_after_delete
  after delete on public.signups
  for each row execute function public.signups_aura_after_delete();

-- Seed 1000 for all names already in signups (idempotent)
insert into public.player_aura (name_key, aura)
select distinct lower(trim(s.player_name)) as name_key, 1000
from public.signups s
where nullif(lower(trim(s.player_name)), '') is not null
on conflict (name_key) do nothing;

create or replace function public.get_player_aura(p_names text[])
returns table (name_key text, aura bigint)
language sql
stable
security definer
set search_path = public
as $$
  with input_keys as (
    select distinct n.nk
    from unnest(coalesce(p_names, '{}'::text[])) as raw
    cross join lateral (select nullif(lower(trim(raw)), '') as nk) n
    where n.nk is not null
  )
  select
    k.nk,
    coalesce(p.aura, 1000)::bigint as aura
  from input_keys k
  left join public.player_aura p on p.name_key = k.nk;
$$;

revoke all on function public.get_player_aura(text[]) from public;
grant execute on function public.get_player_aura(text[]) to anon, authenticated;
