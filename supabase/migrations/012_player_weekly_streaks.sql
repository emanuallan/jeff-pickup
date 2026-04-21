-- Weekly streaks per player name (case-insensitive).
-- A "week" is Postgres date_trunc('week', ...): Monday-start, local-agnostic since play_date is a DATE.
--
-- current_streak_weeks:
--   consecutive weeks with >=1 signup, ending in the week of p_as_of (inclusive).
--   if the player has no signup in the week of p_as_of, current streak is 0.
--
-- best_streak_weeks:
--   maximum consecutive-weeks run across all weeks up through p_as_of.

create or replace function public.player_weekly_streaks(p_names text[], p_as_of date)
returns table (
  name_key text,
  current_streak_weeks bigint,
  best_streak_weeks bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with input_names as (
    select lower(trim(nm)) as nk
    from unnest(coalesce(p_names, '{}'::text[])) as nm
    where trim(coalesce(nm, '')) <> ''
  ),
  weeks as (
    select
      lower(trim(s.player_name)) as nk,
      date_trunc('week', s.play_date::timestamp)::date as week_start
    from public.signups s
    where exists (select 1 from input_names i where i.nk = lower(trim(s.player_name)))
      and s.play_date <= p_as_of
    group by lower(trim(s.player_name)), date_trunc('week', s.play_date::timestamp)::date
  ),
  numbered as (
    select
      w.nk,
      w.week_start,
      row_number() over (partition by w.nk order by w.week_start) as rn
    from weeks w
  ),
  grouped as (
    select
      n.nk,
      n.week_start,
      (n.week_start - (n.rn * 7) * interval '1 day') as grp
    from numbered n
  ),
  runs as (
    select
      g.nk,
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
      r.run_len::bigint as current_len
    from runs r
    where r.run_end_week = date_trunc('week', p_as_of::timestamp)::date
  )
  select
    i.nk as name_key,
    coalesce(c.current_len, 0)::bigint as current_streak_weeks,
    coalesce(b.best_len, 0)::bigint as best_streak_weeks
  from input_names i
  left join best b on b.nk = i.nk
  left join current c on c.nk = i.nk;
$$;

revoke all on function public.player_weekly_streaks(text[], date) from public;
grant execute on function public.player_weekly_streaks(text[], date) to anon, authenticated;

