-- Group sponsorships: tiers, submissions, Stripe Connect accounts

-- ---------------------------------------------------------------------------
-- Feature default (group_sponsorships off — opt-in)
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
      "group_rules": false,
      "group_sponsorships": false
    }
  }'::jsonb;

update public.orgs
set settings = jsonb_set(
  settings,
  '{features,group_sponsorships}',
  coalesce(settings->'features'->'group_sponsorships', 'false'::jsonb),
  true
);

-- ---------------------------------------------------------------------------
-- Stripe Connect account per org
-- ---------------------------------------------------------------------------

create table public.org_stripe_accounts (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index org_stripe_accounts_stripe_account_id_idx
  on public.org_stripe_accounts (stripe_account_id);

alter table public.org_stripe_accounts enable row level security;

create policy "Org members can view stripe account"
  on public.org_stripe_accounts for select
  to authenticated
  using (public.is_org_member(org_id));

grant select on public.org_stripe_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- Sponsorship tiers
-- ---------------------------------------------------------------------------

create table public.sponsorship_tiers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents int not null check (price_cents >= 500),
  currency text not null default 'usd' check (currency = 'usd'),
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sponsorship_tiers_org_id_idx on public.sponsorship_tiers (org_id, sort_order);
create unique index sponsorship_tiers_org_name_active_idx
  on public.sponsorship_tiers (org_id, lower(name))
  where status = 'active';

alter table public.sponsorship_tiers enable row level security;

create policy "Org admins manage sponsorship tiers"
  on public.sponsorship_tiers for all
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']))
  with check (public.is_org_member(org_id, array['owner', 'admin']));

grant select, insert, update, delete on public.sponsorship_tiers to authenticated;

-- ---------------------------------------------------------------------------
-- Sponsor submissions / subscriptions
-- ---------------------------------------------------------------------------

create table public.sponsorships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  tier_id uuid not null references public.sponsorship_tiers(id) on delete restrict,
  status text not null default 'pending_approval'
    check (status in (
      'pending_approval', 'approved', 'declined', 'hidden', 'canceled', 'payment_failed'
    )),
  sponsor_name text not null,
  logo_url text not null,
  sponsor_url text,
  sponsor_message text,
  contact_email text not null default '',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text unique,
  subscription_status text,
  monthly_amount_cents int not null,
  currency text not null default 'usd',
  platform_fee_percent numeric(5,2) not null default 5.00,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  declined_at timestamptz,
  declined_by uuid references auth.users(id) on delete set null,
  decline_reason text,
  hidden_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sponsorships_org_status_idx on public.sponsorships (org_id, status, created_at desc);
create index sponsorships_stripe_subscription_idx on public.sponsorships (stripe_subscription_id);

alter table public.sponsorships enable row level security;

create policy "Org members can view sponsorships"
  on public.sponsorships for select
  to authenticated
  using (public.is_org_member(org_id));

grant select on public.sponsorships to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_sponsorships_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (o.settings->'features'->>'group_sponsorships')::boolean from public.orgs o where o.id = p_org_id),
    false
  );
$$;

create or replace function public.org_sponsorships_config(p_org_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select o.settings->'sponsorships' from public.orgs o where o.id = p_org_id),
    '{}'::jsonb
  );
$$;

create or replace function public.org_sponsorships_intro_text(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(public.org_sponsorships_config(p_org_id)->>'intro_text'), '');
$$;

create or replace function public.org_stripe_charges_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select a.charges_enabled from public.org_stripe_accounts a where a.org_id = p_org_id),
    false
  );
$$;

create or replace function public.org_has_active_sponsorship_tier(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sponsorship_tiers t
    where t.org_id = p_org_id
      and t.status = 'active'
      and t.stripe_price_id is not null
  );
$$;

create or replace function public.org_sponsorships_active(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.org_sponsorships_enabled(p_org_id)
    and public.org_sponsorships_intro_text(p_org_id) is not null
    and public.org_has_active_sponsorship_tier(p_org_id)
    and public.org_stripe_charges_enabled(p_org_id);
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_public_sponsors(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  if not exists (
    select 1 from public.orgs o where o.id = p_org_id and o.status = 'active'
  ) then
    return '[]'::jsonb;
  end if;

  v_active := public.org_sponsorships_active(p_org_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'sponsor_name', s.sponsor_name,
        'logo_url', s.logo_url,
        'sponsor_url', s.sponsor_url
      )
      order by s.approved_at nulls last, s.created_at
    )
    from public.sponsorships s
    where s.org_id = p_org_id
      and s.status = 'approved'
      and s.hidden_at is null
      and s.logo_url is not null
      and (s.subscription_status is null or s.subscription_status in ('active', 'trialing'))
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_public_sponsorship_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org public.orgs%rowtype;
  v_tiers jsonb;
begin
  select * into v_org
  from public.orgs o
  where o.slug = p_slug
    and o.status = 'active';

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'description', t.description,
      'price_cents', t.price_cents,
      'currency', t.currency,
      'sort_order', t.sort_order
    )
    order by t.sort_order, t.created_at
  ), '[]'::jsonb)
  into v_tiers
  from public.sponsorship_tiers t
  where t.org_id = v_org.id
    and t.status = 'active'
    and t.stripe_price_id is not null;

  return jsonb_build_object(
    'active', public.org_sponsorships_active(v_org.id),
    'intro_text', public.org_sponsorships_intro_text(v_org.id),
    'tiers', v_tiers
  );
end;
$$;

revoke all on function public.get_public_sponsors(uuid) from public;
grant execute on function public.get_public_sponsors(uuid) to anon, authenticated;

revoke all on function public.get_public_sponsorship_page(text) from public;
grant execute on function public.get_public_sponsorship_page(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Organizer RPCs
-- ---------------------------------------------------------------------------

create or replace function public.organizer_approve_sponsorship(p_sponsorship_id uuid)
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
    raise exception 'Sponsorship is not pending approval';
  end if;

  update public.sponsorships
  set status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),
      updated_at = now()
  where id = p_sponsorship_id;

  return jsonb_build_object('ok', true);
end;
$$;

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

  if v_row.status not in ('pending_approval', 'approved', 'payment_failed') then
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

create or replace function public.organizer_set_sponsorship_hidden(
  p_sponsorship_id uuid,
  p_hidden boolean
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

  if v_row.status not in ('approved', 'hidden') then
    raise exception 'Only approved sponsors can be hidden';
  end if;

  update public.sponsorships
  set status = case when p_hidden then 'hidden' else 'approved' end,
      hidden_at = case when p_hidden then now() else null end,
      updated_at = now()
  where id = p_sponsorship_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.organizer_approve_sponsorship(uuid) from public;
grant execute on function public.organizer_approve_sponsorship(uuid) to authenticated;

revoke all on function public.organizer_decline_sponsorship(uuid, text) from public;
grant execute on function public.organizer_decline_sponsorship(uuid, text) to authenticated;

revoke all on function public.organizer_set_sponsorship_hidden(uuid, boolean) from public;
grant execute on function public.organizer_set_sponsorship_hidden(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Service-role webhook upsert (no RLS grant — service role bypasses RLS)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_sponsorship_from_checkout(
  p_org_id uuid,
  p_tier_id uuid,
  p_sponsor_name text,
  p_logo_url text,
  p_sponsor_url text,
  p_sponsor_message text,
  p_contact_email text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_checkout_session_id text,
  p_monthly_amount_cents int,
  p_currency text,
  p_platform_fee_percent numeric,
  p_subscription_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
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
    platform_fee_percent
  )
  values (
    p_org_id,
    p_tier_id,
    'pending_approval',
    p_sponsor_name,
    p_logo_url,
    nullif(trim(p_sponsor_url), ''),
    nullif(trim(p_sponsor_message), ''),
    coalesce(p_contact_email, ''),
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_checkout_session_id,
    p_subscription_status,
    p_monthly_amount_cents,
    coalesce(p_currency, 'usd'),
    coalesce(p_platform_fee_percent, 5.00)
  )
  on conflict (stripe_checkout_session_id) do update
  set stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_customer_id = excluded.stripe_customer_id,
      subscription_status = excluded.subscription_status,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_sponsorship_subscription_status(
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_sponsorship_status text default null
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
        when p_sponsorship_status = 'canceled' then now()
        else canceled_at
      end,
      updated_at = now()
  where stripe_subscription_id = p_stripe_subscription_id;
end;
$$;

create or replace function public.upsert_org_stripe_account(
  p_org_id uuid,
  p_stripe_account_id text,
  p_charges_enabled boolean,
  p_payouts_enabled boolean,
  p_details_submitted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_stripe_accounts (
    org_id,
    stripe_account_id,
    charges_enabled,
    payouts_enabled,
    details_submitted,
    updated_at
  )
  values (
    p_org_id,
    p_stripe_account_id,
    p_charges_enabled,
    p_payouts_enabled,
    p_details_submitted,
    now()
  )
  on conflict (org_id) do update
  set stripe_account_id = excluded.stripe_account_id,
      charges_enabled = excluded.charges_enabled,
      payouts_enabled = excluded.payouts_enabled,
      details_submitted = excluded.details_submitted,
      updated_at = now();
end;
$$;

revoke all on function public.upsert_sponsorship_from_checkout(
  uuid, uuid, text, text, text, text, text, text, text, text, int, text, numeric, text
) from public;

revoke all on function public.update_sponsorship_subscription_status(text, text, text) from public;
revoke all on function public.upsert_org_stripe_account(uuid, text, boolean, boolean, boolean) from public;
