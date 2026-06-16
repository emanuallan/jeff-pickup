-- Allow participants to change guest count on an existing signup (session-gated).

create or replace function public.update_guest_count(
  p_signup_id uuid,
  p_session_token uuid,
  p_guest_count int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_org_id uuid;
  v_event_id uuid;
  v_capacity int;
  v_headcount int;
  v_old_guests int;
  v_guests int;
begin
  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select s.event_id, s.participant_id, s.org_id, s.guest_count
  into v_event_id, v_participant_id, v_org_id, v_old_guests
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  if v_guests = v_old_guests then
    return;
  end if;

  select capacity into v_capacity from public.events where id = v_event_id;

  if v_capacity is not null then
    v_headcount := public.event_headcount(v_event_id);
    -- headcount already includes this signup; only the guest delta changes capacity use.
    if (v_headcount + (v_guests - v_old_guests)) > v_capacity then
      raise exception 'Session is full';
    end if;
  end if;

  update public.signups
  set guest_count = v_guests
  where id = p_signup_id;

  perform public.maybe_promote_event(v_event_id);
end;
$$;

grant execute on function public.update_guest_count(uuid, uuid, int) to anon, authenticated;
