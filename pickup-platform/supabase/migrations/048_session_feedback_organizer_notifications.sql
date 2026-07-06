-- Notify organizers when participants submit post-session feedback.

alter table public.organizer_notifications
  drop constraint if exists organizer_notifications_kind_check;

alter table public.organizer_notifications
  add constraint organizer_notifications_kind_check
  check (
    kind in (
      'new_signup_batch',
      'returning_signup_batch',
      'unregister_batch',
      'unregister_immediate',
      'waitlist_signup_batch',
      'session_feedback_immediate'
    )
  );

create or replace function public.record_organizer_session_feedback(
  p_org_id uuid,
  p_event_id uuid,
  p_participant_id uuid,
  p_outcome text,
  p_rating int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_id text;
  v_starts_at timestamptz;
  v_label text;
  v_display_name text;
begin
  if p_outcome not in ('rated', 'no_attend') then
    return;
  end if;

  if not public.org_session_feedback_enabled(p_org_id) then
    return;
  end if;

  select e.short_id, e.starts_at
  into v_short_id, v_starts_at
  from public.events e
  where e.id = p_event_id
    and e.org_id = p_org_id
    and e.status <> 'cancelled'
    and public.event_ends_at(e.id) <= now();

  if v_short_id is null then
    return;
  end if;

  select display_name into v_display_name
  from public.participants
  where id = p_participant_id;

  v_label := public.organizer_notification_event_label(p_event_id);

  insert into public.organizer_notifications (org_id, event_id, kind, payload)
  values (
    p_org_id,
    p_event_id,
    'session_feedback_immediate',
    jsonb_build_object(
      'count', 1,
      'participant_names', jsonb_build_array(v_display_name),
      'event_short_id', v_short_id,
      'event_starts_at', v_starts_at,
      'event_label', v_label,
      'feedback_outcome', p_outcome,
      'rating', case when p_outcome = 'rated' then p_rating else null end
    )
  );
end;
$$;

create or replace function public.submit_session_feedback(
  p_session_token uuid,
  p_event_id uuid,
  p_rating int,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
  v_comment text;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  v_comment := nullif(trim(coalesce(p_comment, '')), '');

  if p_rating <= 2 and v_comment is null then
    raise exception 'Comment is required for ratings of 2 or lower';
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_feedback_eligible(p_event_id, v_participant_id);

  insert into public.session_feedback (org_id, event_id, participant_id, outcome, rating, comment)
  values (v_org_id, p_event_id, v_participant_id, 'rated', p_rating, v_comment);

  perform public.dismiss_participant_feedback_notification(p_event_id, v_participant_id);
  perform public.record_organizer_session_feedback(
    v_org_id, p_event_id, v_participant_id, 'rated', p_rating
  );
end;
$$;

create or replace function public.mark_session_no_attend(
  p_session_token uuid,
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
  v_signup_id uuid;
begin
  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_feedback_eligible(p_event_id, v_participant_id);

  select s.id into v_signup_id
  from public.signups s
  where s.event_id = p_event_id
    and s.participant_id = v_participant_id
    and s.list_status = 'confirmed';

  if v_signup_id is not null then
    insert into public.event_signup_activity (org_id, event_id, participant_id, action)
    values (v_org_id, p_event_id, v_participant_id, 'left');

    delete from public.signups where id = v_signup_id;
  end if;

  insert into public.session_feedback (org_id, event_id, participant_id, outcome, rating, comment)
  values (v_org_id, p_event_id, v_participant_id, 'no_attend', null, null);

  perform public.dismiss_participant_feedback_notification(p_event_id, v_participant_id);
  perform public.record_organizer_session_feedback(
    v_org_id, p_event_id, v_participant_id, 'no_attend', null
  );
end;
$$;

notify pgrst, 'reload schema';
