-- Keep weekly streaks active through the current week and grace the prior week
-- (so streaks don't vanish before this week's session). Bucket weeks in each
-- event's timezone instead of UTC.

create or replace function public.org_weekly_streak_leaderboard(
  p_org_id uuid,
  p_as_of date default current_date,
  p_limit int default 50
)
returns table (
  participant_id uuid,
  display_name text,
  current_streak_weeks bigint,
  best_streak_weeks bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with org_tz as (
    select coalesce(
      (select s.timezone from public.schedules s where s.org_id = p_org_id limit 1),
      'UTC'
    ) as tz
  ),
  ref as (
    select
      ot.tz,
      date_trunc('week', timezone(ot.tz, p_as_of::timestamp))::date as current_week,
      (date_trunc('week', timezone(ot.tz, p_as_of::timestamp)) - interval '7 days')::date as grace_week
    from org_tz ot
  ),
  weeks as (
    select
      s.participant_id,
      date_trunc(
        'week',
        (e.starts_at at time zone coalesce(e.timezone, 'UTC'))
      )::date as week_start,
      max(p.display_name) as display_name
    from public.signups s
    join public.events e on e.id = s.event_id
    join public.participants p on p.id = s.participant_id
    where s.org_id = p_org_id
      and e.status <> 'cancelled'
      and (e.starts_at at time zone coalesce(e.timezone, 'UTC'))::date <= p_as_of
    group by s.participant_id, date_trunc(
      'week',
      (e.starts_at at time zone coalesce(e.timezone, 'UTC'))
    )::date
  ),
  numbered as (
    select
      w.participant_id,
      w.display_name,
      w.week_start,
      row_number() over (partition by w.participant_id order by w.week_start) as rn
    from weeks w
  ),
  grouped as (
    select
      n.participant_id,
      n.display_name,
      n.week_start,
      (n.week_start - (n.rn * 7) * interval '1 day') as grp
    from numbered n
  ),
  runs as (
    select
      g.participant_id,
      max(g.display_name) as display_name,
      g.grp,
      count(*)::bigint as run_len,
      max(g.week_start) as run_end_week
    from grouped g
    group by g.participant_id, g.grp
  ),
  best as (
    select r.participant_id, max(r.run_len)::bigint as best_len
    from runs r
    group by r.participant_id
  ),
  latest as (
    select w.participant_id, max(w.week_start) as last_week
    from weeks w
    group by w.participant_id
  ),
  current as (
    select r.participant_id, r.display_name, r.run_len::bigint as current_len
    from runs r
    join latest l on l.participant_id = r.participant_id and l.last_week = r.run_end_week
    cross join ref
    where l.last_week >= ref.grace_week
  )
  select
    c.participant_id,
    c.display_name,
    c.current_len as current_streak_weeks,
    coalesce(b.best_len, c.current_len)::bigint as best_streak_weeks
  from current c
  left join best b on b.participant_id = c.participant_id
  where c.current_len > 0
  order by current_streak_weeks desc, best_streak_weeks desc, c.display_name asc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 50), 200));
$$;

create or replace function public.participant_engagement_stats(
  p_org_id uuid,
  p_participant_ids uuid[],
  p_as_of date default current_date
)
returns table (
  participant_id uuid,
  caps bigint,
  total_sessions bigint,
  current_streak_weeks bigint,
  best_streak_weeks bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with org_tz as (
    select coalesce(
      (select s.timezone from public.schedules s where s.org_id = p_org_id limit 1),
      'UTC'
    ) as tz
  ),
  ref as (
    select
      (date_trunc('week', timezone(ot.tz, p_as_of::timestamp)) - interval '7 days')::date as grace_week
    from org_tz ot
  ),
  caps_agg as (
    select
      s.participant_id,
      count(distinct s.event_id)::bigint as caps
    from public.signups s
    join public.events e on e.id = s.event_id
    where s.org_id = p_org_id
      and s.participant_id = any(p_participant_ids)
      and e.status <> 'cancelled'
      and e.starts_at::date < p_as_of
    group by s.participant_id
  ),
  total_agg as (
    select
      s.participant_id,
      count(distinct s.event_id)::bigint as total_sessions
    from public.signups s
    join public.events e on e.id = s.event_id
    where s.org_id = p_org_id
      and s.participant_id = any(p_participant_ids)
      and e.status <> 'cancelled'
    group by s.participant_id
  ),
  weeks as (
    select
      s.participant_id,
      date_trunc(
        'week',
        (e.starts_at at time zone coalesce(e.timezone, 'UTC'))
      )::date as week_start
    from public.signups s
    join public.events e on e.id = s.event_id
    where s.org_id = p_org_id
      and s.participant_id = any(p_participant_ids)
      and e.status <> 'cancelled'
      and (e.starts_at at time zone coalesce(e.timezone, 'UTC'))::date <= p_as_of
    group by s.participant_id, date_trunc(
      'week',
      (e.starts_at at time zone coalesce(e.timezone, 'UTC'))
    )::date
  ),
  numbered as (
    select
      w.participant_id,
      w.week_start,
      row_number() over (partition by w.participant_id order by w.week_start) as rn
    from weeks w
  ),
  grouped as (
    select
      n.participant_id,
      n.week_start,
      (n.week_start - (n.rn * 7) * interval '1 day') as grp
    from numbered n
  ),
  runs as (
    select
      g.participant_id,
      g.grp,
      count(*)::bigint as run_len,
      max(g.week_start) as run_end_week
    from grouped g
    group by g.participant_id, g.grp
  ),
  best as (
    select r.participant_id, max(r.run_len)::bigint as best_len
    from runs r
    group by r.participant_id
  ),
  latest as (
    select w.participant_id, max(w.week_start) as last_week
    from weeks w
    group by w.participant_id
  ),
  current as (
    select r.participant_id, r.run_len::bigint as current_len
    from runs r
    join latest l on l.participant_id = r.participant_id and l.last_week = r.run_end_week
    cross join ref
    where l.last_week >= ref.grace_week
  ),
  input_ids as (
    select unnest(p_participant_ids) as participant_id
  )
  select
    i.participant_id,
    coalesce(c.caps, 0)::bigint as caps,
    coalesce(t.total_sessions, 0)::bigint as total_sessions,
    coalesce(cur.current_len, 0)::bigint as current_streak_weeks,
    coalesce(b.best_len, 0)::bigint as best_streak_weeks
  from input_ids i
  left join caps_agg c on c.participant_id = i.participant_id
  left join total_agg t on t.participant_id = i.participant_id
  left join current cur on cur.participant_id = i.participant_id
  left join best b on b.participant_id = i.participant_id;
$$;
