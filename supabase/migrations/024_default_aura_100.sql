-- Default aura: 100 (was 1000 in initial aura migration).
-- This changes the default for new rows and the fallback behavior in helper functions.

alter table public.player_aura
  alter column aura set default 100;

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
  values (nk, 100 + p_delta, now())
  on conflict (name_key) do update set
    aura = public.player_aura.aura + p_delta,
    updated_at = now();
end;
$$;

-- bump_aura is for triggers / send_poke only — do not expose to clients
revoke all on function public.bump_aura(text, bigint, text, jsonb) from public;

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
    coalesce(p.aura, 100)::bigint as aura
  from input_keys k
  left join public.player_aura p on p.name_key = k.nk;
$$;

revoke all on function public.get_player_aura(text[]) from public;
grant execute on function public.get_player_aura(text[]) to anon, authenticated;

