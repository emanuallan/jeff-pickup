-- Hybrid participant accounts + pay-per-session (Connect Checkout).
-- Soft phone join remains for free sessions; paid sessions require auth.users + payment.

-- ---------------------------------------------------------------------------
-- Participant ↔ account linking
-- ---------------------------------------------------------------------------

create unique index if not exists participants_org_user_unique
  on public.participants (org_id, user_id)
  where user_id is not null;

create index if not exists participants_user_id_idx
  on public.participants (user_id)
  where user_id is not null;

-- Link the soft-session participant in an org to the authenticated user.
create or replace function public.link_participant_to_auth_user(
  p_org_id uuid,
  p_session_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant_id uuid;
  v_phone text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_token is null then
    raise exception 'Missing session';
  end if;

  select ps.participant_id, p.phone
  into v_participant_id, v_phone
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.token = p_session_token
    and ps.org_id = p_org_id
    and ps.expires_at > now();

  if v_participant_id is null then
    raise exception 'Session not found';
  end if;

  -- Another account already owns this org persona.
  if exists (
    select 1 from public.participants p
    where p.id = v_participant_id
      and p.user_id is not null
      and p.user_id <> v_user_id
  ) then
    raise exception 'This profile is already linked to another account';
  end if;

  -- This user already linked a different phone in this org.
  if exists (
    select 1 from public.participants p
    where p.org_id = p_org_id
      and p.user_id = v_user_id
      and p.id <> v_participant_id
  ) then
    raise exception 'Your account is already linked to another profile in this group';
  end if;

  update public.participants
  set user_id = v_user_id
  where id = v_participant_id;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'phone', v_phone,
    'org_id', p_org_id
  );
end;
$$;

grant execute on function public.link_participant_to_auth_user(uuid, uuid) to authenticated;

-- Upsert an org participant for the signed-in user (paid join / first link without soft session).
create or replace function public.ensure_participant_for_auth_user(
  p_org_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_participant_id uuid;
  v_display text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

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

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  -- Already linked in this org.
  select id into v_participant_id
  from public.participants
  where org_id = p_org_id and user_id = v_user_id;

  if v_participant_id is not null then
    update public.participants
    set
      phone = v_phone,
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
    where id = v_participant_id;

    return jsonb_build_object('participant_id', v_participant_id, 'phone', v_phone);
  end if;

  if exists (
    select 1 from public.participants p
    where p.org_id = p_org_id
      and p.phone = v_phone
      and p.user_id is not null
      and p.user_id <> v_user_id
  ) then
    raise exception 'This phone is already linked to another account in this group';
  end if;

  insert into public.participants (org_id, phone, first_name, last_name, display_name, user_id)
  values (p_org_id, v_phone, trim(p_first_name), trim(p_last_name), v_display, v_user_id)
  on conflict (org_id, phone) do update
    set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      display_name = coalesce(nullif(trim(p_display_name), ''), participants.display_name),
      user_id = case
        when participants.user_id is null then v_user_id
        when participants.user_id = v_user_id then v_user_id
        else participants.user_id
      end
  returning id into v_participant_id;

  if v_participant_id is null then
    select id into v_participant_id
    from public.participants
    where org_id = p_org_id and phone = v_phone;
  end if;

  if exists (
    select 1 from public.participants p
    where p.id = v_participant_id and p.user_id is distinct from v_user_id
  ) then
    raise exception 'This phone is already linked to another account in this group';
  end if;

  update public.participants
  set user_id = v_user_id
  where id = v_participant_id and user_id is null;

  return jsonb_build_object('participant_id', v_participant_id, 'phone', v_phone);
end;
$$;

grant execute on function public.ensure_participant_for_auth_user(uuid, text, text, text, text)
  to authenticated;

-- Orgs where the signed-in user has a linked participant row (for /me).
create or replace function public.get_my_participant_orgs()
returns table (
  org_id uuid,
  org_slug text,
  org_name text,
  participant_id uuid,
  display_name text,
  phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id as org_id,
    o.slug as org_slug,
    o.name as org_name,
    p.id as participant_id,
    p.display_name,
    p.phone
  from public.participants p
  join public.orgs o on o.id = p.org_id
  where p.user_id = auth.uid()
    and o.status = 'active'
  order by o.name asc;
$$;

grant execute on function public.get_my_participant_orgs() to authenticated;

-- ---------------------------------------------------------------------------
-- Session pricing + payments
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists price_cents int
  check (price_cents is null or price_cents >= 0);

comment on column public.events.price_cents is
  'Nullable session fee in cents. Null or 0 = free (soft join OK). >0 requires auth + Stripe Checkout.';

create table if not exists public.event_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  signup_id uuid references public.signups(id) on delete set null,
  guest_count int not null default 0 check (guest_count >= 0 and guest_count <= 20),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists event_payments_org_id_idx on public.event_payments (org_id);
create index if not exists event_payments_event_id_idx on public.event_payments (event_id);
create index if not exists event_payments_user_id_idx on public.event_payments (user_id);

alter table public.event_payments enable row level security;

create policy "Users can view own event payments"
  on public.event_payments for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id, array['owner', 'admin']));

grant select on public.event_payments to authenticated;

-- Soft join_event rejects paid sessions.
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

-- Complete a paid join after Stripe checkout.session.completed (service role).
create or replace function public.complete_paid_event_join(
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.event_payments%rowtype;
  v_event public.events%rowtype;
  v_participant public.participants%rowtype;
  v_signup_id uuid;
  v_session_token uuid;
  v_headcount int;
  v_new_list_status text;
  v_existing_signup_id uuid;
begin
  select * into v_payment
  from public.event_payments
  where stripe_checkout_session_id = p_stripe_checkout_session_id
  for update;

  if v_payment.id is null then
    raise exception 'Payment not found';
  end if;

  if v_payment.status = 'completed' then
    return jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'signup_id', v_payment.signup_id
    );
  end if;

  select * into v_event from public.events where id = v_payment.event_id;
  if v_event.id is null then
    raise exception 'Event not found';
  end if;

  if v_event.status = 'cancelled' then
    raise exception 'This session was cancelled';
  end if;

  select * into v_participant
  from public.participants
  where id = v_payment.participant_id;

  if v_participant.id is null then
    raise exception 'Participant not found';
  end if;

  perform public.assert_event_open(v_payment.event_id);

  select s.id into v_existing_signup_id
  from public.signups s
  where s.event_id = v_payment.event_id and s.participant_id = v_payment.participant_id;

  v_headcount := public.event_headcount(v_payment.event_id);

  if v_event.capacity is null then
    v_new_list_status := 'confirmed';
  elsif v_existing_signup_id is not null then
    v_new_list_status := 'confirmed';
  elsif (v_headcount + (1 + v_payment.guest_count)) <= v_event.capacity then
    v_new_list_status := 'confirmed';
  else
    v_new_list_status := 'waitlisted';
  end if;

  insert into public.signups (org_id, event_id, participant_id, guest_count, list_status)
  values (
    v_payment.org_id,
    v_payment.event_id,
    v_payment.participant_id,
    v_payment.guest_count,
    v_new_list_status
  )
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count,
        list_status = excluded.list_status
  returning id into v_signup_id;

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_payment.org_id, v_payment.event_id, v_payment.participant_id, 'joined');

  insert into public.participant_sessions (participant_id, org_id)
  values (v_payment.participant_id, v_payment.org_id)
  returning token into v_session_token;

  update public.event_payments
  set
    status = 'completed',
    stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
    signup_id = v_signup_id,
    completed_at = now()
  where id = v_payment.id;

  if v_new_list_status = 'confirmed' then
    perform public.maybe_promote_event(v_payment.event_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'signup_id', v_signup_id,
    'session_token', v_session_token,
    'list_status', v_new_list_status,
    'org_id', v_payment.org_id,
    'event_id', v_payment.event_id,
    'participant_id', v_payment.participant_id
  );
end;
$$;

-- Service role only (webhook); revoke from anon/authenticated.
revoke all on function public.complete_paid_event_join(text, text) from public, anon, authenticated;
