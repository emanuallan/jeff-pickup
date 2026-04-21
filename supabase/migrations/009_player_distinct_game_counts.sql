-- Distinct pickup days per player name (case-insensitive), for "new player" roster badge.

create or replace function public.player_distinct_game_counts(p_names text[])
returns table (name_key text, game_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(s.player_name)) as name_key, count(distinct s.play_date)::bigint as game_count
  from public.signups s
  where coalesce(cardinality(p_names), 0) > 0
    and exists (
      select 1
      from unnest(p_names) as nm
      where lower(trim(s.player_name)) = lower(trim(nm))
    )
  group by lower(trim(s.player_name));
$$;

revoke all on function public.player_distinct_game_counts(text[]) from public;
grant execute on function public.player_distinct_game_counts(text[]) to anon, authenticated;
