-- International phone support: E.164 digits (no '+'), US backfill, updated normalize_phone.

-- ---------------------------------------------------------------------------
-- Backfill existing US 10-digit phones
-- ---------------------------------------------------------------------------

update public.participants
set phone = '1' || phone
where length(phone) = 10;

update public.participant_group_agreements
set phone = '1' || phone
where length(phone) = 10;

-- ---------------------------------------------------------------------------
-- normalize_phone — E.164 digits without '+'
-- ---------------------------------------------------------------------------

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  with digits as (
    select nullif(regexp_replace(trim(p_phone), '\D', '', 'g'), '') as d
  ),
  normalized as (
    select case
      when d is null then null
      when length(d) = 10 then '1' || d
      when length(d) between 11 and 15 then d
      else null
    end as n
    from digits
  )
  select n from normalized;
$$;

-- ---------------------------------------------------------------------------
-- recover_participant_session — updated validation message
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
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null then
    raise exception 'Enter a valid phone number.';
  end if;

  select id, display_name
  into v_participant_id, v_display
  from public.participants
  where org_id = p_org_id and phone = v_phone;

  if v_participant_id is null then
    raise exception 'No account found for that phone number.';
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

grant execute on function public.recover_participant_session(uuid, text) to anon, authenticated;
