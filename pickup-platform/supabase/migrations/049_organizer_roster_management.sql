-- Organizer console roster management (add, remove, promote, update guests).

-- ---------------------------------------------------------------------------
-- organizer_add_session_signup
-- ---------------------------------------------------------------------------

create or replace function public.organizer_add_session_signup(
  p_event_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_guest_count int default 0,
  p_list_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_capacity int;
  v_headcount int;
  v_phone text;
  v_participant_id uuid;
  v_signup_id uuid;
  v_display text;
  v_guests int;
  v_existing_signup_id uuid;
  v_new_list_status text;
  v_party_size int;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Invalid phone number';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select e.org_id, e.capacity
  into v_org_id, v_capacity
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Session not found';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  insert into public.participants (org_id, phone, first_name, last_name, display_name)
  values (v_org_id, v_phone, trim(p_first_name), trim(p_last_name), v_display)
  on conflict (org_id, phone) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        display_name = coalesce(nullif(trim(p_display_name), ''), participants.display_name)
  returning id into v_participant_id;

  if v_participant_id is null then
    select id into v_participant_id from public.participants
    where org_id = v_org_id and phone = v_phone;
  end if;

  select s.id into v_existing_signup_id
  from public.signups s
  where s.event_id = p_event_id and s.participant_id = v_participant_id;

  v_headcount := public.event_headcount(p_event_id);
  v_party_size := 1 + v_guests;

  if p_list_status in ('confirmed', 'waitlisted') then
    v_new_list_status := p_list_status;
  elsif v_capacity is null then
    v_new_list_status := 'confirmed';
  elsif (v_headcount + v_party_size) <= v_capacity then
    v_new_list_status := 'confirmed';
  else
    v_new_list_status := 'waitlisted';
  end if;

  insert into public.signups (org_id, event_id, participant_id, guest_count, list_status)
  values (v_org_id, p_event_id, v_participant_id, v_guests, v_new_list_status)
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count,
        list_status = excluded.list_status
  returning id into v_signup_id;

  if v_existing_signup_id is null then
    insert into public.event_signup_activity (org_id, event_id, participant_id, action)
    values (v_org_id, p_event_id, v_participant_id, 'joined');
  end if;

  if v_new_list_status = 'confirmed' then
    perform public.maybe_promote_event(p_event_id);
  end if;

  return jsonb_build_object(
    'signup_id', v_signup_id,
    'list_status', v_new_list_status,
    'display_name', v_display
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- organizer_add_session_signup_by_participant
-- ---------------------------------------------------------------------------

create or replace function public.organizer_add_session_signup_by_participant(
  p_event_id uuid,
  p_participant_id uuid,
  p_guest_count int default 0,
  p_list_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_phone text;
  v_first_name text;
  v_last_name text;
  v_display_name text;
begin
  select e.org_id, p.phone, p.first_name, p.last_name, p.display_name
  into v_org_id, v_phone, v_first_name, v_last_name, v_display_name
  from public.events e
  join public.participants p on p.org_id = e.org_id and p.id = p_participant_id
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Session or participant not found';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  return public.organizer_add_session_signup(
    p_event_id,
    v_phone,
    v_first_name,
    v_last_name,
    v_display_name,
    p_guest_count,
    p_list_status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- organizer_remove_session_signup
-- ---------------------------------------------------------------------------

create or replace function public.organizer_remove_session_signup(p_signup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant_id uuid;
  v_org_id uuid;
  v_list_status text;
begin
  select s.event_id, s.participant_id, s.org_id, s.list_status
  into v_event_id, v_participant_id, v_org_id, v_list_status
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, v_event_id, v_participant_id, 'left');

  delete from public.signups where id = p_signup_id;

  if v_list_status = 'confirmed' then
    perform public.promote_from_waitlist(v_event_id);
    perform public.maybe_promote_event(v_event_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizer_promote_waitlist_signup
-- ---------------------------------------------------------------------------

create or replace function public.organizer_promote_waitlist_signup(p_signup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_org_id uuid;
  v_list_status text;
begin
  select s.event_id, s.org_id, s.list_status
  into v_event_id, v_org_id, v_list_status
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  if v_list_status <> 'waitlisted' then
    raise exception 'Signup is not on the waitlist';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  update public.signups
  set list_status = 'confirmed'
  where id = p_signup_id;

  perform public.maybe_promote_event(v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- organizer_update_session_signup_guests
-- ---------------------------------------------------------------------------

create or replace function public.organizer_update_session_signup_guests(
  p_signup_id uuid,
  p_guest_count int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_org_id uuid;
  v_guests int;
begin
  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select s.event_id, s.org_id
  into v_event_id, v_org_id
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  update public.signups
  set guest_count = v_guests
  where id = p_signup_id;

  perform public.promote_from_waitlist(v_event_id);
  perform public.maybe_promote_event(v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- assert_organizer_event_access
-- ---------------------------------------------------------------------------

create or replace function public.assert_organizer_event_access(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;
end;
$$;

revoke all on function public.organizer_add_session_signup(uuid, text, text, text, text, int, text) from public;
revoke all on function public.organizer_add_session_signup_by_participant(uuid, uuid, int, text) from public;
revoke all on function public.organizer_remove_session_signup(uuid) from public;
revoke all on function public.organizer_promote_waitlist_signup(uuid) from public;
revoke all on function public.organizer_update_session_signup_guests(uuid, int) from public;
revoke all on function public.assert_organizer_event_access(uuid) from public;

grant execute on function public.organizer_add_session_signup(uuid, text, text, text, text, int, text) to authenticated;
grant execute on function public.organizer_add_session_signup_by_participant(uuid, uuid, int, text) to authenticated;
grant execute on function public.organizer_remove_session_signup(uuid) to authenticated;
grant execute on function public.organizer_promote_waitlist_signup(uuid) to authenticated;
grant execute on function public.organizer_update_session_signup_guests(uuid, int) to authenticated;
grant execute on function public.assert_organizer_event_access(uuid) to authenticated;
