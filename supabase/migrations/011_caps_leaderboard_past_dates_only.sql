-- Caps = distinct pickup days that are strictly before the client's "as of" calendar date.

drop function if exists public.player_caps_leaderboard(int);

create or replace function public.player_caps_leaderboard(p_as_of date, p_limit int default 150)
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
    where s.play_date < p_as_of
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

revoke all on function public.player_caps_leaderboard(date, int) from public;
grant execute on function public.player_caps_leaderboard(date, int) to anon, authenticated;
