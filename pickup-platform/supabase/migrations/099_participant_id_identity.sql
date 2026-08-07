-- Participant identity: participants.id is the durable person key.
-- Phone is optional mutable contact / lookup only — never ON CONFLICT merge identity.
-- Group rules acceptance is keyed by participant_id (session), not phone.

-- ---------------------------------------------------------------------------
-- 1. participants.phone — nullable, non-unique
-- ---------------------------------------------------------------------------

alter table public.participants
  alter column phone drop not null;

comment on column public.participants.phone is
  'Optional contact / lookup. Not durable identity; participants.id is the person key. Duplicates allowed.';

alter table public.participants
  drop constraint if exists participants_org_id_phone_key;

create index if not exists participants_org_id_phone_idx
  on public.participants (org_id, phone)
  where phone is not null;

-- ---------------------------------------------------------------------------
-- 2–3. Lookup helpers (oldest match; no ON CONFLICT merge)
-- ---------------------------------------------------------------------------

create or replace function public.find_participant_by_org_phone(
  p_org_id uuid,
  p_phone text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.participants p
  where p.org_id = p_org_id
    and p.phone = public.normalize_phone(p_phone)
  order by p.created_at asc, p.id asc
  limit 1;
$$;

comment on function public.find_participant_by_org_phone(uuid, text) is
  'Returns the oldest participant id for org+phone lookup. Phone is contact/lookup only — not identity.';

create or replace function public.lookup_or_create_soft_participant(
  p_org_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_email text;
  v_display text;
  v_participant_id uuid;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Invalid phone number';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_email := nullif(lower(trim(p_email)), '');

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  v_participant_id := public.find_participant_by_org_phone(p_org_id, v_phone);

  if v_participant_id is not null then
    update public.participants
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      email = coalesce(v_email, email)
    where id = v_participant_id;

    return v_participant_id;
  end if;

  insert into public.participants (
    org_id, phone, first_name, last_name, display_name, email
  )
  values (
    p_org_id, v_phone, trim(p_first_name), trim(p_last_name), v_display, v_email
  )
  returning id into v_participant_id;

  return v_participant_id;
end;
$$;

comment on function public.lookup_or_create_soft_participant(uuid, text, text, text, text, text) is
  'Find oldest org+phone soft participant and update attrs, or insert a new row. Phone required for this helper; id is durable identity.';

revoke all on function public.find_participant_by_org_phone(uuid, text) from public;
revoke all on function public.lookup_or_create_soft_participant(uuid, text, text, text, text, text) from public;

-- ---------------------------------------------------------------------------
-- 4. Rekey participant_group_agreements → (org_id, participant_id, rules_version)
-- ---------------------------------------------------------------------------

update public.participant_group_agreements a
set participant_id = public.find_participant_by_org_phone(a.org_id, a.phone)
where a.participant_id is null
  and a.phone is not null;

delete from public.participant_group_agreements
where participant_id is null;

delete from public.participant_group_agreements a
using public.participant_group_agreements b
where a.org_id = b.org_id
  and a.participant_id = b.participant_id
  and a.rules_version = b.rules_version
  and a.ctid > b.ctid;

alter table public.participant_group_agreements
  drop constraint if exists participant_group_agreements_pkey;

alter table public.participant_group_agreements
  alter column participant_id set not null;

alter table public.participant_group_agreements
  alter column phone drop not null;

comment on column public.participant_group_agreements.phone is
  'Optional denormalized contact at accept time. Identity is participant_id.';

comment on column public.participant_group_agreements.participant_id is
  'Durable identity for group-rules acceptance. Phone is contact/lookup only.';

alter table public.participant_group_agreements
  drop constraint if exists participant_group_agreements_participant_id_fkey;

alter table public.participant_group_agreements
  add constraint participant_group_agreements_participant_id_fkey
  foreign key (participant_id) references public.participants(id) on delete cascade;

alter table public.participant_group_agreements
  add primary key (org_id, participant_id, rules_version);

-- ---------------------------------------------------------------------------
-- 5–9. Group rules helpers + RPCs (participant_id keyed)
-- ---------------------------------------------------------------------------

drop function if exists public.has_group_rules_acceptance(uuid, text, int);
drop function if exists public.assert_group_rules_accepted(uuid, text);
drop function if exists public.link_group_rules_participant(uuid, text, uuid);

create or replace function public.has_group_rules_acceptance(
  p_org_id uuid,
  p_participant_id uuid,
  p_rules_version int
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participant_group_agreements a
    where a.org_id = p_org_id
      and a.participant_id = p_participant_id
      and a.rules_version = p_rules_version
  );
$$;

create or replace function public.assert_group_rules_accepted(
  p_org_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
begin
  if not public.org_group_rules_active(p_org_id) then
    return;
  end if;

  if p_participant_id is null then
    raise exception 'GROUP_RULES_REQUIRED';
  end if;

  v_version := public.org_group_rules_version(p_org_id);

  if not public.has_group_rules_acceptance(p_org_id, p_participant_id, v_version) then
    raise exception 'GROUP_RULES_REQUIRED';
  end if;
end;
$$;

create or replace function public.link_group_rules_participant(
  p_org_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  return;
end;
$$;

create or replace function public.get_group_rules_status(
  p_org_id uuid,
  p_session_token uuid default null,
  p_phone text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active boolean;
  v_version int;
  v_text text;
  v_participant_id uuid;
  v_needs boolean;
begin
  v_active := public.org_group_rules_active(p_org_id);

  if not v_active then
    return jsonb_build_object(
      'active', false,
      'needs_acceptance', false
    );
  end if;

  v_version := public.org_group_rules_version(p_org_id);
  v_text := public.org_group_rules_text(p_org_id);

  if p_session_token is not null then
    select ps.participant_id
    into v_participant_id
    from public.participant_sessions ps
    where ps.token = p_session_token
      and ps.org_id = p_org_id
      and ps.expires_at > now();
  elsif p_phone is not null then
    v_participant_id := public.find_participant_by_org_phone(p_org_id, p_phone);
  end if;

  if v_participant_id is null then
    v_needs := true;
  else
    v_needs := not public.has_group_rules_acceptance(p_org_id, v_participant_id, v_version);
  end if;

  return jsonb_build_object(
    'active', true,
    'needs_acceptance', v_needs,
    'rules_version', v_version,
    'rules_text', v_text
  );
end;
$$;

create or replace function public.accept_group_rules(
  p_org_id uuid,
  p_rules_version int,
  p_session_token uuid default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_version int;
  v_phone text;
  v_participant_id uuid;
begin
  if not public.org_group_rules_active(p_org_id) then
    raise exception 'Group rules are not enabled';
  end if;

  v_current_version := public.org_group_rules_version(p_org_id);
  if p_rules_version is distinct from v_current_version then
    raise exception 'These rules were updated — please review them again';
  end if;

  if p_session_token is not null then
    select p.id, p.phone
    into v_participant_id, v_phone
    from public.participant_sessions ps
    join public.participants p on p.id = ps.participant_id
    where ps.token = p_session_token
      and ps.org_id = p_org_id
      and ps.expires_at > now();

    if v_participant_id is null then
      raise exception 'Session expired — please sign up again';
    end if;
  elsif p_phone is not null then
    v_phone := public.normalize_phone(p_phone);
    if v_phone is null or length(v_phone) < 10 then
      raise exception 'Invalid phone number';
    end if;

    v_participant_id := public.find_participant_by_org_phone(p_org_id, v_phone);
    if v_participant_id is null then
      v_participant_id := public.lookup_or_create_soft_participant(
        p_org_id,
        v_phone,
        'Player',
        'User',
        'Player U.',
        null
      );
    end if;
  else
    raise exception 'Phone or session required';
  end if;

  insert into public.participant_group_agreements (
    org_id,
    phone,
    rules_version,
    participant_id
  )
  values (p_org_id, v_phone, p_rules_version, v_participant_id)
  on conflict (org_id, participant_id, rules_version) do update
    set phone = coalesce(excluded.phone, participant_group_agreements.phone),
        accepted_at = participant_group_agreements.accepted_at;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.has_group_rules_acceptance(uuid, uuid, int) from public;
revoke all on function public.assert_group_rules_accepted(uuid, uuid) from public;
revoke all on function public.link_group_rules_participant(uuid, uuid) from public;

revoke all on function public.get_group_rules_status(uuid, uuid, text) from public;
grant execute on function public.get_group_rules_status(uuid, uuid, text) to anon, authenticated;

revoke all on function public.accept_group_rules(uuid, int, uuid, text) from public;
grant execute on function public.accept_group_rules(uuid, int, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. join_event — lookup_or_create + assert by participant_id
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
  v_price_cents int;
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

  select e.org_id, e.capacity, e.status, e.price_cents
  into v_org_id, v_capacity, v_event_status, v_price_cents
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if coalesce(v_price_cents, 0) > 0 then
    raise exception 'This session requires payment';
  end if;

  if v_event_status = 'cancelled' then
    raise exception 'This session was cancelled';
  end if;

  perform public.assert_event_open(p_event_id);

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  v_participant_id := public.lookup_or_create_soft_participant(
    v_org_id,
    v_phone,
    trim(p_first_name),
    trim(p_last_name),
    v_display,
    null
  );

  perform public.assert_group_rules_accepted(v_org_id, v_participant_id);
  perform public.link_group_rules_participant(v_org_id, v_participant_id);

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

revoke all on function public.join_event(uuid, text, text, text, text, int) from public;
grant execute on function public.join_event(uuid, text, text, text, text, int)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11. ensure_soft_participant
-- ---------------------------------------------------------------------------

create or replace function public.ensure_soft_participant(
  p_org_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_email text;
  v_participant_id uuid;
  v_session_token uuid;
  v_display text;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Invalid phone number';
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

  v_participant_id := public.lookup_or_create_soft_participant(
    p_org_id,
    v_phone,
    trim(p_first_name),
    trim(p_last_name),
    v_display,
    v_email
  );

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'session_token', v_session_token,
    'phone', v_phone,
    'email', v_email
  );
end;
$$;

revoke all on function public.ensure_soft_participant(uuid, text, text, text, text, text) from public;
grant execute on function public.ensure_soft_participant(uuid, text, text, text, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 12. prepare_paid_checkout_participant — session/id first; phone contact only
-- ---------------------------------------------------------------------------

drop function if exists public.prepare_paid_checkout_participant(uuid, text, text, text, text, text);

create or replace function public.prepare_paid_checkout_participant(
  p_org_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_display_name text default null,
  p_session_token uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_email text;
  v_participant_id uuid;
  v_session_token uuid;
  v_display text;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_email := nullif(lower(trim(p_email)), '');
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  v_phone := public.normalize_phone(p_phone);

  if p_session_token is not null then
    select ps.participant_id
    into v_participant_id
    from public.participant_sessions ps
    where ps.token = p_session_token
      and ps.org_id = p_org_id
      and ps.expires_at > now();

    if v_participant_id is null then
      raise exception 'Session expired';
    end if;

    update public.participants
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name, v_display),
      email = v_email,
      phone = case
        when v_phone is not null and length(v_phone) >= 10 then v_phone
        else phone
      end
    where id = v_participant_id;

    select phone into v_phone from public.participants where id = v_participant_id;
  else
    if v_phone is null or length(v_phone) < 10 then
      raise exception 'Invalid phone number';
    end if;

    v_participant_id := public.lookup_or_create_soft_participant(
      p_org_id,
      v_phone,
      trim(p_first_name),
      trim(p_last_name),
      v_display,
      v_email
    );

    update public.participants
    set email = v_email
    where id = v_participant_id;
  end if;

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'session_token', v_session_token,
    'phone', v_phone,
    'email', v_email
  );
end;
$$;

revoke all on function public.prepare_paid_checkout_participant(uuid, text, text, text, text, text, uuid) from public;
grant execute on function public.prepare_paid_checkout_participant(uuid, text, text, text, text, text, uuid)
  to anon, authenticated;

comment on function public.prepare_paid_checkout_participant(uuid, text, text, text, text, text, uuid) is
  'Paid checkout: prefer existing session participant_id; phone is contact/lookup only when minting.';

-- ---------------------------------------------------------------------------
-- 13–14. Organizer roster add
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

  v_participant_id := public.lookup_or_create_soft_participant(
    v_org_id,
    v_phone,
    trim(p_first_name),
    trim(p_last_name),
    v_display,
    null
  );

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
  v_capacity int;
  v_headcount int;
  v_signup_id uuid;
  v_display text;
  v_guests int;
  v_existing_signup_id uuid;
  v_new_list_status text;
  v_party_size int;
begin
  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select e.org_id, e.capacity, p.display_name
  into v_org_id, v_capacity, v_display
  from public.events e
  join public.participants p on p.org_id = e.org_id and p.id = p_participant_id
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Session or participant not found';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  select s.id into v_existing_signup_id
  from public.signups s
  where s.event_id = p_event_id and s.participant_id = p_participant_id;

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
  values (v_org_id, p_event_id, p_participant_id, v_guests, v_new_list_status)
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count,
        list_status = excluded.list_status
  returning id into v_signup_id;

  if v_existing_signup_id is null then
    insert into public.event_signup_activity (org_id, event_id, participant_id, action)
    values (v_org_id, p_event_id, p_participant_id, 'joined');
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

revoke all on function public.organizer_add_session_signup(uuid, text, text, text, text, int, text) from public;
revoke all on function public.organizer_add_session_signup_by_participant(uuid, uuid, int, text) from public;
grant execute on function public.organizer_add_session_signup(uuid, text, text, text, text, int, text) to authenticated;
grant execute on function public.organizer_add_session_signup_by_participant(uuid, uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 15. recover_participant_session — legacy phone lookup
-- ---------------------------------------------------------------------------

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
    raise exception 'Enter a valid phone number.';
  end if;

  v_participant_id := public.find_participant_by_org_phone(p_org_id, v_phone);

  if v_participant_id is null then
    raise exception 'No account found for that phone number.';
  end if;

  select display_name into v_display
  from public.participants
  where id = v_participant_id;

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'session_token', v_session_token,
    'display_name', v_display
  );
end;
$$;

revoke all on function public.recover_participant_session(uuid, text) from public;
grant execute on function public.recover_participant_session(uuid, text)
  to anon, authenticated, service_role;

comment on function public.recover_participant_session(uuid, text) is
  'Legacy: finds oldest participant by org+phone and mints a device session. Prefer mint_participant_session by id.';

-- ---------------------------------------------------------------------------
-- 16. mint_participant_session — service_role only
-- ---------------------------------------------------------------------------

create or replace function public.mint_participant_session(
  p_org_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display text;
  v_session_token uuid;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  select p.display_name
  into v_display
  from public.participants p
  where p.id = p_participant_id
    and p.org_id = p_org_id;

  if not found then
    raise exception 'Participant not found';
  end if;

  insert into public.participant_sessions (participant_id, org_id)
  values (p_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'session_token', v_session_token,
    'display_name', v_display,
    'participant_id', p_participant_id
  );
end;
$$;

revoke all on function public.mint_participant_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mint_participant_session(uuid, uuid) to service_role;

comment on function public.mint_participant_session(uuid, uuid) is
  'Service-role: mint a device session for a known participant_id. Prefer over phone recover for Telegram.';

-- ---------------------------------------------------------------------------
-- 17. update_soft_participant_profile — optional p_phone
-- ---------------------------------------------------------------------------

drop function if exists public.update_soft_participant_profile(uuid, uuid, text, text, text, text);

create or replace function public.update_soft_participant_profile(
  p_session_token uuid,
  p_org_id uuid,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_email text default null,
  p_phone text default null
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
  v_phone text;
  v_phone_provided boolean := false;
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

  -- Null = leave phone unchanged (backward compatible). Empty string clears.
  if p_phone is null then
    v_phone_provided := false;
  else
    v_phone_provided := true;
    if length(trim(p_phone)) = 0 then
      v_phone := null;
    else
      v_phone := public.normalize_phone(p_phone);
      if v_phone is null or length(v_phone) < 10 then
        raise exception 'Invalid phone number';
      end if;
    end if;
  end if;

  update public.participants
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    display_name = v_display,
    email = v_email,
    phone = case when v_phone_provided then v_phone else phone end
  where id = v_participant_id
    and org_id = p_org_id;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'first_name', trim(p_first_name),
    'last_name', trim(p_last_name),
    'display_name', v_display,
    'email', v_email,
    'phone', (select phone from public.participants where id = v_participant_id)
  );
end;
$$;

revoke all on function public.update_soft_participant_profile(uuid, uuid, text, text, text, text, text) from public;
grant execute on function public.update_soft_participant_profile(uuid, uuid, text, text, text, text, text)
  to anon, authenticated;

comment on function public.update_soft_participant_profile(uuid, uuid, text, text, text, text, text) is
  'Updates name/display/email/phone for the soft session participant_id. Phone is contact only; empty clears; omit to leave unchanged.';
