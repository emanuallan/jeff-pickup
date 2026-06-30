-- Event waitlist: overflow signups when at capacity, auto-promote on leave.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.signups
  add column if not exists list_status text not null default 'confirmed'
  check (list_status in ('confirmed', 'waitlisted'));

update public.signups set list_status = 'confirmed' where list_status is null;

create index if not exists signups_event_list_status_created_idx
  on public.signups (event_id, list_status, created_at);

-- ---------------------------------------------------------------------------
-- Headcount helpers (confirmed roster only)
-- ---------------------------------------------------------------------------

create or replace function public.event_headcount(p_event_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(1 + s.guest_count), 0)::int
  from public.signups s
  where s.event_id = p_event_id
    and s.list_status = 'confirmed';
$$;

create or replace function public.event_waitlist_count(p_event_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.signups s
  where s.event_id = p_event_id
    and s.list_status = 'waitlisted';
$$;

-- ---------------------------------------------------------------------------
-- Public views
-- ---------------------------------------------------------------------------

drop view if exists public.event_waitlist_public;
drop view if exists public.event_roster_public;

create view public.event_roster_public
with (security_invoker = true)
as
select
  s.id,
  s.event_id,
  s.org_id,
  s.guest_count,
  s.arrival_status,
  s.created_at,
  p.display_name,
  s.participant_id
from public.signups s
join public.participants p on p.id = s.participant_id
where s.list_status = 'confirmed';

create view public.event_waitlist_public
with (security_invoker = true)
as
select
  s.id,
  s.event_id,
  s.org_id,
  s.guest_count,
  s.arrival_status,
  s.created_at,
  p.display_name,
  s.participant_id
from public.signups s
join public.participants p on p.id = s.participant_id
where s.list_status = 'waitlisted';

grant select on public.event_roster_public to anon, authenticated;
grant select on public.event_waitlist_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Waitlist promotion
-- ---------------------------------------------------------------------------

create or replace function public.promote_from_waitlist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_org_id uuid;
  v_spots int;
  v_mode text;
  r record;
  v_party_size int;
begin
  select e.capacity, e.org_id
  into v_capacity, v_org_id
  from public.events e
  where e.id = p_event_id;

  if v_capacity is null then
    return;
  end if;

  v_spots := v_capacity - public.event_headcount(p_event_id);
  if v_spots <= 0 then
    return;
  end if;

  select coalesce(o.settings->'waitlist'->>'promotion_mode', 'strict_fifo')
  into v_mode
  from public.orgs o
  where o.id = v_org_id;

  for r in
    select s.id, s.guest_count
    from public.signups s
    where s.event_id = p_event_id
      and s.list_status = 'waitlisted'
    order by s.created_at asc
  loop
    v_party_size := 1 + r.guest_count;

    if v_party_size <= v_spots then
      update public.signups
      set list_status = 'confirmed'
      where id = r.id;

      v_spots := v_spots - v_party_size;
    elsif v_mode = 'strict_fifo' then
      exit;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_event — confirmed or waitlisted based on capacity
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
  v_existing_signup_id uuid;
  v_existing_list_status text;
  v_old_guests int;
  v_new_list_status text;
  v_skip_churn boolean;
  v_is_returning boolean;
  v_notify_kind text;
  v_delta int;
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

  select s.id, s.list_status, s.guest_count
  into v_existing_signup_id, v_existing_list_status, v_old_guests
  from public.signups s
  where s.event_id = p_event_id and s.participant_id = v_participant_id;

  v_headcount := public.event_headcount(p_event_id);

  if v_capacity is null then
    v_new_list_status := 'confirmed';
  elsif v_existing_list_status = 'confirmed' then
    v_delta := v_guests - coalesce(v_old_guests, 0);
    if (v_headcount + v_delta) > v_capacity then
      raise exception 'Session is full';
    end if;
    v_new_list_status := 'confirmed';
  elsif v_existing_list_status = 'waitlisted' then
    if (v_headcount + (1 + v_guests)) <= v_capacity then
      v_new_list_status := 'confirmed';
    else
      v_new_list_status := 'waitlisted';
    end if;
  else
    if (v_headcount + (1 + v_guests)) <= v_capacity then
      v_new_list_status := 'confirmed';
    else
      v_new_list_status := 'waitlisted';
    end if;
  end if;

  insert into public.signups (org_id, event_id, participant_id, guest_count, list_status)
  values (v_org_id, p_event_id, v_participant_id, v_guests, v_new_list_status)
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count,
        list_status = excluded.list_status
  returning id into v_signup_id;

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, p_event_id, v_participant_id, 'joined');

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, v_org_id)
  returning token into v_session_token;

  if v_new_list_status = 'confirmed' then
    perform public.maybe_promote_event(p_event_id);
  end if;

  if v_existing_signup_id is null then
    select exists (
      select 1
      from public.event_signup_activity a
      where a.org_id = v_org_id
        and a.event_id = p_event_id
        and a.participant_id = v_participant_id
        and a.action = 'left'
        and a.created_at > now() - interval '1 hour'
    ) into v_skip_churn;

    if not v_skip_churn then
      if v_new_list_status = 'confirmed' then
        select exists (
          select 1
          from public.event_signup_activity a
          where a.org_id = v_org_id
            and a.participant_id = v_participant_id
            and a.action = 'joined'
            and a.created_at < now() - interval '1 hour'
        ) into v_is_returning;

        v_notify_kind := case
          when v_is_returning then 'returning_signup'
          else 'new_signup'
        end;

        perform public.enqueue_organizer_notification_event(
          v_org_id, p_event_id, v_participant_id, v_notify_kind
        );
      elsif v_new_list_status = 'waitlisted' then
        perform public.enqueue_organizer_notification_event(
          v_org_id, p_event_id, v_participant_id, 'waitlist_signup'
        );
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'signup_id', v_signup_id,
    'session_token', v_session_token,
    'display_name', v_display,
    'list_status', v_new_list_status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_event — promote waitlist when a confirmed spot opens
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
  v_starts_at timestamptz;
  v_list_status text;
begin
  select s.event_id, s.participant_id, s.org_id, s.list_status
  into v_event_id, v_participant_id, v_org_id, v_list_status
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

  if v_list_status = 'confirmed' then
    perform public.promote_from_waitlist(v_event_id);
    perform public.maybe_promote_event(v_event_id);
  end if;

  select e.starts_at into v_starts_at
  from public.events e
  where e.id = v_event_id;

  if v_starts_at is not null
    and v_starts_at >= now()
    and v_starts_at <= now() + interval '14 days'
    and v_starts_at <= now() + interval '48 hours'
  then
    perform public.record_organizer_immediate_unregister(v_org_id, v_event_id, v_participant_id);
  else
    perform public.enqueue_organizer_notification_event(
      v_org_id, v_event_id, v_participant_id, 'unregister'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_guest_count
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
  v_list_status text;
begin
  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select s.event_id, s.participant_id, s.org_id, s.guest_count, s.list_status
  into v_event_id, v_participant_id, v_org_id, v_old_guests, v_list_status
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

  if v_list_status = 'waitlisted' then
    update public.signups
    set guest_count = v_guests
    where id = p_signup_id;
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

-- ---------------------------------------------------------------------------
-- update_arrival_status — confirmed roster only
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
  v_list_status text;
begin
  if p_status not in (
    'confirmed', 'on_my_way', 'running_late', 'in_traffic', 'maybe'
  ) then
    raise exception 'Invalid status';
  end if;

  select s.participant_id, s.org_id, s.event_id, s.list_status
  into v_participant_id, v_org_id, v_event_id, v_list_status
  from public.signups s
  where s.id = p_signup_id;

  if v_participant_id is null then
    raise exception 'Signup not found';
  end if;

  if v_list_status = 'waitlisted' then
    raise exception 'Waitlisted signups cannot update arrival status';
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
-- get_signup_for_session
-- ---------------------------------------------------------------------------

create or replace function public.get_signup_for_session(
  p_event_id uuid,
  p_session_token uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'signup_id', s.id,
    'guest_count', s.guest_count,
    'arrival_status', s.arrival_status,
    'display_name', p.display_name,
    'list_status', s.list_status
  )
  from public.signups s
  join public.participants p on p.id = s.participant_id
  join public.participant_sessions ps on ps.participant_id = p.id
  where s.event_id = p_event_id
    and ps.token = p_session_token
    and ps.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Organizer notifications — waitlist_signup kind
-- ---------------------------------------------------------------------------

alter table public.organizer_notification_events
  drop constraint if exists organizer_notification_events_kind_check;

alter table public.organizer_notification_events
  add constraint organizer_notification_events_kind_check
  check (kind in ('new_signup', 'returning_signup', 'unregister', 'waitlist_signup'));

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
      'waitlist_signup_batch'
    )
  );

create or replace function public.flush_organizer_notification_batches(p_org_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_names jsonb;
  v_short_id text;
  v_starts_at timestamptz;
  v_label text;
  v_batch_kind text;
begin
  perform pg_advisory_xact_lock(87942301, 0);

  for r in
    select
      d.org_id,
      d.event_id,
      d.kind,
      array_agg(d.participant_id order by d.first_enqueued_at) as participant_ids,
      count(*)::int as cnt
    from (
      select
        e.org_id,
        e.event_id,
        e.kind,
        e.participant_id,
        min(e.created_at) as first_enqueued_at
      from public.organizer_notification_events e
      where p_org_id is null or e.org_id = p_org_id
      group by e.org_id, e.event_id, e.kind, e.participant_id
    ) d
    group by d.org_id, d.event_id, d.kind
  loop
    v_batch_kind := case r.kind
      when 'new_signup' then 'new_signup_batch'
      when 'returning_signup' then 'returning_signup_batch'
      when 'unregister' then 'unregister_batch'
      when 'waitlist_signup' then 'waitlist_signup_batch'
    end;

    select coalesce(
      jsonb_agg(p.display_name order by p.display_name),
      '[]'::jsonb
    )
    into v_names
    from public.participants p
    where p.id = any (r.participant_ids);

    select ev.short_id, ev.starts_at
    into v_short_id, v_starts_at
    from public.events ev
    where ev.id = r.event_id;

    v_label := public.organizer_notification_event_label(r.event_id);

    insert into public.organizer_notifications (org_id, event_id, kind, payload)
    values (
      r.org_id,
      r.event_id,
      v_batch_kind,
      jsonb_build_object(
        'count', r.cnt,
        'participant_names', v_names,
        'event_short_id', v_short_id,
        'event_starts_at', v_starts_at,
        'event_label', v_label
      )
    );

    delete from public.organizer_notification_events pending
    where pending.org_id = r.org_id
      and pending.event_id = r.event_id
      and pending.kind = r.kind;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
