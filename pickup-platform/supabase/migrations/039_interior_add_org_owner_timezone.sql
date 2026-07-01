-- Extend interior handoff: optional timezone migration for the whole group.

drop function if exists public.interior_add_org_owner(uuid, text);

create or replace function public.interior_add_org_owner(
  p_org_id uuid,
  p_email text,
  p_timezone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operator_id constant uuid := '23f1a201-aafe-4fd6-826d-3f753f092d33';
  v_target_user_id uuid;
  v_normalized_email text;
  v_tz text;
  v_materialized int;
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

  v_tz := nullif(trim(p_timezone), '');
  if v_tz is not null then
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
  end if;

  return jsonb_build_object(
    'user_id', v_target_user_id,
    'email', v_normalized_email,
    'timezone_applied', v_tz
  );
end;
$$;

revoke all on function public.interior_add_org_owner(uuid, text, text) from public;
grant execute on function public.interior_add_org_owner(uuid, text, text) to authenticated;
