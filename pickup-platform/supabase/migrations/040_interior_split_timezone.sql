-- Split interior timezone migration from co-owner handoff.

drop function if exists public.interior_add_org_owner(uuid, text, text);

create or replace function public.interior_add_org_owner(p_org_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operator_id constant uuid := '23f1a201-aafe-4fd6-826d-3f753f092d33';
  v_target_user_id uuid;
  v_normalized_email text;
begin
  if auth.uid() is distinct from v_operator_id then
    raise exception 'Not authorized';
  end if;

  if not public.is_org_member(p_org_id, array['owner']) then
    raise exception 'Not authorized for this group';
  end if;

  v_normalized_email := lower(trim(p_email));
  if v_normalized_email = '' or v_normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email address';
  end if;

  select id into v_target_user_id
  from auth.users
  where lower(email) = v_normalized_email;

  if v_target_user_id is null then
    raise exception 'No organizer account found for that email. They must sign up first.';
  end if;

  if v_target_user_id = v_operator_id then
    raise exception 'You are already an owner of this group';
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (p_org_id, v_target_user_id, 'owner')
  on conflict (org_id, user_id) do update set role = 'owner';

  return jsonb_build_object(
    'user_id', v_target_user_id,
    'email', v_normalized_email
  );
end;
$$;

create or replace function public.interior_set_org_timezone(p_org_id uuid, p_timezone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operator_id constant uuid := '23f1a201-aafe-4fd6-826d-3f753f092d33';
  v_tz text;
  v_materialized int;
begin
  if auth.uid() is distinct from v_operator_id then
    raise exception 'Not authorized';
  end if;

  if not public.is_org_member(p_org_id, array['owner']) then
    raise exception 'Not authorized for this group';
  end if;

  v_tz := nullif(trim(p_timezone), '');
  if v_tz is null then
    raise exception 'Timezone is required';
  end if;

  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    raise exception 'Invalid timezone: %', v_tz;
  end if;

  update public.schedules
  set
    timezone = v_tz,
    anchor_date = (current_timestamp at time zone v_tz)::date
  where org_id = p_org_id;

  delete from public.events
  where org_id = p_org_id
    and schedule_id is not null
    and starts_at >= now();

  update public.events e
  set
    starts_at = (
      (e.starts_at at time zone coalesce(nullif(e.timezone, ''), 'UTC'))::timestamp without time zone
      at time zone v_tz
    ),
    timezone = v_tz
  where e.org_id = p_org_id;

  v_materialized := public.materialize_events(5, p_org_id);

  return jsonb_build_object(
    'timezone', v_tz,
    'materialized', v_materialized
  );
end;
$$;

revoke all on function public.interior_add_org_owner(uuid, text) from public;
grant execute on function public.interior_add_org_owner(uuid, text) to authenticated;

revoke all on function public.interior_set_org_timezone(uuid, text) from public;
grant execute on function public.interior_set_org_timezone(uuid, text) to authenticated;
