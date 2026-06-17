-- Keep signups and participant updates open until start + schedule duration.

create or replace function public.event_duration_min(p_event_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(s.duration_min, 90)
  from public.events e
  left join public.schedules s on s.id = e.schedule_id
  where e.id = p_event_id;
$$;

create or replace function public.event_ends_at(p_event_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select e.starts_at + (public.event_duration_min(e.id) * interval '1 minute')
  from public.events e
  where e.id = p_event_id;
$$;

create or replace function public.assert_event_open(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.event_ends_at(p_event_id) <= now() then
    raise exception 'This session has ended';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_event — allow signups until session end
-- ---------------------------------------------------------------------------

create or replace function public.join_event(
  p_event_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_guest_count int default 0
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
  v_event_status text;
  v_phone text;
  v_participant_id uuid;
  v_session_token uuid;
  v_signup_id uuid;
  v_display text;
  v_guests int;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Invalid phone number';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select e.org_id, e.capacity, e.status
  into v_org_id, v_capacity, v_event_status
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if v_event_status = 'cancelled' then
    raise exception 'This session was cancelled';
  end if;

  perform public.assert_event_open(p_event_id);

  v_headcount := public.event_headcount(p_event_id);
  if v_capacity is not null and (v_headcount + 1 + v_guests) > v_capacity then
    raise exception 'Session is full';
  end if;

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

  insert into public.signups (org_id, event_id, participant_id, guest_count)
  values (v_org_id, p_event_id, v_participant_id, v_guests)
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count
  returning id into v_signup_id;

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, p_event_id, v_participant_id, 'joined');

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, v_org_id)
  returning token into v_session_token;

  perform public.maybe_promote_event(p_event_id);

  return jsonb_build_object(
    'signup_id', v_signup_id,
    'session_token', v_session_token,
    'display_name', v_display
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_event — only while session is open
-- ---------------------------------------------------------------------------

create or replace function public.leave_event(p_signup_id uuid, p_session_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant_id uuid;
  v_org_id uuid;
begin
  select s.event_id, s.participant_id, s.org_id
  into v_event_id, v_participant_id, v_org_id
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  perform public.assert_event_open(v_event_id);

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, v_event_id, v_participant_id, 'left');

  delete from public.signups where id = p_signup_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_arrival_status — only while session is open
-- ---------------------------------------------------------------------------

create or replace function public.update_arrival_status(
  p_signup_id uuid,
  p_session_token uuid,
  p_status text
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
begin
  if p_status not in (
    'confirmed', 'on_my_way', 'running_late', 'in_traffic', 'maybe', 'cant_make_it'
  ) then
    raise exception 'Invalid status';
  end if;

  select s.participant_id, s.org_id, s.event_id
  into v_participant_id, v_org_id, v_event_id
  from public.signups s
  where s.id = p_signup_id;

  if v_participant_id is null then
    raise exception 'Signup not found';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  perform public.assert_event_open(v_event_id);

  update public.signups
  set arrival_status = p_status
  where id = p_signup_id;

  perform public.maybe_promote_event(v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- update_guest_count — only while session is open
-- ---------------------------------------------------------------------------

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

  perform public.assert_event_open(v_event_id);

  if v_guests = v_old_guests then
    return;
  end if;

  select capacity into v_capacity from public.events where id = v_event_id;

  if v_capacity is not null then
    v_headcount := public.event_headcount(v_event_id);
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
