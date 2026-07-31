-- Manually add an approved sponsor with no Stripe payment.
-- Gated to the interior operator (emanuallan@gmail.com) who is also an org owner.
-- Tier is chosen by the operator; monthly_amount_cents comes from that tier.

-- Drop prior draft signatures (argument list cannot be replaced in place).
drop function if exists public.create_complimentary_sponsorship(
  uuid, text, text, text, text, text
);
drop function if exists public.create_complimentary_sponsorship(
  uuid, uuid, text, text, text, text, text
);

create or replace function public.create_complimentary_sponsorship(
  p_org_id uuid,
  p_tier_id uuid,
  p_sponsor_name text,
  p_logo_url text,
  p_sponsor_url text default null,
  p_sponsor_message text default null,
  p_contact_email text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operator uuid := '23f1a201-aafe-4fd6-826d-3f753f092d33'::uuid;
  v_tier public.sponsorship_tiers%rowtype;
  v_id uuid;
  v_name text := nullif(trim(p_sponsor_name), '');
  v_logo text := nullif(trim(p_logo_url), '');
begin
  if auth.uid() is distinct from v_operator then
    raise exception 'Not authorized';
  end if;

  if not public.is_org_member(p_org_id, array['owner']) then
    raise exception 'Not authorized';
  end if;

  if v_name is null then
    raise exception 'Company name is required';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'Company name is too long';
  end if;

  if v_logo is null then
    raise exception 'Company logo is required';
  end if;

  select *
  into v_tier
  from public.sponsorship_tiers t
  where t.id = p_tier_id
    and t.org_id = p_org_id
    and t.status = 'active';

  if not found then
    raise exception 'Sponsorship tier not found';
  end if;

  insert into public.sponsorships (
    org_id,
    tier_id,
    status,
    sponsor_name,
    logo_url,
    sponsor_url,
    sponsor_message,
    contact_email,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_checkout_session_id,
    subscription_status,
    monthly_amount_cents,
    currency,
    platform_fee_percent,
    approved_at,
    approved_by
  )
  values (
    p_org_id,
    v_tier.id,
    'approved',
    v_name,
    v_logo,
    nullif(trim(coalesce(p_sponsor_url, '')), ''),
    nullif(trim(coalesce(p_sponsor_message, '')), ''),
    coalesce(nullif(trim(p_contact_email), ''), ''),
    null,
    null,
    null,
    null,
    v_tier.price_cents,
    v_tier.currency,
    0,
    now(),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_complimentary_sponsorship(
  uuid, uuid, text, text, text, text, text
) from public;

grant execute on function public.create_complimentary_sponsorship(
  uuid, uuid, text, text, text, text, text
) to authenticated;
