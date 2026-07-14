-- Two cancel modes for live sponsorships:
--   refund_now — logo off immediately; caller refunds last invoice then cancels Stripe sub
--   end_of_period — keep logo until period end; Stripe cancel_at_period_end

alter table public.sponsorships
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.sponsorships
  add column if not exists current_period_end timestamptz;

drop function if exists public.organizer_cancel_sponsorship(uuid);
drop function if exists public.organizer_cancel_sponsorship(uuid, text);
drop function if exists public.update_sponsorship_subscription_status(text, text, text);

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
  if p_mode not in ('refund_now', 'end_of_period') then
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

  if v_row.status not in ('approved', 'hidden') then
    raise exception 'Sponsorship cannot be canceled';
  end if;

  if p_mode = 'refund_now' then
    update public.sponsorships
    set status = 'canceled',
        canceled_at = now(),
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

revoke all on function public.organizer_cancel_sponsorship(uuid, text, timestamptz) from public;
grant execute on function public.organizer_cancel_sponsorship(uuid, text, timestamptz) to authenticated;

-- Pending-only: approved sponsors use organizer_cancel_sponsorship instead.
create or replace function public.organizer_decline_sponsorship(
  p_sponsorship_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sponsorships%rowtype;
begin
  select * into v_row
  from public.sponsorships s
  where s.id = p_sponsorship_id;

  if not found then
    raise exception 'Sponsorship not found';
  end if;

  if not public.is_org_member(v_row.org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  if v_row.status <> 'pending_approval' then
    raise exception 'Sponsorship cannot be declined';
  end if;

  update public.sponsorships
  set status = 'declined',
      declined_at = now(),
      declined_by = auth.uid(),
      decline_reason = nullif(trim(p_reason), ''),
      updated_at = now()
  where id = p_sponsorship_id;

  return jsonb_build_object('ok', true, 'stripe_subscription_id', v_row.stripe_subscription_id);
end;
$$;

-- Sync cancel_at_period_end / period end from Stripe subscription webhooks.
create or replace function public.update_sponsorship_subscription_status(
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_sponsorship_status text default null,
  p_cancel_at_period_end boolean default null,
  p_current_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sponsorships
  set subscription_status = p_subscription_status,
      status = coalesce(p_sponsorship_status, status),
      canceled_at = case
        when p_sponsorship_status = 'canceled' then coalesce(canceled_at, now())
        else canceled_at
      end,
      cancel_at_period_end = case
        when p_sponsorship_status = 'canceled' then false
        when p_cancel_at_period_end is not null then p_cancel_at_period_end
        else cancel_at_period_end
      end,
      current_period_end = case
        when p_sponsorship_status = 'canceled' then null
        when p_current_period_end is not null then p_current_period_end
        else current_period_end
      end,
      updated_at = now()
  where stripe_subscription_id = p_stripe_subscription_id;
end;
$$;

revoke all on function public.update_sponsorship_subscription_status(text, text, text, boolean, timestamptz) from public;
grant execute on function public.update_sponsorship_subscription_status(text, text, text, boolean, timestamptz) to service_role;
