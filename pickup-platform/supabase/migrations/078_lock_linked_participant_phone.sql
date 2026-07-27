-- When a participant is already linked to an auth user in an org, do not rewrite
-- their phone. One account ↔ one phone per group.

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
  v_existing_phone text;
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
  select id, phone into v_participant_id, v_existing_phone
  from public.participants
  where org_id = p_org_id and user_id = v_user_id;

  if v_participant_id is not null then
    if v_existing_phone is distinct from v_phone then
      raise exception 'This account is already linked to a different phone in this group';
    end if;

    update public.participants
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
    where id = v_participant_id;

    return jsonb_build_object('participant_id', v_participant_id, 'phone', v_existing_phone);
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

comment on function public.ensure_participant_for_auth_user(uuid, text, text, text, text) is
  'Creates or links a participant for the signed-in user. Linked phone is immutable.';
