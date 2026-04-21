-- All-time caps: distinct pickup days per player (normalized name), for public leaderboard.

create or replace function public.player_caps_leaderboard(p_limit int default 150)
returns table (
  display_name text,
  name_key text,
  caps bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select
      lower(trim(s.player_name)) as nk,
      count(distinct s.play_date)::bigint as caps,
      (array_agg(s.player_name order by s.created_at desc))[1] as display_name
    from public.signups s
    group by lower(trim(s.player_name))
  )
  select
    a.display_name,
    a.nk as name_key,
    a.caps
  from agg a
  where a.caps > 0
  order by a.caps desc, a.nk asc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 150), 500));
$$;

revoke all on function public.player_caps_leaderboard(int) from public;
grant execute on function public.player_caps_leaderboard(int) to anon, authenticated;
