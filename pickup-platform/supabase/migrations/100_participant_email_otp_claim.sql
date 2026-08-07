-- Participant email OTP claim on participant_id foundation (099).
-- Verified email is a claimable locator; participants.id remains durable identity.
-- Phone stays optional contact. Soft hc_session unchanged. No auth.users pairing.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.participants
  add column if not exists email_verified_at timestamptz;

comment on column public.participants.email is
  'Contact / receipts. Durable claim locator only when email_verified_at is set.';
comment on column public.participants.email_verified_at is
  'Set when the participant proves email ownership via OTP. Locator with email — identity is id.';

create unique index if not exists participants_org_verified_email_unique
  on public.participants (org_id, lower(email))
  where email is not null and email_verified_at is not null;

create table if not exists public.participant_email_otps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  email text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('claim', 'recover', 'bind')),
  first_name text,
  last_name text,
  display_name text,
  phone text,
  bind_participant_id uuid references public.participants (id) on delete cascade,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists participant_email_otps_lookup_idx
  on public.participant_email_otps (org_id, lower(email), created_at desc);

create index if not exists participant_email_otps_expires_idx
  on public.participant_email_otps (expires_at);

alter table public.participant_email_otps enable row level security;

revoke all on table public.participant_email_otps from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_participant_email(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(p_email)), '');
$$;

create or replace function public.is_valid_participant_email(p_email text)
returns boolean
language sql
immutable
as $$
  select public.normalize_participant_email(p_email) is not null
    and public.normalize_participant_email(p_email) ~ '^[^@\s]+@[^@\s]+\.[^\s@]+$';
$$;

create or replace function public.find_participant_by_verified_email(
  p_org_id uuid,
  p_email text
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
    and p.email_verified_at is not null
    and lower(p.email) = public.normalize_participant_email(p_email)
  order by p.email_verified_at asc, p.created_at asc, p.id asc
  limit 1;
$$;

revoke all on function public.find_participant_by_verified_email(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- get_participant_for_session — include verification flag
-- ---------------------------------------------------------------------------

create or replace function public.get_participant_for_session(
  p_session_token uuid,
  p_org_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'participant_id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'display_name', p.display_name,
    'phone', p.phone,
    'email', p.email,
    'email_verified_at', p.email_verified_at
  )
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.token = p_session_token
    and ps.org_id = p_org_id
    and ps.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Legacy phone lookup (bind UX only — not session mint)
-- ---------------------------------------------------------------------------

create or replace function public.find_legacy_participant_by_phone(
  p_org_id uuid,
  p_phone text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_row public.participants%rowtype;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Enter a valid phone number.';
  end if;

  select p.* into v_row
  from public.participants p
  where p.org_id = p_org_id
    and p.phone = v_phone
  order by p.created_at asc, p.id asc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'participant_id', v_row.id,
    'first_name', v_row.first_name,
    'last_name', v_row.last_name,
    'display_name', v_row.display_name,
    'phone', v_row.phone,
    'email', v_row.email,
    'email_verified_at', v_row.email_verified_at
  );
end;
$$;

revoke all on function public.find_legacy_participant_by_phone(uuid, text) from public;
grant execute on function public.find_legacy_participant_by_phone(uuid, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- request_participant_email_otp (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.request_participant_email_otp(
  p_org_id uuid,
  p_email text,
  p_code_hash text,
  p_purpose text,
  p_first_name text default null,
  p_last_name text default null,
  p_display_name text default null,
  p_phone text default null,
  p_bind_participant_id uuid default null,
  p_ttl_seconds int default 600
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone text;
  v_purpose text;
  v_ttl int;
  v_cooldown interval := interval '45 seconds';
  v_last timestamptz;
  v_existing uuid;
  v_bind public.participants%rowtype;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  v_email := public.normalize_participant_email(p_email);
  if v_email is null or not public.is_valid_participant_email(v_email) then
    raise exception 'Enter a valid email address';
  end if;

  if p_code_hash is null or length(trim(p_code_hash)) < 16 then
    raise exception 'Invalid OTP hash';
  end if;

  v_purpose := lower(trim(p_purpose));
  if v_purpose not in ('claim', 'recover', 'bind') then
    raise exception 'Invalid OTP purpose';
  end if;

  v_ttl := greatest(60, least(3600, coalesce(p_ttl_seconds, 600)));
  v_phone := public.normalize_phone(p_phone);

  if v_purpose = 'claim' then
    if length(trim(coalesce(p_first_name, ''))) = 0
       or length(trim(coalesce(p_last_name, ''))) = 0 then
      raise exception 'First and last name are required';
    end if;

    -- Soft upgrade: attach verified email to an existing unverified participant_id
    if p_bind_participant_id is not null then
      select * into v_bind
      from public.participants
      where id = p_bind_participant_id
        and org_id = p_org_id;

      if not found then
        raise exception 'Participant not found';
      end if;

      if v_bind.email_verified_at is not null then
        raise exception 'This account already has a verified email.';
      end if;

      v_existing := public.find_participant_by_verified_email(p_org_id, v_email);
      if v_existing is not null and v_existing is distinct from p_bind_participant_id then
        raise exception 'That email is already verified on another account.';
      end if;
    end if;
  elsif v_purpose = 'recover' then
    v_existing := public.find_participant_by_verified_email(p_org_id, v_email);
    if v_existing is null then
      raise exception 'No verified account found for that email.';
    end if;
  elsif v_purpose = 'bind' then
    if p_bind_participant_id is null then
      raise exception 'Legacy participant required';
    end if;
    if length(trim(coalesce(p_first_name, ''))) = 0
       or length(trim(coalesce(p_last_name, ''))) = 0 then
      raise exception 'First and last name are required';
    end if;

    select * into v_bind
    from public.participants
    where id = p_bind_participant_id
      and org_id = p_org_id;

    if not found then
      raise exception 'Legacy participant not found';
    end if;

    if v_bind.email_verified_at is not null then
      raise exception 'That account already has a verified email. Sign in with email instead.';
    end if;

    v_existing := public.find_participant_by_verified_email(p_org_id, v_email);
    if v_existing is not null and v_existing is distinct from p_bind_participant_id then
      raise exception 'That email is already verified on another account.';
    end if;
  end if;

  select max(o.created_at) into v_last
  from public.participant_email_otps o
  where o.org_id = p_org_id
    and lower(o.email) = v_email;

  if v_last is not null and v_last > now() - v_cooldown then
    return jsonb_build_object(
      'ok', false,
      'error', 'Wait a moment before requesting another code.',
      'cooldown_seconds',
        greatest(1, ceil(extract(epoch from (v_last + v_cooldown - now()))))
    );
  end if;

  delete from public.participant_email_otps
  where org_id = p_org_id
    and lower(email) = v_email;

  insert into public.participant_email_otps (
    org_id, email, code_hash, purpose,
    first_name, last_name, display_name, phone, bind_participant_id, expires_at
  )
  values (
    p_org_id,
    v_email,
    trim(p_code_hash),
    v_purpose,
    nullif(trim(p_first_name), ''),
    nullif(trim(p_last_name), ''),
    nullif(trim(p_display_name), ''),
    case when v_phone is not null and length(v_phone) >= 10 then v_phone else null end,
    case
      when v_purpose in ('bind', 'claim') then p_bind_participant_id
      else null
    end,
    now() + make_interval(secs => v_ttl)
  );

  return jsonb_build_object('ok', true, 'expires_in_seconds', v_ttl);
end;
$$;

revoke all on function public.request_participant_email_otp(
  uuid, text, text, text, text, text, text, text, uuid, int
) from public, anon, authenticated;
grant execute on function public.request_participant_email_otp(
  uuid, text, text, text, text, text, text, text, uuid, int
) to service_role;

-- ---------------------------------------------------------------------------
-- verify_participant_email_otp (service_role) → mint session
-- ---------------------------------------------------------------------------

create or replace function public.verify_participant_email_otp(
  p_org_id uuid,
  p_email text,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_otp public.participant_email_otps%rowtype;
  v_participant_id uuid;
  v_session_token uuid;
  v_display text;
  v_phone text;
  v_created boolean := false;
  v_conflict uuid;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  v_email := public.normalize_participant_email(p_email);
  if v_email is null or not public.is_valid_participant_email(v_email) then
    raise exception 'Enter a valid email address';
  end if;

  select * into v_otp
  from public.participant_email_otps o
  where o.org_id = p_org_id
    and lower(o.email) = v_email
  order by o.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Code expired — request a new one.';
  end if;

  if v_otp.expires_at <= now() then
    delete from public.participant_email_otps where id = v_otp.id;
    raise exception 'Code expired — request a new one.';
  end if;

  if v_otp.attempts >= 5 then
    delete from public.participant_email_otps where id = v_otp.id;
    raise exception 'Too many attempts — request a new code.';
  end if;

  if v_otp.code_hash is distinct from trim(p_code_hash) then
    update public.participant_email_otps
    set attempts = attempts + 1
    where id = v_otp.id;
    raise exception 'Incorrect code.';
  end if;

  v_phone := v_otp.phone;
  v_display := nullif(trim(coalesce(v_otp.display_name, '')), '');
  if v_display is null and v_otp.first_name is not null and v_otp.last_name is not null then
    v_display := trim(v_otp.first_name) || ' ' || left(trim(v_otp.last_name), 1) || '.';
  end if;

  if v_otp.purpose = 'recover' then
    v_participant_id := public.find_participant_by_verified_email(p_org_id, v_email);
    if v_participant_id is null then
      raise exception 'No verified account found for that email.';
    end if;

  elsif v_otp.purpose = 'bind' then
    if v_otp.bind_participant_id is null then
      raise exception 'Legacy participant required';
    end if;

    v_conflict := public.find_participant_by_verified_email(p_org_id, v_email);
    if v_conflict is not null and v_conflict is distinct from v_otp.bind_participant_id then
      raise exception 'That email is already verified on another account.';
    end if;

    update public.participants
    set
      email = v_email,
      email_verified_at = now(),
      first_name = coalesce(nullif(trim(v_otp.first_name), ''), first_name),
      last_name = coalesce(nullif(trim(v_otp.last_name), ''), last_name),
      display_name = coalesce(v_display, display_name),
      phone = coalesce(v_phone, phone)
    where id = v_otp.bind_participant_id
      and org_id = p_org_id
      and email_verified_at is null;

    if not found then
      raise exception 'Could not bind email to that account.';
    end if;

    v_participant_id := v_otp.bind_participant_id;

  else
    -- claim
    v_participant_id := public.find_participant_by_verified_email(p_org_id, v_email);

    if v_participant_id is not null then
      update public.participants
      set
        first_name = coalesce(nullif(trim(v_otp.first_name), ''), first_name),
        last_name = coalesce(nullif(trim(v_otp.last_name), ''), last_name),
        display_name = coalesce(v_display, display_name),
        phone = coalesce(v_phone, phone)
      where id = v_participant_id;
    elsif v_otp.bind_participant_id is not null then
      -- Soft upgrade: attach verified email to existing session participant
      v_conflict := public.find_participant_by_verified_email(p_org_id, v_email);
      if v_conflict is not null and v_conflict is distinct from v_otp.bind_participant_id then
        raise exception 'That email is already verified on another account.';
      end if;

      update public.participants
      set
        email = v_email,
        email_verified_at = now(),
        first_name = coalesce(nullif(trim(v_otp.first_name), ''), first_name),
        last_name = coalesce(nullif(trim(v_otp.last_name), ''), last_name),
        display_name = coalesce(v_display, display_name),
        phone = coalesce(v_phone, phone)
      where id = v_otp.bind_participant_id
        and org_id = p_org_id;

      if not found then
        raise exception 'Participant not found';
      end if;

      v_participant_id := v_otp.bind_participant_id;
    else
      if length(trim(coalesce(v_otp.first_name, ''))) = 0
         or length(trim(coalesce(v_otp.last_name, ''))) = 0 then
        raise exception 'First and last name are required';
      end if;

      insert into public.participants (
        org_id, phone, first_name, last_name, display_name, email, email_verified_at
      )
      values (
        p_org_id,
        v_phone,
        trim(v_otp.first_name),
        trim(v_otp.last_name),
        coalesce(v_display, trim(v_otp.first_name) || ' ' || left(trim(v_otp.last_name), 1) || '.'),
        v_email,
        now()
      )
      returning id into v_participant_id;

      v_created := true;
    end if;
  end if;

  delete from public.participant_email_otps where id = v_otp.id;

  select display_name into v_display
  from public.participants
  where id = v_participant_id;

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'session_token', v_session_token,
    'display_name', v_display,
    'email', v_email,
    'created', v_created
  );
end;
$$;

revoke all on function public.verify_participant_email_otp(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.verify_participant_email_otp(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- join_event_with_session — free join after OTP / returning cookie
-- ---------------------------------------------------------------------------

create or replace function public.join_event_with_session(
  p_event_id uuid,
  p_session_token uuid,
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
  v_participant_id uuid;
  v_display text;
  v_signup_id uuid;
  v_guests int;
  v_existing_signup_id uuid;
  v_existing_list_status text;
  v_old_guests int;
  v_new_list_status text;
  v_skip_churn boolean;
  v_is_returning boolean;
  v_notify_kind text;
  v_delta int;
  v_session_token uuid;
begin
  if p_session_token is null then
    raise exception 'Session expired — please sign up again';
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

  select p.id, p.display_name
  into v_participant_id, v_display
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.token = p_session_token
    and ps.org_id = v_org_id
    and ps.expires_at > now();

  if v_participant_id is null then
    raise exception 'Session expired — please sign up again';
  end if;

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

revoke all on function public.join_event_with_session(uuid, uuid, int) from public;
grant execute on function public.join_event_with_session(uuid, uuid, int)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- prepare_paid_checkout_participant — require verified email
-- ---------------------------------------------------------------------------

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
  v_verified_at timestamptz;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_email := public.normalize_participant_email(p_email);
  if v_email is null or not public.is_valid_participant_email(v_email) then
    raise exception 'Enter a valid email address';
  end if;

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  v_phone := public.normalize_phone(p_phone);

  if p_session_token is not null then
    select ps.participant_id, p.email_verified_at, p.email
    into v_participant_id, v_verified_at, v_email
    from public.participant_sessions ps
    join public.participants p on p.id = ps.participant_id
    where ps.token = p_session_token
      and ps.org_id = p_org_id
      and ps.expires_at > now();

    if v_participant_id is null then
      raise exception 'Session expired';
    end if;

    if v_verified_at is null then
      raise exception 'Verify your email before paying.';
    end if;

    -- Prefer verified email already on the row
    select email into v_email from public.participants where id = v_participant_id;

    update public.participants
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name, v_display),
      phone = case
        when v_phone is not null and length(v_phone) >= 10 then v_phone
        else phone
      end
    where id = v_participant_id;

    select phone into v_phone from public.participants where id = v_participant_id;
  else
    raise exception 'Verify your email before paying.';
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

-- ---------------------------------------------------------------------------
-- recover_participant_session — demoted (verified email blocks phone recover)
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
  v_verified_at timestamptz;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null then
    raise exception 'Enter a valid phone number.';
  end if;

  select p.id, p.display_name, p.email_verified_at
  into v_participant_id, v_display, v_verified_at
  from public.participants p
  where p.org_id = p_org_id
    and p.phone = v_phone
  order by p.created_at asc, p.id asc
  limit 1;

  if v_participant_id is null then
    raise exception 'No account found for that phone number.';
  end if;

  if v_verified_at is not null then
    raise exception 'Sign in with the email for this account instead.';
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

comment on function public.recover_participant_session(uuid, text) is
  'Legacy phone recover for unverified accounts only. Prefer email OTP recover/claim.';

-- ---------------------------------------------------------------------------
-- update_soft_participant_profile — verified email immutable
-- ---------------------------------------------------------------------------

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
  v_verified_at timestamptz;
  v_current_email text;
  v_email text;
  v_phone text;
  v_display text;
begin
  select p.id, p.email_verified_at, p.email
  into v_participant_id, v_verified_at, v_current_email
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.token = p_session_token
    and ps.org_id = p_org_id
    and ps.expires_at > now();

  if v_participant_id is null then
    raise exception 'Session expired';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_display := nullif(trim(p_display_name), '');
  v_email := public.normalize_participant_email(p_email);

  if v_verified_at is not null then
    -- Keep verified email; ignore client email changes
    v_email := v_current_email;
  elsif v_email is not null and not public.is_valid_participant_email(v_email) then
    raise exception 'Enter a valid email address';
  end if;

  if p_phone is null then
    update public.participants
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(v_display, display_name),
      email = case when v_verified_at is not null then email else v_email end
    where id = v_participant_id;
  else
    v_phone := nullif(trim(p_phone), '');
    if v_phone is not null and v_phone <> '' then
      v_phone := public.normalize_phone(v_phone);
      if v_phone is null or length(v_phone) < 10 then
        raise exception 'Enter a valid phone number.';
      end if;
    else
      v_phone := null;
    end if;

    update public.participants
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(v_display, display_name),
      email = case when v_verified_at is not null then email else v_email end,
      phone = v_phone
    where id = v_participant_id;
  end if;

  return public.get_participant_for_session(p_session_token, p_org_id);
end;
$$;
