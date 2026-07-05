-- Count unique visitors as distinct people (participants deduped, guests by viewer_key),
-- matching the organizer console visitor breakdown sheet.

create or replace function public.count_unique_page_view_people_for_event(p_event_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(distinct person_key)::int
  from (
    select coalesce(max(participant_id::text), 'guest:' || viewer_key) as person_key
    from public.event_page_views
    where event_id = p_event_id
    group by viewer_key
  ) per_viewer;
$$;

create or replace function public.count_unique_page_view_people_for_org(p_org_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(distinct person_key)::int
  from (
    select coalesce(max(participant_id::text), 'guest:' || viewer_key) as person_key
    from public.event_page_views
    where org_id = p_org_id
    group by viewer_key
  ) per_viewer;
$$;

revoke all on function public.count_unique_page_view_people_for_event(uuid) from public;
grant execute on function public.count_unique_page_view_people_for_event(uuid) to authenticated;

revoke all on function public.count_unique_page_view_people_for_org(uuid) from public;
grant execute on function public.count_unique_page_view_people_for_org(uuid) to authenticated;

create or replace function public.get_event_analytics(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.events where id = p_event_id;

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if not public.is_org_member(v_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'page_views', (
      select count(*)::int from public.event_page_views where event_id = p_event_id
    ),
    'unique_visitors', public.count_unique_page_view_people_for_event(p_event_id),
    'unique_signups', (
      select count(distinct participant_id)::int
      from public.event_signup_activity
      where event_id = p_event_id and action = 'joined'
    ),
    'unique_left', (
      select count(*)::int
      from (
        select distinct on (participant_id) action
        from public.event_signup_activity
        where event_id = p_event_id
        order by participant_id, created_at desc
      ) latest
      where action = 'left'
    )
  );
end;
$$;

create or replace function public.get_org_analytics(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'page_views', (
      select count(*)::int from public.event_page_views where org_id = p_org_id
    ),
    'unique_visitors', public.count_unique_page_view_people_for_org(p_org_id),
    'unique_signups', (
      select count(distinct participant_id)::int
      from public.event_signup_activity
      where org_id = p_org_id and action = 'joined'
    ),
    'unique_left', (
      select count(distinct participant_id)::int
      from public.event_signup_activity
      where org_id = p_org_id and action = 'left'
    ),
    'past_sessions', (
      select count(*)::int
      from public.events
      where org_id = p_org_id and status <> 'cancelled' and starts_at < now()
    ),
    'avg_attendance', (
      with past_events as (
        select id
        from public.events
        where org_id = p_org_id and status <> 'cancelled' and starts_at < now()
      ),
      event_headcounts as (
        select s.event_id, sum(1 + coalesce(s.guest_count, 0))::numeric as headcount
        from public.signups s
        where s.org_id = p_org_id
          and s.event_id in (select id from past_events)
        group by s.event_id
      )
      select case
        when count(*) = 0 then null
        else round(avg(headcount), 1)
      end
      from event_headcounts
    ),
    'active_signups', (
      with upcoming_events as (
        select id
        from public.events
        where org_id = p_org_id and status <> 'cancelled' and starts_at >= now()
      )
      select coalesce(sum(1 + coalesce(s.guest_count, 0)), 0)::int
      from public.signups s
      where s.org_id = p_org_id
        and s.event_id in (select id from upcoming_events)
    )
  );
end;
$$;
