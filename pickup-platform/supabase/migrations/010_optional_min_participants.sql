-- Make min_players optional (NULL = no minimum / no auto-promotion threshold).

alter table public.schedules drop constraint if exists schedules_min_players_le_capacity;
alter table public.events drop constraint if exists events_min_players_le_capacity;

alter table public.schedules drop constraint if exists schedules_min_players_check;
alter table public.events drop constraint if exists events_min_players_check;

alter table public.schedules alter column min_players drop not null;
alter table public.schedules alter column min_players drop default;

alter table public.events alter column min_players drop not null;
alter table public.events alter column min_players drop default;

alter table public.schedules
  add constraint schedules_min_players_le_capacity
  check (
    min_players is null
    or capacity is null
    or min_players <= capacity
  );

alter table public.events
  add constraint events_min_players_le_capacity
  check (
    min_players is null
    or capacity is null
    or min_players <= capacity
  );

alter table public.schedules
  add constraint schedules_min_players_range
  check (min_players is null or (min_players >= 2 and min_players <= 999));

alter table public.events
  add constraint events_min_players_range
  check (min_players is null or (min_players >= 2 and min_players <= 999));

create or replace function public.maybe_promote_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min int;
  v_headcount int;
begin
  select min_players into v_min from public.events where id = p_event_id;
  v_headcount := public.event_headcount(p_event_id);

  if v_min is not null and v_headcount >= v_min then
    update public.events
    set status = 'on'
    where id = p_event_id and status = 'tentative';
  end if;
end;
$$;
