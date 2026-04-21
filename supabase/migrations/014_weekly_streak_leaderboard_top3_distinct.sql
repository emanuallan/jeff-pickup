-- Weekly streak leaderboard: include only the top 3 distinct current streak values (ties included).

drop function if exists public.weekly_streak_leaderboard(date, int);

create or replace function public.weekly_streak_leaderboard(p_as_of date, p_limit int default 150)
returns table (
  display_name text,
  name_key text,
  current_streak_weeks bigint,
  best_streak_weeks bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with weeks as (
    select
      lower(trim(s.player_name)) as nk,
      date_trunc('week', s.play_date::timestamp)::date as week_start,
      (array_agg(s.player_name order by s.created_at desc))[1] as display_name
    from public.signups s
    where s.play_date <= p_as_of
    group by lower(trim(s.player_name)), date_trunc('week', s.play_date::timestamp)::date
  ),
  numbered as (
    select
      w.nk,
      w.display_name,
      w.week_start,
      row_number() over (partition by w.nk order by w.week_start) as rn
    from weeks w
  ),
  grouped as (
    select
      n.nk,
      n.display_name,
      n.week_start,
      (n.week_start - (n.rn * 7) * interval '1 day') as grp
    from numbered n
  ),
  runs as (
    select
      g.nk,
      max(g.display_name) as display_name,
      g.grp,
      count(*)::bigint as run_len,
      max(g.week_start) as run_end_week
    from grouped g
    group by g.nk, g.grp
  ),
  best as (
    select r.nk, max(r.run_len)::bigint as best_len
    from runs r
    group by r.nk
  ),
  current as (
    select
      r.nk,
      r.display_name,
      r.run_len::bigint as current_len
    from runs r
    where r.run_end_week = date_trunc('week', p_as_of::timestamp)::date
      and r.run_len > 0
  ),
  top3 as (
    select distinct c.current_len
    from current c
    order by c.current_len desc
    limit 3
  )
  select
    c.display_name,
    c.nk as name_key,
    c.current_len as current_streak_weeks,
    coalesce(b.best_len, c.current_len)::bigint as best_streak_weeks
  from current c
  left join best b on b.nk = c.nk
  where c.current_len in (select t.current_len from top3 t)
  order by c.current_len desc, best_streak_weeks desc, c.nk asc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 150), 500));
$$;

revoke all on function public.weekly_streak_leaderboard(date, int) from public;
grant execute on function public.weekly_streak_leaderboard(date, int) to anon, authenticated;

