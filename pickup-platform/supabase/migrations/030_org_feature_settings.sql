-- Org-level feature toggles for public-facing optional features.

alter table public.orgs
  add column if not exists settings jsonb not null default '{
    "features": {
      "user_badges": true,
      "leaderboard": true,
      "returning_signup_modal": true
    }
  }'::jsonb;

-- Include settings in the public org + event RPC payload.
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
