-- MVP badge stays active until the next non-cancelled org session ends.
-- Cancelled sessions are skipped when determining that boundary.

create or replace function public.session_mvp_badge_is_active(
  p_org_id uuid,
  p_award_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when next_event.next_ends_at is null then true
    else next_event.next_ends_at > now()
  end
  from public.events award
  left join lateral (
    select public.event_ends_at(e.id) as next_ends_at
    from public.events e
    where e.org_id = p_org_id
      and e.status <> 'cancelled'
      and e.starts_at > award.starts_at
    order by e.starts_at asc
    limit 1
  ) next_event on true
  where award.id = p_award_event_id;
$$;

create or replace function public.get_active_session_mvp_badges(p_org_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      a.participant_id::text,
      jsonb_build_object(
        'event_label', public.participant_feedback_event_label(a.event_id),
        'event_id', a.event_id
      )
    ),
    '{}'::jsonb
  )
  from public.session_mvp_awards a
  where a.org_id = p_org_id
    and public.session_mvp_badge_is_active(a.org_id, a.event_id);
$$;

grant execute on function public.session_mvp_badge_is_active(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
