-- Count only participants whose latest signup activity for an event is "left"
-- (excludes churn: sign up → leave → sign up again).

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
    'unique_visitors', (
      select count(distinct viewer_key)::int from public.event_page_views where event_id = p_event_id
    ),
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
