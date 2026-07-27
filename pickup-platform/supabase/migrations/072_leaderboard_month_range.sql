-- Optional time range for caps + MVP leaderboards (month chips on the public board).
-- Null range = all-time. When set, counts ONLY events with starts_at in [start, end)
-- (that calendar month) — not cumulative "up to" the month. Streaks stay all-time only.

drop function if exists public.org_caps_leaderboard(uuid, timestamptz, int);

create or replace function public.org_caps_leaderboard(
  p_org_id uuid,
  p_as_of timestamptz default now(),
  p_limit int default 100,
  p_range_start timestamptz default null,
  p_range_end timestamptz default null
)
returns table (
  participant_id uuid,
  display_name text,
  caps bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as participant_id,
    p.display_name,
    count(distinct s.event_id)::bigint as caps
  from public.signups s
  join public.events e on e.id = s.event_id
  join public.participants p on p.id = s.participant_id
  where s.org_id = p_org_id
    and e.status <> 'cancelled'
    and e.starts_at < p_as_of
    and (p_range_start is null or e.starts_at >= p_range_start)
    and (p_range_end is null or e.starts_at < p_range_end)
  group by p.id, p.display_name
  having count(distinct s.event_id) > 0
  order by caps desc, p.display_name asc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 100), 500));
$$;

drop function if exists public.org_mvp_leaderboard(uuid, int);

create or replace function public.org_mvp_leaderboard(
  p_org_id uuid,
  p_limit int default 50,
  p_range_start timestamptz default null,
  p_range_end timestamptz default null
)
returns table (
  participant_id uuid,
  display_name text,
  mvp_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as participant_id,
    p.display_name,
    count(*)::bigint as mvp_count
  from public.session_mvp_awards a
  join public.participants p on p.id = a.participant_id
  join public.events e on e.id = a.event_id
  where a.org_id = p_org_id
    and e.status <> 'cancelled'
    and (p_range_start is null or e.starts_at >= p_range_start)
    and (p_range_end is null or e.starts_at < p_range_end)
  group by p.id, p.display_name
  having count(*) > 0
  order by mvp_count desc, p.display_name asc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 50), 200));
$$;

grant execute on function public.org_caps_leaderboard(uuid, timestamptz, int, timestamptz, timestamptz)
  to anon, authenticated;
grant execute on function public.org_mvp_leaderboard(uuid, int, timestamptz, timestamptz)
  to anon, authenticated;
