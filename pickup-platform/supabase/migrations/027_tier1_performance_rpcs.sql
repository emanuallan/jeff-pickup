-- Tier 1 performance: SQL-side aggregates and combined public reads.

-- ---------------------------------------------------------------------------
-- get_org_analytics — organizer console org-wide stats (replaces full-table scans)
-- ---------------------------------------------------------------------------

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
    'unique_visitors', (
      select count(distinct viewer_key)::int from public.event_page_views where org_id = p_org_id
    ),
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

revoke all on function public.get_org_analytics(uuid) from public;
grant execute on function public.get_org_analytics(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_org_participant_history — participants with session counts (GROUP BY in SQL)
-- ---------------------------------------------------------------------------

create or replace function public.get_org_participant_history(p_org_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  display_name text,
  phone text,
  session_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.phone,
    count(s.id)::bigint as session_count
  from public.participants p
  left join public.signups s
    on s.participant_id = p.id and s.org_id = p.org_id
  where p.org_id = p_org_id
  group by p.id, p.first_name, p.last_name, p.display_name, p.phone
  order by p.display_name asc;
end;
$$;

revoke all on function public.get_org_participant_history(uuid) from public;
grant execute on function public.get_org_participant_history(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_public_org_and_event — active org + event by slug/short_id in one round trip
-- ---------------------------------------------------------------------------

create or replace function public.get_public_org_and_event(p_slug text, p_event_ref text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.id is null then null::jsonb
    else jsonb_build_object(
      'org', jsonb_build_object(
        'id', o.id,
        'slug', o.slug,
        'name', o.name,
        'description', o.description,
        'status', o.status,
        'default_locale', o.default_locale,
        'branding', o.branding
      ),
      'event', (
        select jsonb_build_object(
          'id', e.id,
          'short_id', e.short_id,
          'org_id', e.org_id,
          'schedule_id', e.schedule_id,
          'location_id', e.location_id,
          'starts_at', e.starts_at,
          'timezone', e.timezone,
          'duration_min', e.duration_min,
          'capacity', e.capacity,
          'min_players', e.min_players,
          'status', e.status,
          'announcement', e.announcement,
          'title', e.title,
          'locations', jsonb_build_object(
            'label', l.label,
            'address', l.address,
            'lat', l.lat,
            'lon', l.lon,
            'maps_url', l.maps_url,
            'is_online', l.is_online,
            'meeting_url', l.meeting_url
          ),
          'schedules', case
            when s.id is null then null
            else jsonb_build_object('title', s.title, 'duration_min', s.duration_min)
          end
        )
        from public.events e
        join public.locations l on l.id = e.location_id
        left join public.schedules s on s.id = e.schedule_id
        where e.org_id = o.id and e.short_id = p_event_ref
      )
    )
  end
  from public.orgs o
  where o.slug = p_slug and o.status = 'active';
$$;

revoke all on function public.get_public_org_and_event(text, text) from public;
grant execute on function public.get_public_org_and_event(text, text) to anon, authenticated;
