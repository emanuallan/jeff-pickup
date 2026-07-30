-- Session team selection: org feature (default off) + per-session team_count.
-- signups.team is a 1-based team index (1..team_count), null = unassigned.

-- ---------------------------------------------------------------------------
-- Feature default (team_selection off — opt-in)
-- ---------------------------------------------------------------------------

update public.orgs
set settings = jsonb_set(
  settings,
  '{features,team_selection}',
  coalesce(settings->'features'->'team_selection', 'false'::jsonb),
  true
);

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
      "group_sponsorships": false,
      "team_selection": false
    }
  }'::jsonb;

-- ---------------------------------------------------------------------------
-- events.team_count — null = teams off for this session; 2–8 when on
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists team_count int
  check (team_count is null or (team_count >= 2 and team_count <= 8));

comment on column public.events.team_count is
  'When set (2–8), confirmed players can pick a team 1..team_count after joining. Null = no teams.';

-- ---------------------------------------------------------------------------
-- signups.team — 1-based index; upper bound enforced in RPCs against event.team_count
-- ---------------------------------------------------------------------------

alter table public.signups
  drop constraint if exists signups_team_check;

-- Coerce a prior text draft (team_1/team_2) to int if present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'signups'
      and column_name = 'team'
      and data_type = 'text'
  ) then
    alter table public.signups add column team_migrated int;
    update public.signups
    set team_migrated = case
      when team = 'team_1' then 1
      when team = 'team_2' then 2
      when team ~ '^[0-9]+$' then team::int
      else null
    end;
    alter table public.signups drop column team;
    alter table public.signups rename column team_migrated to team;
  end if;
end $$;

alter table public.signups
  add column if not exists team int;

alter table public.signups
  drop constraint if exists signups_team_check;

alter table public.signups
  add constraint signups_team_check
  check (team is null or team >= 1);

comment on column public.signups.team is
  '1-based team index for sessions with team_count; null = unassigned.';

-- ---------------------------------------------------------------------------
-- Public roster views — expose team
-- ---------------------------------------------------------------------------

drop view if exists public.event_waitlist_public;
drop view if exists public.event_roster_public;

create view public.event_roster_public
with (security_invoker = true)
as
select
  s.id,
  s.event_id,
  s.org_id,
  s.guest_count,
  s.arrival_status,
  s.team,
  s.created_at,
  p.display_name,
  s.participant_id
from public.signups s
join public.participants p on p.id = s.participant_id
where s.list_status = 'confirmed';

create view public.event_waitlist_public
with (security_invoker = true)
as
select
  s.id,
  s.event_id,
  s.org_id,
  s.guest_count,
  s.arrival_status,
  s.team,
  s.created_at,
  p.display_name,
  s.participant_id
from public.signups s
join public.participants p on p.id = s.participant_id
where s.list_status = 'waitlisted';

grant select on public.event_roster_public to anon, authenticated;
grant select on public.event_waitlist_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_signup_for_session — include team
-- ---------------------------------------------------------------------------

create or replace function public.get_signup_for_session(
  p_event_id uuid,
  p_session_token uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'signup_id', s.id,
    'guest_count', s.guest_count,
    'arrival_status', s.arrival_status,
    'display_name', p.display_name,
    'list_status', s.list_status,
    'team', s.team
  )
  from public.signups s
  join public.participants p on p.id = s.participant_id
  join public.participant_sessions ps on ps.participant_id = p.id
  where s.event_id = p_event_id
    and ps.token = p_session_token
    and ps.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- update_signup_team — participant self-service
-- p_team: 'random' or '1'..'8' (validated against event.team_count)
-- ---------------------------------------------------------------------------

create or replace function public.update_signup_team(
  p_signup_id uuid,
  p_session_token uuid,
  p_team text
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
  v_list_status text;
  v_team_count int;
  v_choice int;
  v_assigned int;
  v_counts int[];
  v_min int;
  v_candidates int[];
  v_i int;
begin
  select s.participant_id, s.org_id, s.event_id, s.list_status
  into v_participant_id, v_org_id, v_event_id, v_list_status
  from public.signups s
  where s.id = p_signup_id;

  if v_participant_id is null then
    raise exception 'Signup not found';
  end if;

  if v_list_status <> 'confirmed' then
    raise exception 'Only confirmed signups can pick a team';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  perform public.assert_event_open(v_event_id);

  select e.team_count into v_team_count
  from public.events e
  where e.id = v_event_id;

  if v_team_count is null then
    raise exception 'Teams are not enabled for this session';
  end if;

  if p_team = 'random' then
    v_counts := array_fill(0, array[v_team_count]);

    for v_i in 1..v_team_count loop
      select coalesce(sum(1 + s.guest_count), 0)
      into v_counts[v_i]
      from public.signups s
      where s.event_id = v_event_id
        and s.list_status = 'confirmed'
        and s.id <> p_signup_id
        and s.team = v_i;
    end loop;

    v_min := v_counts[1];
    for v_i in 2..v_team_count loop
      if v_counts[v_i] < v_min then
        v_min := v_counts[v_i];
      end if;
    end loop;

    v_candidates := array[]::int[];
    for v_i in 1..v_team_count loop
      if v_counts[v_i] = v_min then
        v_candidates := array_append(v_candidates, v_i);
      end if;
    end loop;

    v_assigned := v_candidates[1 + floor(random() * array_length(v_candidates, 1))::int];
  else
    if p_team !~ '^[0-9]+$' then
      raise exception 'Invalid team';
    end if;
    v_choice := p_team::int;
    if v_choice < 1 or v_choice > v_team_count then
      raise exception 'Invalid team';
    end if;
    v_assigned := v_choice;
  end if;

  update public.signups
  set team = v_assigned
  where id = p_signup_id;
end;
$$;

revoke all on function public.update_signup_team(uuid, uuid, text) from public;
grant execute on function public.update_signup_team(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- organizer_update_session_signup_team
-- p_team: null to clear, or '1'..'8'
-- ---------------------------------------------------------------------------

create or replace function public.organizer_update_session_signup_team(
  p_signup_id uuid,
  p_team text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_org_id uuid;
  v_list_status text;
  v_team_count int;
  v_choice int;
begin
  select s.event_id, s.org_id, s.list_status
  into v_event_id, v_org_id, v_list_status
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  if v_list_status <> 'confirmed' then
    raise exception 'Only confirmed signups can be assigned a team';
  end if;

  perform public.assert_organizer_event_access(v_org_id);

  select e.team_count into v_team_count
  from public.events e
  where e.id = v_event_id;

  if v_team_count is null then
    raise exception 'Teams are not enabled for this session';
  end if;

  if p_team is null or p_team = '' then
    update public.signups set team = null where id = p_signup_id;
    return;
  end if;

  if p_team !~ '^[0-9]+$' then
    raise exception 'Invalid team';
  end if;

  v_choice := p_team::int;
  if v_choice < 1 or v_choice > v_team_count then
    raise exception 'Invalid team';
  end if;

  update public.signups
  set team = v_choice
  where id = p_signup_id;
end;
$$;

revoke all on function public.organizer_update_session_signup_team(uuid, text) from public;
grant execute on function public.organizer_update_session_signup_team(uuid, text) to authenticated;
