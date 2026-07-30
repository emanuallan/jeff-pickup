-- Soft participant email for paid Checkout prefill (not auth).

alter table public.participants
  add column if not exists email text;

comment on column public.participants.email is
  'Optional contact email for receipts / Stripe Checkout prefill. Soft identity only — not verified OTP.';

-- Include email when resolving a returning soft session.
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
    'email', p.email
  )
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.token = p_session_token
    and ps.org_id = p_org_id
    and ps.expires_at > now();
$$;

-- Replace prepare RPC with email support (new signature).
drop function if exists public.prepare_paid_checkout_participant(uuid, text, text, text, text);

create or replace function public.prepare_paid_checkout_participant(
  p_org_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_email text,
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
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  insert into public.participants (org_id, phone, first_name, last_name, display_name, email)
  values (p_org_id, v_phone, trim(p_first_name), trim(p_last_name), v_display, v_email)
  on conflict (org_id, phone) do update
    set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      display_name = coalesce(nullif(trim(p_display_name), ''), participants.display_name),
      email = excluded.email
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
    'phone', v_phone,
    'email', v_email
  );
end;
$$;

revoke all on function public.prepare_paid_checkout_participant(uuid, text, text, text, text, text) from public;
grant execute on function public.prepare_paid_checkout_participant(uuid, text, text, text, text, text)
  to anon, authenticated;

comment on function public.prepare_paid_checkout_participant(uuid, text, text, text, text, text) is
  'Creates or updates a soft participant (including email) and issues a device session for paid Stripe checkout.';
