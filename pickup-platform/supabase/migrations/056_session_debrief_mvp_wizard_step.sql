-- Keep the closed MVP screen in the wizard until the participant acknowledges it.
-- Notification dismissal still treats a closed voting window as MVP-complete.

create or replace function public.get_session_debrief_state(
  p_session_token uuid,
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
  v_mvp_enabled boolean;
  v_stats_enabled boolean;
  v_feedback_enabled boolean;
  v_mvp_open boolean;
  v_mvp_vote uuid;
  v_mvp_skipped boolean;
  v_stats_skipped boolean;
  v_feedback_skipped boolean;
  v_feedback_submitted boolean;
  v_stats_submitted boolean;
  v_steps jsonb := '[]'::jsonb;
  v_initial_step text;
begin
  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  if v_org_id is null then
    raise exception 'Session not found';
  end if;

  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_debrief_eligible(p_event_id, v_participant_id);
  perform public.finalize_session_mvp_votes(p_event_id);

  v_mvp_enabled := public.org_session_mvp_voting_enabled(v_org_id);
  v_stats_enabled := public.org_session_player_stats_enabled(v_org_id);
  v_feedback_enabled := public.org_session_feedback_enabled(v_org_id);
  v_mvp_open := public.session_mvp_voting_open(p_event_id);

  select v.nominee_participant_id into v_mvp_vote
  from public.session_mvp_votes v
  where v.event_id = p_event_id and v.voter_participant_id = v_participant_id;

  select exists (
    select 1 from public.session_debrief_skips s
    where s.event_id = p_event_id and s.participant_id = v_participant_id and s.step = 'mvp'
  ) into v_mvp_skipped;

  select exists (
    select 1 from public.session_debrief_skips s
    where s.event_id = p_event_id and s.participant_id = v_participant_id and s.step = 'stats'
  ) into v_stats_skipped;

  select exists (
    select 1 from public.session_debrief_skips s
    where s.event_id = p_event_id and s.participant_id = v_participant_id and s.step = 'feedback'
  ) into v_feedback_skipped;

  select exists (
    select 1 from public.session_player_stats s
    where s.event_id = p_event_id and s.participant_id = v_participant_id
  ) into v_stats_submitted;

  select exists (
    select 1 from public.session_feedback sf
    where sf.event_id = p_event_id and sf.participant_id = v_participant_id
  ) into v_feedback_submitted;

  if v_mvp_enabled then
    v_steps := v_steps || jsonb_build_array('mvp');
  end if;
  if v_stats_enabled then
    v_steps := v_steps || jsonb_build_array('stats');
  end if;
  if v_feedback_enabled then
    v_steps := v_steps || jsonb_build_array('feedback');
  end if;

  -- Wizard resume: show MVP until the participant votes or explicitly continues/skips.
  if v_mvp_enabled and v_mvp_vote is null and not v_mvp_skipped then
    v_initial_step := 'mvp';
  elsif v_stats_enabled and not public.session_stats_step_complete(p_event_id, v_participant_id, v_org_id) then
    v_initial_step := 'stats';
  elsif v_feedback_enabled and not public.session_feedback_step_complete(p_event_id, v_participant_id, v_org_id) then
    v_initial_step := 'feedback';
  else
    v_initial_step := coalesce(v_steps->>0, 'feedback');
  end if;

  return jsonb_build_object(
    'mvp_voting_enabled', v_mvp_enabled,
    'player_stats_enabled', v_stats_enabled,
    'feedback_enabled', v_feedback_enabled,
    'mvp_voting_open', v_mvp_open,
    'mvp_vote_cast', v_mvp_vote is not null,
    'mvp_nominee_participant_id', v_mvp_vote,
    'mvp_skipped', v_mvp_skipped,
    'mvp_step_complete', public.session_mvp_step_complete(p_event_id, v_participant_id, v_org_id),
    'stats_submitted', v_stats_submitted,
    'stats_skipped', v_stats_skipped,
    'stats_step_complete', public.session_stats_step_complete(p_event_id, v_participant_id, v_org_id),
    'feedback_submitted', v_feedback_submitted,
    'feedback_skipped', v_feedback_skipped,
    'feedback_step_complete', public.session_feedback_step_complete(p_event_id, v_participant_id, v_org_id),
    'debrief_complete', public.session_debrief_complete(p_event_id, v_participant_id, v_org_id),
    'initial_step', v_initial_step,
    'steps', v_steps,
    'ballot', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'participant_id', s.participant_id,
          'display_name', public.participant_roster_display_name(s.participant_id)
        )
        order by public.participant_roster_display_name(s.participant_id)
      )
      from public.signups s
      where s.event_id = p_event_id
        and s.list_status = 'confirmed'
        and s.participant_id <> v_participant_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.skip_session_debrief_step(
  p_session_token uuid,
  p_event_id uuid,
  p_step text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
begin
  if p_step not in ('mvp', 'stats', 'feedback') then
    raise exception 'Invalid step';
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_debrief_eligible(p_event_id, v_participant_id);

  if p_step = 'mvp' and not public.org_session_mvp_voting_enabled(v_org_id) then
    raise exception 'MVP voting is not enabled';
  end if;

  if p_step = 'stats' and not public.org_session_player_stats_enabled(v_org_id) then
    raise exception 'Player stats are not enabled';
  end if;

  if p_step = 'feedback' and not public.org_session_feedback_enabled(v_org_id) then
    raise exception 'Session feedback is not enabled';
  end if;

  -- Allow MVP skip after the voting window closes so participants can acknowledge the closed screen.

  insert into public.session_debrief_skips (event_id, participant_id, step)
  values (p_event_id, v_participant_id, p_step)
  on conflict (event_id, participant_id, step) do nothing;

  perform public.try_dismiss_debrief_notification(p_event_id, v_participant_id);
end;
$$;

grant execute on function public.get_session_debrief_state(uuid, uuid) to anon, authenticated;
grant execute on function public.skip_session_debrief_step(uuid, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
