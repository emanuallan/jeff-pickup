-- Session MVP count leaderboard (per org).
-- Counts finalized awards in session_mvp_awards; co-MVPs each get a row per event.

create index if not exists session_mvp_awards_org_participant_idx
  on public.session_mvp_awards (org_id, participant_id);

create or replace function public.org_mvp_leaderboard(
  p_org_id uuid,
  p_limit int default 50
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
  group by p.id, p.display_name
  having count(*) > 0
  order by mvp_count desc, p.display_name asc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 50), 200));
$$;

grant execute on function public.org_mvp_leaderboard(uuid, int) to anon, authenticated;
