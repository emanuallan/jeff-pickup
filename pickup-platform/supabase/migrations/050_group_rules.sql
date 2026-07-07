-- Group rules / agreement feature

-- ---------------------------------------------------------------------------
-- Feature default (group_rules off — opt-in)
-- ---------------------------------------------------------------------------

alter table public.orgs
  alter column settings set default '{
    "features": {
      "user_badges": true,
      "leaderboard": true,
      "returning_signup_modal": true,
      "public_roster": true,
      "guest_signups": true,
      "session_feedback": true,
      "group_rules": false
    }
  }'::jsonb;

update public.orgs
set settings = jsonb_set(
  settings,
  '{features,group_rules}',
  coalesce(settings->'features'->'group_rules', 'false'::jsonb),
  true
);

-- ---------------------------------------------------------------------------
-- Agreement records (phone-keyed per org + version)
-- ---------------------------------------------------------------------------

create table public.participant_group_agreements (
  org_id uuid not null references public.orgs(id) on delete cascade,
  phone text not null,
  rules_version int not null check (rules_version > 0),
  participant_id uuid references public.participants(id) on delete set null,
  accepted_at timestamptz not null default now(),
  primary key (org_id, phone, rules_version)
);

create index participant_group_agreements_org_version_idx
  on public.participant_group_agreements (org_id, rules_version, accepted_at desc);

alter table public.participant_group_agreements enable row level security;

create policy "Org members can view group rule agreements"
  on public.participant_group_agreements for select
  to authenticated
  using (public.is_org_member(org_id));

grant select on public.participant_group_agreements to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_group_rules_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (o.settings->'features'->>'group_rules')::boolean from public.orgs o where o.id = p_org_id),
    false
  );
$$;

create or replace function public.org_group_rules_config(p_org_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select o.settings->'group_rules' from public.orgs o where o.id = p_org_id),
    '{}'::jsonb
  );
$$;

create or replace function public.org_group_rules_version(p_org_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce((public.org_group_rules_config(p_org_id)->>'version')::int, 0)
  );
$$;

create or replace function public.org_group_rules_text(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(public.org_group_rules_config(p_org_id)->>'text'), '');
$$;

create or replace function public.org_group_rules_active(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.org_group_rules_enabled(p_org_id)
    and public.org_group_rules_version(p_org_id) > 0
    and public.org_group_rules_text(p_org_id) is not null;
$$;

create or replace function public.has_group_rules_acceptance(
  p_org_id uuid,
  p_phone text,
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
      and a.phone = public.normalize_phone(p_phone)
      and a.rules_version = p_rules_version
  );
$$;

create or replace function public.assert_group_rules_accepted(p_org_id uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
  v_normalized text;
begin
  if not public.org_group_rules_active(p_org_id) then
    return;
  end if;

  v_version := public.org_group_rules_version(p_org_id);
  v_normalized := public.normalize_phone(p_phone);

  if v_normalized is null then
    raise exception 'Invalid phone number';
  end if;

  if not public.has_group_rules_acceptance(p_org_id, v_normalized, v_version) then
    raise exception 'GROUP_RULES_REQUIRED';
  end if;
end;
$$;

create or replace function public.link_group_rules_participant(
  p_org_id uuid,
  p_phone text,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
  v_normalized text;
begin
  v_version := public.org_group_rules_version(p_org_id);
  v_normalized := public.normalize_phone(p_phone);

  if v_version <= 0 or v_normalized is null then
    return;
  end if;

  update public.participant_group_agreements
  set participant_id = p_participant_id
  where org_id = p_org_id
    and phone = v_normalized
    and rules_version = v_version
    and participant_id is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

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
  v_phone text;
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
    select p.phone into v_phone
    from public.participant_sessions ps
    join public.participants p on p.id = ps.participant_id
    where ps.token = p_session_token
      and ps.org_id = p_org_id
      and ps.expires_at > now();
  elsif p_phone is not null then
    v_phone := public.normalize_phone(p_phone);
  end if;

  if v_phone is null then
    v_needs := true;
  else
    v_needs := not public.has_group_rules_acceptance(p_org_id, v_phone, v_version);
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

    if v_phone is null then
      raise exception 'Session expired — please sign up again';
    end if;
  elsif p_phone is not null then
    v_phone := public.normalize_phone(p_phone);
    if v_phone is null or length(v_phone) < 10 then
      raise exception 'Invalid phone number';
    end if;

    select id into v_participant_id
    from public.participants
    where org_id = p_org_id and phone = v_phone;
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
  on conflict (org_id, phone, rules_version) do update
    set participant_id = coalesce(excluded.participant_id, participant_group_agreements.participant_id),
        accepted_at = participant_group_agreements.accepted_at;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.organizer_refresh_group_rules(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_version int;
  v_text text;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'Not authorized';
  end if;

  if not public.org_group_rules_enabled(p_org_id) then
    raise exception 'Group rules are not enabled';
  end if;

  v_text := public.org_group_rules_text(p_org_id);
  if v_text is null then
    raise exception 'Add group rules text before requesting re-acceptance';
  end if;

  select settings into v_settings from public.orgs where id = p_org_id;
  v_version := greatest(1, coalesce((v_settings->'group_rules'->>'version')::int, 0) + 1);

  update public.orgs
  set settings = jsonb_set(
    jsonb_set(
      coalesce(v_settings, '{}'::jsonb),
      '{group_rules,version}',
      to_jsonb(v_version),
      true
    ),
    '{group_rules,last_enforced_at}',
    to_jsonb(now()::text),
    true
  )
  where id = p_org_id;

  return jsonb_build_object(
    'version', v_version,
    'last_enforced_at', now()
  );
end;
$$;

revoke all on function public.get_group_rules_status(uuid, uuid, text) from public;
grant execute on function public.get_group_rules_status(uuid, uuid, text) to anon, authenticated;

revoke all on function public.accept_group_rules(uuid, int, uuid, text) from public;
grant execute on function public.accept_group_rules(uuid, int, uuid, text) to anon, authenticated;

revoke all on function public.organizer_refresh_group_rules(uuid) from public;
grant execute on function public.organizer_refresh_group_rules(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- join_event — require current group rules acceptance
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
  perform public.assert_group_rules_accepted(v_org_id, v_phone);

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

  perform public.link_group_rules_participant(v_org_id, v_phone, v_participant_id);

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
