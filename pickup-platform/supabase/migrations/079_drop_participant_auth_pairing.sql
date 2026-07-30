-- Drop participant↔ auth pairing. Soft phone + hc_session remains the only
-- participant identity. Paid checkout uses soft personas (nullable event_payments.user_id).

-- ---------------------------------------------------------------------------
-- Clear links and drop pairing indexes / RPCs
-- ---------------------------------------------------------------------------

update public.participants
set user_id = null
where user_id is not null;

drop function if exists public.link_participant_to_auth_user(uuid, uuid);
drop function if exists public.ensure_participant_for_auth_user(uuid, text, text, text, text);
drop function if exists public.get_my_participant_orgs();
drop function if exists public.get_session_linked_email(uuid, uuid);

drop index if exists public.participants_org_user_unique;
drop index if exists public.participants_user_id_idx;

-- ---------------------------------------------------------------------------
-- Soft-session paid checkout: auth user optional on payment rows
-- ---------------------------------------------------------------------------

alter table public.event_payments
  alter column user_id drop not null;

comment on column public.event_payments.user_id is
  'Optional. Soft-session paid joins leave this null; organizer auth is unrelated.';

comment on column public.events.price_cents is
  'Nullable session fee in cents. Null or 0 = free (soft join OK). >0 requires Stripe Checkout via soft session.';

-- Organizer select still works; soft payers have no auth row to select by.
drop policy if exists "Users can view own event payments" on public.event_payments;

create policy "Org members can view event payments"
  on public.event_payments for select to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- Upsert soft persona + device session for paid checkout (anon OK)
-- ---------------------------------------------------------------------------

create or replace function public.prepare_paid_checkout_participant(
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
  v_phone text;
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

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  insert into public.participants (org_id, phone, first_name, last_name, display_name)
  values (p_org_id, v_phone, trim(p_first_name), trim(p_last_name), v_display)
  on conflict (org_id, phone) do update
    set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      display_name = coalesce(nullif(trim(p_display_name), ''), participants.display_name)
  returning id into v_participant_id;

  if v_participant_id is null then
    select id into v_participant_id
    from public.participants
    where org_id = p_org_id and phone = v_phone;
  end if;

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, p_org_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'session_token', v_session_token,
    'phone', v_phone
  );
end;
$$;

revoke all on function public.prepare_paid_checkout_participant(uuid, text, text, text, text) from public;
grant execute on function public.prepare_paid_checkout_participant(uuid, text, text, text, text)
  to anon, authenticated;

comment on function public.prepare_paid_checkout_participant(uuid, text, text, text, text) is
  'Creates or updates a soft participant and issues a device session for paid Stripe checkout.';
