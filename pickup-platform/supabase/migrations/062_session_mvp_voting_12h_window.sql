-- Extend session MVP voting window from 6 to 12 hours after session end.

create or replace function public.session_mvp_voting_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.event_ends_at(p_event_id) > now() - interval '12 hours'
    and public.event_ends_at(p_event_id) <= now();
$$;

create or replace function public.finalize_session_mvp_votes(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_starts_at timestamptz;
  v_badge_expires_at timestamptz;
  v_max_votes int := 0;
  v_total_votes int := 0;
  r record;
begin
  if exists (
    select 1 from public.session_mvp_finalizations f where f.event_id = p_event_id
  ) then
    return;
  end if;

  select e.org_id, e.starts_at
  into v_org_id, v_starts_at
  from public.events e
  where e.id = p_event_id;

  if v_org_id is null then
    return;
  end if;

  if not public.org_session_mvp_voting_enabled(v_org_id) then
    return;
  end if;

  if public.event_ends_at(p_event_id) > now() - interval '12 hours' then
    return;
  end if;

  select count(*)::int into v_total_votes
  from public.session_mvp_votes v
  where v.event_id = p_event_id;

  insert into public.session_mvp_finalizations (event_id, org_id, total_votes)
  values (p_event_id, v_org_id, v_total_votes);

  if v_total_votes = 0 then
    return;
  end if;

  select max(vote_count) into v_max_votes
  from (
    select count(*)::int as vote_count
    from public.session_mvp_votes v
    where v.event_id = p_event_id
    group by v.nominee_participant_id
  ) tallies;

  v_badge_expires_at := coalesce(
    public.next_org_event_ends_at(v_org_id, v_starts_at),
    public.event_ends_at(p_event_id) + interval '7 days'
  );

  for r in
    select v.nominee_participant_id, count(*)::int as vote_count
    from public.session_mvp_votes v
    where v.event_id = p_event_id
    group by v.nominee_participant_id
    having count(*) = v_max_votes
  loop
    insert into public.session_mvp_awards (
      org_id, event_id, participant_id, vote_count, badge_expires_at
    )
    values (
      v_org_id, p_event_id, r.nominee_participant_id, r.vote_count, v_badge_expires_at
    );
  end loop;
end;
$$;

create or replace function public.finalize_pending_session_mvp_votes(
  p_lookback_hours int default 48
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select e.id as event_id
    from public.events e
    where e.status <> 'cancelled'
      and public.event_ends_at(e.id) <= now() - interval '12 hours'
      and public.event_ends_at(e.id) > now() - make_interval(hours => greatest(1, least(p_lookback_hours, 336)))
      and public.org_session_mvp_voting_enabled(e.org_id)
      and not exists (
        select 1 from public.session_mvp_finalizations f where f.event_id = e.id
      )
  loop
    perform public.finalize_session_mvp_votes(r.event_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
