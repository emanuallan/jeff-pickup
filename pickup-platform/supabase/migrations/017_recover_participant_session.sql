-- Issue a new device session for an existing participant (phone lookup).

create or replace function public.recover_participant_session(
  p_org_id uuid,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_participant_id uuid;
  v_display text;
  v_session_token uuid;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null then
    raise exception 'Enter a valid 10-digit phone number.';
  end if;

  select id, display_name
  into v_participant_id, v_display
  from public.participants
  where org_id = p_org_id and phone = v_phone;

  if v_participant_id is null then
    raise exception 'No account found for that phone number.';
  end if;

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'session_token', v_session_token,
    'display_name', v_display
  );
end;
$$;

grant execute on function public.recover_participant_session(uuid, text) to anon, authenticated;
