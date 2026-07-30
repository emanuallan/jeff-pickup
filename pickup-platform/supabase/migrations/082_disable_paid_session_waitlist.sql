-- Paid sessions do not support waitlists. A checkout race may still fill the
-- final spot before Stripe completes, so completion rejects instead of creating
-- a paid waitlist signup; application code refunds that charge automatically.

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

  if
    v_event.capacity is not null
    and v_existing_signup_id is null
    and (v_headcount + (1 + v_payment.guest_count)) > v_event.capacity
  then
    raise exception 'Paid session is full';
  end if;

  insert into public.signups (org_id, event_id, participant_id, guest_count, list_status)
  values (
    v_payment.org_id,
    v_payment.event_id,
    v_payment.participant_id,
    v_payment.guest_count,
    'confirmed'
  )
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count,
        list_status = 'confirmed'
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

  perform public.maybe_promote_event(v_payment.event_id);

  return jsonb_build_object(
    'ok', true,
    'signup_id', v_signup_id,
    'session_token', v_session_token,
    'list_status', 'confirmed',
    'org_id', v_payment.org_id,
    'event_id', v_payment.event_id,
    'participant_id', v_payment.participant_id
  );
end;
$$;

revoke all on function public.complete_paid_event_join(text, text) from public, anon, authenticated;
