-- Shirt colors per team (unique main colors). Null when teams are off.
-- Array index 0 = team 1. Players on a team can change to an unused color.

alter table public.events
  add column if not exists team_colors jsonb;

alter table public.schedules
  add column if not exists team_colors jsonb;

comment on column public.events.team_colors is
  'Shirt colors per team (json array of slugs, index 0 = team 1). Null when team_count is null.';

comment on column public.schedules.team_colors is
  'Shirt colors inherited by newly materialized sessions. Null when team_count is null.';

-- Backfill existing team sessions (white, black, red, … in palette order).
update public.events
set team_colors = (
  select jsonb_agg(to_jsonb(c.slug) order by c.ord)
  from (
    select slug, ord
    from unnest(array[
      'white','black','red','blue','green','yellow','orange','purple'
    ]) with ordinality as t(slug, ord)
    where t.ord <= events.team_count
  ) c
)
where team_count is not null
  and team_colors is null;

update public.schedules
set team_colors = (
  select jsonb_agg(to_jsonb(c.slug) order by c.ord)
  from (
    select slug, ord
    from unnest(array[
      'white','black','red','blue','green','yellow','orange','purple'
    ]) with ordinality as t(slug, ord)
    where t.ord <= schedules.team_count
  ) c
)
where team_count is not null
  and team_colors is null;

create or replace function public.session_team_colors_valid(p_count int, p_colors jsonb)
returns boolean
language sql
immutable
as $$
  select
    (p_count is null and p_colors is null)
    or (
      p_count is not null
      and p_count >= 2
      and p_count <= 8
      and p_colors is not null
      and jsonb_typeof(p_colors) = 'array'
      and jsonb_array_length(p_colors) = p_count
      and (
        select count(distinct x) = p_count
        from jsonb_array_elements_text(p_colors) as t(x)
      )
      and not exists (
        select 1
        from jsonb_array_elements_text(p_colors) as t(x)
        where x not in (
          'white','black','red','blue','green','yellow','orange','purple'
        )
      )
    );
$$;

alter table public.events
  drop constraint if exists events_team_colors_valid;

alter table public.events
  add constraint events_team_colors_valid
  check (public.session_team_colors_valid(team_count, team_colors));

alter table public.schedules
  drop constraint if exists schedules_team_colors_valid;

alter table public.schedules
  add constraint schedules_team_colors_valid
  check (public.session_team_colors_valid(team_count, team_colors));

-- Newly materialized sessions inherit the schedule's team_colors.
drop function if exists public.materialize_events(int, uuid);

create function public.materialize_events(
  p_session_count int default 5,
  p_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  r record;
  d date;
  v_starts_at timestamptz;
  v_dow int;
  v_weeks_since int;
  v_total int;
  v_max_date date;
begin
  if p_session_count < 1 or p_session_count > 30 then
    raise exception 'session_count must be between 1 and 30';
  end if;

  v_max_date := current_date + 365;

  for r in
    select s.*
    from public.schedules s
    where s.is_active
      and (p_org_id is null or s.org_id = p_org_id)
  loop
    v_total := 0;
    d := current_date;

    while v_total < p_session_count and d <= v_max_date loop
      if d >= r.anchor_date then
        v_weeks_since := ((d - r.anchor_date) / 7)::int;
        if v_weeks_since % r.interval_weeks = 0 then
          v_dow := extract(dow from d)::int;
          if v_dow = any(r.byweekday) then
            v_starts_at := (d + r.start_time) at time zone r.timezone;

            if not exists (
              select 1 from public.schedule_event_skips sk
              where sk.schedule_id = r.id and sk.starts_at = v_starts_at
            ) and v_starts_at >= now() then
              insert into public.events (
                org_id, schedule_id, location_id, starts_at,
                capacity, min_players, status, timezone,
                additional_information, team_count, team_colors, price_cents
              )
              values (
                r.org_id, r.id, r.location_id, v_starts_at,
                r.capacity, r.min_players,
                case when r.min_players is null then 'on' else 'tentative' end,
                r.timezone, r.additional_information, r.team_count, r.team_colors,
                r.price_cents
              )
              on conflict (schedule_id, starts_at) do nothing;

              if found then
                v_inserted := v_inserted + 1;
              end if;

              if exists (
                select 1 from public.events e
                where e.schedule_id = r.id and e.starts_at = v_starts_at
              ) then
                v_total := v_total + 1;
              end if;
            end if;
          end if;
        end if;
      end if;

      d := d + 1;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.materialize_events(int, uuid) from public;
grant execute on function public.materialize_events(int, uuid) to service_role;

-- Players on a team can pick its shirt color (must be unused by another team).
create or replace function public.update_event_team_color(
  p_event_id uuid,
  p_session_token uuid,
  p_team int,
  p_color text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_org_id uuid;
  v_team_count int;
  v_colors jsonb;
  v_i int;
  v_existing text;
begin
  perform public.assert_event_open(p_event_id);

  select e.org_id, e.team_count, e.team_colors
  into v_org_id, v_team_count, v_colors
  from public.events e
  where e.id = p_event_id;

  if v_team_count is null then
    raise exception 'Teams are not enabled for this session';
  end if;

  if p_team < 1 or p_team > v_team_count then
    raise exception 'Invalid team';
  end if;

  if p_color not in (
    'white','black','red','blue','green','yellow','orange','purple'
  ) then
    raise exception 'Invalid shirt color';
  end if;

  v_participant_id := public.resolve_session_participant(p_session_token, v_org_id);
  if v_participant_id is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from public.signups s
    where s.event_id = p_event_id
      and s.participant_id = v_participant_id
      and s.list_status = 'confirmed'
      and s.team = p_team
  ) then
    raise exception 'Only players on this team can pick its shirt color';
  end if;

  if v_colors is null or jsonb_typeof(v_colors) <> 'array' then
    select jsonb_agg(to_jsonb(c.slug) order by c.ord)
    into v_colors
    from (
      select slug, ord
      from unnest(array[
        'white','black','red','blue','green','yellow','orange','purple'
      ]) with ordinality as t(slug, ord)
      where t.ord <= v_team_count
    ) c;
  end if;

  for v_i in 0..v_team_count - 1 loop
    if v_i = p_team - 1 then
      continue;
    end if;
    v_existing := v_colors ->> v_i;
    if v_existing = p_color then
      raise exception 'That color is already taken';
    end if;
  end loop;

  update public.events
  set team_colors = jsonb_set(v_colors, array[(p_team - 1)::text], to_jsonb(p_color), true)
  where id = p_event_id;
end;
$$;

revoke all on function public.update_event_team_color(uuid, uuid, int, text) from public;
grant execute on function public.update_event_team_color(uuid, uuid, int, text)
  to anon, authenticated, service_role;
