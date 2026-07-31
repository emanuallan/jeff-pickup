-- Soft participant /me: profile update (name/email only) + career stats aggregates.
-- Phone stays immutable here — changing phone via ensure_soft_participant would
-- create/switch identity and orphan history. Follow-up: same-participant_id phone
-- UPDATE with unique-conflict reject (no auto-merge of two histories).

create or replace function public.update_soft_participant_profile(
  p_session_token uuid,
  p_org_id uuid,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_email text;
  v_display text;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  v_participant_id := public.resolve_session_participant(p_session_token, p_org_id);
  if v_participant_id is null then
    raise exception 'Session expired';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_email := nullif(lower(trim(p_email)), '');
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  update public.participants
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    display_name = v_display,
    email = v_email
  where id = v_participant_id
    and org_id = p_org_id;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'first_name', trim(p_first_name),
    'last_name', trim(p_last_name),
    'display_name', v_display,
    'email', v_email
  );
end;
$$;

revoke all on function public.update_soft_participant_profile(uuid, uuid, text, text, text, text) from public;
grant execute on function public.update_soft_participant_profile(uuid, uuid, text, text, text, text)
  to anon, authenticated;

comment on function public.update_soft_participant_profile(uuid, uuid, text, text, text, text) is
  'Updates name/display/email for the soft session participant. Does not change phone.';

-- Career goals/assists + MVP award count for the soft session (bypasses authenticated-only RLS).
create or replace function public.get_soft_participant_career_stats(
  p_session_token uuid,
  p_org_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_goals int;
  v_assists int;
  v_mvp_awards int;
begin
  v_participant_id := public.resolve_session_participant(p_session_token, p_org_id);
  if v_participant_id is null then
    return null;
  end if;

  select
    coalesce(sum(s.goals), 0)::int,
    coalesce(sum(s.assists), 0)::int
  into v_goals, v_assists
  from public.session_player_stats s
  where s.org_id = p_org_id
    and s.participant_id = v_participant_id;

  select count(*)::int
  into v_mvp_awards
  from public.session_mvp_awards a
  where a.org_id = p_org_id
    and a.participant_id = v_participant_id;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'goals', v_goals,
    'assists', v_assists,
    'mvp_awards', v_mvp_awards
  );
end;
$$;

revoke all on function public.get_soft_participant_career_stats(uuid, uuid) from public;
grant execute on function public.get_soft_participant_career_stats(uuid, uuid)
  to anon, authenticated;

comment on function public.get_soft_participant_career_stats(uuid, uuid) is
  'Sums session_player_stats and session_mvp_awards for the soft session participant.';
