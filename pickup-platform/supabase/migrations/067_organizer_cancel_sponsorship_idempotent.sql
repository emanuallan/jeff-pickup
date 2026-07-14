-- Make immediate cancel modes idempotent when Stripe webhooks already set status=canceled
-- before organizer_cancel_sponsorship runs (common after refund + subscriptions.cancel).

create or replace function public.organizer_cancel_sponsorship(
  p_sponsorship_id uuid,
  p_mode text,
  p_current_period_end timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sponsorships%rowtype;
begin
  if p_mode not in ('refund_now', 'refund_full', 'end_of_period') then
    raise exception 'Invalid cancel mode';
  end if;

  select * into v_row
  from public.sponsorships s
  where s.id = p_sponsorship_id;

  if not found then
    raise exception 'Sponsorship not found';
  end if;

  if not public.is_org_member(v_row.org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  -- Stripe cancel webhooks can mark the row canceled before this RPC runs.
  if p_mode in ('refund_now', 'refund_full') and v_row.status = 'canceled' then
    update public.sponsorships
    set cancel_at_period_end = false,
        current_period_end = null,
        hidden_at = null,
        updated_at = now()
    where id = p_sponsorship_id;

    return jsonb_build_object(
      'ok', true,
      'mode', p_mode,
      'already_canceled', true,
      'stripe_subscription_id', v_row.stripe_subscription_id
    );
  end if;

  if v_row.status not in ('approved', 'hidden') then
    raise exception 'Sponsorship cannot be canceled';
  end if;

  if p_mode in ('refund_now', 'refund_full') then
    update public.sponsorships
    set status = 'canceled',
        canceled_at = coalesce(canceled_at, now()),
        hidden_at = null,
        cancel_at_period_end = false,
        current_period_end = null,
        updated_at = now()
    where id = p_sponsorship_id;
  else
    -- Keep approved/hidden so the logo can remain until Stripe period ends.
    update public.sponsorships
    set cancel_at_period_end = true,
        current_period_end = coalesce(p_current_period_end, current_period_end),
        updated_at = now()
    where id = p_sponsorship_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mode', p_mode,
    'stripe_subscription_id', v_row.stripe_subscription_id
  );
end;
$$;
