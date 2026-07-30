-- Confirmed signups get a balance-preferring team automatically, so players
-- only ever switch rather than pick from scratch.

-- ---------------------------------------------------------------------------
-- pick_balanced_team — smallest team by headcount, uniform among ties
-- ---------------------------------------------------------------------------

create or replace function public.pick_balanced_team(
  p_event_id uuid,
  p_team_count int,
  p_exclude_signup_id uuid default null
)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_counts int[];
  v_count int;
  v_min int;
  v_candidates int[];
  v_i int;
begin
  if p_team_count is null or p_team_count < 1 then
    return null;
  end if;

  v_counts := array_fill(0, array[p_team_count]);

  for v_i in 1..p_team_count loop
    select coalesce(sum(1 + s.guest_count), 0)
    into v_count
    from public.signups s
    where s.event_id = p_event_id
      and s.list_status = 'confirmed'
      and (p_exclude_signup_id is null or s.id <> p_exclude_signup_id)
      and s.team = v_i;

    v_counts[v_i] := v_count;
  end loop;

  v_min := v_counts[1];
  for v_i in 2..p_team_count loop
    if v_counts[v_i] < v_min then
      v_min := v_counts[v_i];
    end if;
  end loop;

  v_candidates := array[]::int[];
  for v_i in 1..p_team_count loop
    if v_counts[v_i] = v_min then
      v_candidates := array_append(v_candidates, v_i);
    end if;
  end loop;

  return v_candidates[1 + floor(random() * array_length(v_candidates, 1))::int];
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-assign on join and on waitlist promotion
-- ---------------------------------------------------------------------------

create or replace function public.assign_team_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_count int;
begin
  if new.list_status <> 'confirmed' or new.team is not null then
    return new;
  end if;

  select e.team_count into v_team_count
  from public.events e
  where e.id = new.event_id;

  if v_team_count is null then
    return new;
  end if;

  new.team := public.pick_balanced_team(new.event_id, v_team_count, new.id);
  return new;
end;
$$;

drop trigger if exists signups_assign_team_on_confirm on public.signups;

create trigger signups_assign_team_on_confirm
before insert or update of list_status on public.signups
for each row
execute function public.assign_team_on_confirm();

-- ---------------------------------------------------------------------------
-- assign_missing_teams — organizer action when teams are turned on mid-session
-- ---------------------------------------------------------------------------

create or replace function public.assign_missing_teams(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_team_count int;
  r record;
begin
  select e.org_id, e.team_count
  into v_org_id, v_team_count
  from public.events e
  where e.id = p_event_id;

  if v_org_id is null then
    raise exception 'Session not found';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  if v_team_count is null then
    return;
  end if;

  -- One at a time so each pick sees the previous assignment and stays balanced.
  for r in
    select s.id
    from public.signups s
    where s.event_id = p_event_id
      and s.list_status = 'confirmed'
      and s.team is null
    order by s.created_at
  loop
    update public.signups
    set team = public.pick_balanced_team(p_event_id, v_team_count, r.id)
    where id = r.id;
  end loop;
end;
$$;

revoke all on function public.assign_missing_teams(uuid) from public;
grant execute on function public.assign_missing_teams(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill sessions that already have teams enabled
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select s.id, s.event_id, e.team_count
    from public.signups s
    join public.events e on e.id = s.event_id
    where e.team_count is not null
      and s.list_status = 'confirmed'
      and s.team is null
    order by s.created_at
  loop
    update public.signups
    set team = public.pick_balanced_team(r.event_id, r.team_count, r.id)
    where id = r.id;
  end loop;
end $$;
