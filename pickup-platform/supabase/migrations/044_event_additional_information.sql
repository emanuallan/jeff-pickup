-- additional_information: form-collected session details (shown inside the event card).
-- announcement: per-session, console-edited (shown above the event card). Unchanged column.
--
-- Adds additional_information to events + schedules, copies it through materialize_events,
-- and exposes both fields on get_public_org_and_event.

alter table public.events
  add column if not exists additional_information text not null default '';

alter table public.schedules
  add column if not exists additional_information text not null default '';

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
                capacity, min_players, status, timezone, additional_information
              )
              values (
                r.org_id, r.id, r.location_id, v_starts_at,
                r.capacity, r.min_players,
                case when r.min_players is null then 'on' else 'tentative' end,
                r.timezone, r.additional_information
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

create or replace function public.get_public_org_and_event(p_slug text, p_event_ref text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.id is null then null::jsonb
    else jsonb_build_object(
      'org', jsonb_build_object(
        'id', o.id,
        'slug', o.slug,
        'name', o.name,
        'description', o.description,
        'status', o.status,
        'default_locale', o.default_locale,
        'branding', o.branding,
        'settings', o.settings
      ),
      'event', (
        select jsonb_build_object(
          'id', e.id,
          'short_id', e.short_id,
          'org_id', e.org_id,
          'schedule_id', e.schedule_id,
          'location_id', e.location_id,
          'starts_at', e.starts_at,
          'timezone', e.timezone,
          'duration_min', e.duration_min,
          'capacity', e.capacity,
          'min_players', e.min_players,
          'status', e.status,
          'announcement', e.announcement,
          'additional_information', e.additional_information,
          'title', e.title,
          'locations', jsonb_build_object(
            'label', l.label,
            'address', l.address,
            'lat', l.lat,
            'lon', l.lon,
            'maps_url', l.maps_url,
            'is_online', l.is_online,
            'meeting_url', l.meeting_url
          ),
          'schedules', case
            when s.id is null then null
            else jsonb_build_object('title', s.title, 'duration_min', s.duration_min)
          end
        )
        from public.events e
        join public.locations l on l.id = e.location_id
        left join public.schedules s on s.id = e.schedule_id
        where e.org_id = o.id and e.short_id = p_event_ref
      )
    )
  end
  from public.orgs o
  where o.slug = p_slug and o.status = 'active';
$$;

revoke all on function public.get_public_org_and_event(text, text) from public;
grant execute on function public.get_public_org_and_event(text, text) to anon, authenticated;
