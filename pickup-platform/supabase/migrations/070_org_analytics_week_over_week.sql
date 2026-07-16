-- Week-over-week trends for organizer console "At a glance" analytics.
-- Extends get_org_analytics with period counts; adds time indexes for the filters.

create index if not exists event_page_views_org_viewed_at_idx
  on public.event_page_views (org_id, viewed_at desc);

create index if not exists event_signup_activity_org_created_at_idx
  on public.event_signup_activity (org_id, created_at desc);

create index if not exists participants_org_created_at_idx
  on public.participants (org_id, created_at desc);

create or replace function public.get_org_analytics(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_week_start timestamptz := now() - interval '7 days';
  v_prev_start timestamptz := now() - interval '14 days';
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
      where org_id = p_org_id and status <> 'cancelled' and starts_at < v_now
    ),
    'avg_attendance', (
      with past_events as (
        select id
        from public.events
        where org_id = p_org_id and status <> 'cancelled' and starts_at < v_now
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
        where org_id = p_org_id and status <> 'cancelled' and starts_at >= v_now
      )
      select coalesce(sum(1 + coalesce(s.guest_count, 0)), 0)::int
      from public.signups s
      where s.org_id = p_org_id
        and s.event_id in (select id from upcoming_events)
    ),
    'trends', jsonb_build_object(
      'page_views', jsonb_build_object(
        'current', (
          select count(*)::int
          from public.event_page_views
          where org_id = p_org_id
            and viewed_at >= v_week_start
            and viewed_at < v_now
        ),
        'previous', (
          select count(*)::int
          from public.event_page_views
          where org_id = p_org_id
            and viewed_at >= v_prev_start
            and viewed_at < v_week_start
        )
      ),
      'joins', jsonb_build_object(
        'current', (
          select count(*)::int
          from public.event_signup_activity
          where org_id = p_org_id
            and action = 'joined'
            and created_at >= v_week_start
            and created_at < v_now
        ),
        'previous', (
          select count(*)::int
          from public.event_signup_activity
          where org_id = p_org_id
            and action = 'joined'
            and created_at >= v_prev_start
            and created_at < v_week_start
        )
      ),
      'new_participants', jsonb_build_object(
        'current', (
          select count(*)::int
          from public.participants
          where org_id = p_org_id
            and created_at >= v_week_start
            and created_at < v_now
        ),
        'previous', (
          select count(*)::int
          from public.participants
          where org_id = p_org_id
            and created_at >= v_prev_start
            and created_at < v_week_start
        )
      ),
      'sessions', jsonb_build_object(
        'current', (
          select count(*)::int
          from public.events
          where org_id = p_org_id
            and status <> 'cancelled'
            and starts_at >= v_week_start
            and starts_at < v_now
        ),
        'previous', (
          select count(*)::int
          from public.events
          where org_id = p_org_id
            and status <> 'cancelled'
            and starts_at >= v_prev_start
            and starts_at < v_week_start
        )
      ),
      'avg_attendance', (
        with current_events as (
          select id
          from public.events
          where org_id = p_org_id
            and status <> 'cancelled'
            and starts_at >= v_week_start
            and starts_at < v_now
        ),
        previous_events as (
          select id
          from public.events
          where org_id = p_org_id
            and status <> 'cancelled'
            and starts_at >= v_prev_start
            and starts_at < v_week_start
        ),
        current_avg as (
          select case
            when count(*) = 0 then null
            else round(avg(headcount), 1)
          end as value
          from (
            select s.event_id, sum(1 + coalesce(s.guest_count, 0))::numeric as headcount
            from public.signups s
            where s.org_id = p_org_id
              and s.event_id in (select id from current_events)
            group by s.event_id
          ) h
        ),
        previous_avg as (
          select case
            when count(*) = 0 then null
            else round(avg(headcount), 1)
          end as value
          from (
            select s.event_id, sum(1 + coalesce(s.guest_count, 0))::numeric as headcount
            from public.signups s
            where s.org_id = p_org_id
              and s.event_id in (select id from previous_events)
            group by s.event_id
          ) h
        )
        select jsonb_build_object(
          'current', (select value from current_avg),
          'previous', (select value from previous_avg)
        )
      )
    )
  );
end;
$$;
