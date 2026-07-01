-- Refresh demo org (slug: demo) — schema-current through 036.
-- Re-run safe: deletes and recreates the demo org (cascades all child rows).
-- Use this migration (or re-run its SQL) to keep relative demo dates fresh.
-- Includes signup activity for console analytics, waitlist roster demo, and org settings.

do $$
declare
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_loc_park uuid := 'a0000000-0000-4000-8000-000000000002';
  v_loc_zoom uuid := 'a0000000-0000-4000-8000-000000000003';
  v_sched_pickup uuid := 'a0000000-0000-4000-8000-000000000004';
  v_sched_skills uuid := 'a0000000-0000-4000-8000-000000000005';
  v_sched_volunteers uuid := 'a0000000-0000-4000-8000-000000000006';
  v_tz text := 'America/Chicago';

  v_ev_live uuid := 'b0000000-0000-4000-8000-000000000001';
  v_ev_next uuid := 'b0000000-0000-4000-8000-000000000002';
  v_ev_tent uuid := 'b0000000-0000-4000-8000-000000000003';
  v_ev_cancel uuid := 'b0000000-0000-4000-8000-000000000004';
  v_ev_online uuid := 'b0000000-0000-4000-8000-000000000005';
  v_ev_past1 uuid := 'b0000000-0000-4000-8000-000000000011';
  v_ev_past2 uuid := 'b0000000-0000-4000-8000-000000000012';
  v_ev_past3 uuid := 'b0000000-0000-4000-8000-000000000013';
  v_ev_past4 uuid := 'b0000000-0000-4000-8000-000000000014';

  -- Participants
  p_marcus uuid := 'c0000000-0000-4000-8000-000000000001';
  p_diego uuid := 'c0000000-0000-4000-8000-000000000002';
  p_jen uuid := 'c0000000-0000-4000-8000-000000000003';
  p_tyler uuid := 'c0000000-0000-4000-8000-000000000004';
  p_sofia uuid := 'c0000000-0000-4000-8000-000000000005';
  p_chris uuid := 'c0000000-0000-4000-8000-000000000006';
  p_amir uuid := 'c0000000-0000-4000-8000-000000000007';
  p_elena uuid := 'c0000000-0000-4000-8000-000000000008';
  p_jordan uuid := 'c0000000-0000-4000-8000-000000000009';
  p_pat uuid := 'c0000000-0000-4000-8000-00000000000a';
  p_maya uuid := 'c0000000-0000-4000-8000-00000000000b';
  p_leo uuid := 'c0000000-0000-4000-8000-00000000000c';
  p_rachel uuid := 'c0000000-0000-4000-8000-00000000000d';
  p_ben uuid := 'c0000000-0000-4000-8000-00000000000e';

  v_today date;
  v_pickup_days int[] := array[2, 4]; -- Tue / Thu
  v_ev_next_day date;
  v_ev_cancel_day date;
  v_ev_tent_day date;
  v_ev_online_day date;
  v_ev_past1_day date;
  v_ev_past2_day date;
  v_ev_past3_day date;
  v_ev_past4_day date;
begin
  v_today := (now() at time zone v_tz)::date;

  select v_today + 4 + min((d - extract(dow from v_today + 4)::int + 7) % 7)::int
  into v_ev_next_day
  from unnest(v_pickup_days) as d;

  select v_today + 6 + min((d - extract(dow from v_today + 6)::int + 7) % 7)::int
  into v_ev_cancel_day
  from unnest(v_pickup_days) as d;

  select v_today + 11 + ((6 - extract(dow from v_today + 11)::int + 7) % 7)::int
  into v_ev_tent_day;

  select v_today + 8 + ((3 - extract(dow from v_today + 8)::int + 7) % 7)::int
  into v_ev_online_day;

  select (v_today - 7) - min((extract(dow from v_today - 7)::int - d + 7) % 7)::int
  into v_ev_past1_day
  from unnest(v_pickup_days) as d;

  select (v_today - 14) - min((extract(dow from v_today - 14)::int - d + 7) % 7)::int
  into v_ev_past2_day
  from unnest(v_pickup_days) as d;

  select (v_today - 21) - min((extract(dow from v_today - 21)::int - d + 7) % 7)::int
  into v_ev_past3_day
  from unnest(v_pickup_days) as d;

  select (v_today - 28) - ((extract(dow from v_today - 28)::int - 6 + 7) % 7)::int
  into v_ev_past4_day;

  delete from public.orgs where slug = 'demo';

  insert into public.orgs (id, slug, name, description, status, branding, settings, created_by)
  values (
    v_org_id,
    'demo',
    'Music City Pickup',
    'Pickup soccer in Nashville — all skill levels, friendly games twice a week.',
    'active',
    jsonb_build_object(
      'logo_url', 'https://dijtbndiacmfsgxhfcth.supabase.co/storage/v1/object/public/organizr_public/demo-logo.png',
      'accent_color', '#0080ff',
      'links', jsonb_build_array(
        'https://instagram.com/organizr.co',
        'https://chat.whatsapp.com/demo'
      )
    ),
    jsonb_build_object(
      'features', jsonb_build_object(
        'user_badges', true,
        'leaderboard', true,
        'returning_signup_modal', true
      ),
      'waitlist', jsonb_build_object(
        'promotion_mode', 'strict_fifo'
      )
    ),
    null
  );

  insert into public.locations (id, org_id, label, address, maps_url, lat, lon, is_online, meeting_url)
  values
    (
      v_loc_park,
      v_org_id,
      'Two Rivers Park Soccer Fields',
      '3120 Brogden Ave, Nashville, TN 37214',
      'https://maps.google.com/?q=Two+Rivers+Park+Soccer+Fields+Nashville',
      36.1889,
      -86.7286,
      false,
      ''
    ),
    (
      v_loc_zoom,
      v_org_id,
      'Zoom',
      '',
      '',
      0,
      0,
      true,
      'https://zoom.us/j/00000000000'
    );

  insert into public.schedules (
    id, org_id, location_id, title, byweekday, start_time, duration_min,
    capacity, min_players, timezone, interval_weeks
  )
  values
    (
      v_sched_pickup,
      v_org_id,
      v_loc_park,
      'Evening Pickup',
      array[2, 4],
      '18:30',
      90,
      24,
      14,
      v_tz,
      1
    ),
    (
      v_sched_skills,
      v_org_id,
      v_loc_park,
      'Skills & Scrimmage',
      array[6],
      '10:00',
      75,
      20,
      10,
      v_tz,
      1
    ),
    (
      v_sched_volunteers,
      v_org_id,
      v_loc_zoom,
      'Volunteers Meeting',
      array[3],
      '19:00',
      60,
      16,
      8,
      v_tz,
      1
    );

  insert into public.events (
    id, org_id, schedule_id, location_id, starts_at, capacity, min_players,
    status, announcement, timezone, short_id
  )
  values
    (
      v_ev_live,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      now() - interval '40 minutes',
      24,
      14,
      'on',
      'Bring a white and a dark shirt — we split teams at kickoff. Park in the main lot off Brogden Ave.',
      v_tz,
      'DmPkLive'
    ),
    (
      v_ev_next,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_next_day + time '18:30') at time zone v_tz,
      13,
      12,
      'on',
      'Session is full — join the waitlist and we will move you up if a spot opens.',
      v_tz,
      'DmPkNxWk'
    ),
    (
      v_ev_tent,
      v_org_id,
      v_sched_skills,
      v_loc_park,
      (v_ev_tent_day + time '10:00') at time zone v_tz,
      20,
      10,
      'tentative',
      '',
      v_tz,
      'DmPkTnWk'
    ),
    (
      v_ev_cancel,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_cancel_day + time '18:30') at time zone v_tz,
      24,
      14,
      'cancelled',
      'Field closed for maintenance — see you at the next session.',
      v_tz,
      'DmPkCncl'
    ),
    (
      v_ev_online,
      v_org_id,
      v_sched_volunteers,
      v_loc_zoom,
      (v_ev_online_day + time '19:00') at time zone v_tz,
      16,
      8,
      'tentative',
      'Monthly sync for organizers and regulars. Link goes live 10 min before.',
      v_tz,
      'DmPkZomm'
    ),
    (
      v_ev_past1,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_past1_day + time '18:30') at time zone v_tz,
      24,
      14,
      'on',
      '',
      v_tz,
      'DmPkPs01'
    ),
    (
      v_ev_past2,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_past2_day + time '18:30') at time zone v_tz,
      24,
      14,
      'on',
      '',
      v_tz,
      'DmPkPs02'
    ),
    (
      v_ev_past3,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_past3_day + time '18:30') at time zone v_tz,
      24,
      14,
      'on',
      '',
      v_tz,
      'DmPkPs03'
    ),
    (
      v_ev_past4,
      v_org_id,
      v_sched_skills,
      v_loc_park,
      (v_ev_past4_day + time '10:00') at time zone v_tz,
      20,
      10,
      'on',
      '',
      v_tz,
      'DmPkPs04'
    );

  insert into public.participants (id, org_id, phone, first_name, last_name, display_name)
  values
    (p_marcus, v_org_id, '5550100101', 'Marcus', 'Webb', 'Marcus'),
    (p_diego, v_org_id, '5550100102', 'Diego', 'Silva', 'Diego'),
    (p_jen, v_org_id, '5550100103', 'Jen', 'Park', 'Jen'),
    (p_tyler, v_org_id, '5550100104', 'Tyler', 'Brooks', 'Tyler'),
    (p_sofia, v_org_id, '5550100105', 'Sofia', 'Reyes', 'Sofia'),
    (p_chris, v_org_id, '5550100106', 'Chris', 'OBrien', 'Chris'),
    (p_amir, v_org_id, '5550100107', 'Amir', 'Hassan', 'Amir'),
    (p_elena, v_org_id, '5550100108', 'Elena', 'Voss', 'Elena'),
    (p_jordan, v_org_id, '5550100109', 'Jordan', 'Kim', 'JK'),
    (p_pat, v_org_id, '5550100110', 'Pat', 'Nolan', 'Pat'),
    (p_maya, v_org_id, '5550100111', 'Maya', 'Chen', 'Maya'),
    (p_leo, v_org_id, '5550100112', 'Leo', 'Santos', 'Leo'),
    (p_rachel, v_org_id, '5550100113', 'Rachel', 'Green', 'Rach'),
    (p_ben, v_org_id, '5550100114', 'Ben', 'Carter', 'Ben');

  -- Live session roster (varied arrival statuses + guests)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  values
    (v_org_id, v_ev_live, p_marcus, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_diego, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_jen, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_tyler, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_sofia, 1, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_chris, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_amir, 0, 'on_my_way', 'confirmed'),
    (v_org_id, v_ev_live, p_elena, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_jordan, 2, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_pat, 0, 'running_late', 'confirmed'),
    (v_org_id, v_ev_live, p_maya, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_leo, 0, 'in_traffic', 'confirmed'),
    (v_org_id, v_ev_live, p_rachel, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_ben, 0, 'maybe', 'confirmed');

  -- Next session: full roster (13 headcount) + waitlist
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  values
    (v_org_id, v_ev_next, p_marcus, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_diego, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_jen, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_tyler, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_sofia, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_chris, 1, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_elena, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_jordan, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_rachel, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_amir, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_pat, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_leo, 0, 'confirmed', 'waitlisted'),
    (v_org_id, v_ev_next, p_ben, 0, 'confirmed', 'waitlisted');

  -- Tentative session (below minimum — shows tentative status)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  values
    (v_org_id, v_ev_tent, p_marcus, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_diego, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_jen, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_tyler, 0, 'maybe', 'confirmed'),
    (v_org_id, v_ev_tent, p_ben, 0, 'confirmed', 'confirmed');

  -- Online backup session
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  values
    (v_org_id, v_ev_online, p_marcus, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_online, p_jen, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_online, p_chris, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_online, p_elena, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_online, p_rachel, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_online, p_ben, 0, 'confirmed', 'confirmed');

  -- Past sessions (leaderboard caps + weekly streaks)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past1, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_amir), (p_elena), (p_jordan), (p_maya), (p_rachel)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past2, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_elena), (p_jordan), (p_pat), (p_maya)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past3, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_chris), (p_amir),
    (p_elena), (p_jordan), (p_leo), (p_rachel)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past4, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_sofia), (p_maya), (p_leo), (p_ben)
  ) as p(id);

  -- Signup activity for console analytics + returning-player detection
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  select
    s.org_id,
    s.event_id,
    s.participant_id,
    'joined',
    case
      when s.event_id in (v_ev_past1, v_ev_past2, v_ev_past3, v_ev_past4)
        then e.starts_at - interval '1 day'
      when s.event_id = v_ev_live
        then now() - interval '2 days'
      when s.event_id = v_ev_next and s.list_status = 'waitlisted'
        then now() - interval '6 hours'
      when s.event_id = v_ev_next
        then now() - interval '18 hours'
      else now() - interval '3 days'
    end
  from public.signups s
  join public.events e on e.id = s.event_id
  where s.org_id = v_org_id;

  -- Maya RSVP'd then left the next session (not on roster; shows in unregistered analytics)
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  values
    (v_org_id, v_ev_next, p_maya, 'joined', now() - interval '5 days'),
    (v_org_id, v_ev_next, p_maya, 'left', now() - interval '2 days');

  -- Tyler left and rejoined (returning churn on the current roster)
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  values
    (v_org_id, v_ev_next, p_tyler, 'left', now() - interval '3 days');

  -- Page views for the live session console stats
  insert into public.event_page_views (org_id, event_id, viewer_key, viewed_at)
  select
    v_org_id,
    v_ev_live,
    'demo-viewer-' || g::text,
    now() - (g || ' hours')::interval
  from generate_series(1, 12) as g;
end;
$$;
