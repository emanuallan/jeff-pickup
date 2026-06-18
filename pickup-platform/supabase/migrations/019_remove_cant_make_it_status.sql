-- Remove cant_make_it arrival status; participants should unregister instead.

update public.signups
set arrival_status = 'confirmed'
where arrival_status = 'cant_make_it';

alter table public.signups
  drop constraint if exists signups_arrival_status_check;

alter table public.signups
  add constraint signups_arrival_status_check
  check (arrival_status in (
    'confirmed', 'on_my_way', 'running_late', 'in_traffic', 'maybe'
  ));

create or replace function public.event_headcount(p_event_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(1 + s.guest_count), 0)::int
  from public.signups s
  where s.event_id = p_event_id;
$$;

create or replace function public.update_arrival_status(
  p_signup_id uuid,
  p_session_token uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_org_id uuid;
  v_event_id uuid;
begin
  if p_status not in (
    'confirmed', 'on_my_way', 'running_late', 'in_traffic', 'maybe'
  ) then
    raise exception 'Invalid status';
  end if;

  select s.participant_id, s.org_id, s.event_id
  into v_participant_id, v_org_id, v_event_id
  from public.signups s
  where s.id = p_signup_id;

  if v_participant_id is null then
    raise exception 'Signup not found';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  perform public.assert_event_open(v_event_id);

  update public.signups
  set arrival_status = p_status
  where id = p_signup_id;

  perform public.maybe_promote_event(v_event_id);
end;
$$;
