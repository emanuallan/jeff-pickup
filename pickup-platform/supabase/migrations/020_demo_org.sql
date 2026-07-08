-- Demo org (slug: demo) — soccer pickup showcase with relative dates so it stays fresh.
-- Re-run safe: deletes and recreates the demo org (cascades all child rows).

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
begin
  delete from public.orgs where slug = 'demo';

  insert into public.orgs (id, slug, name, activity, status, branding, created_by)
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
      'Tue / Thu Evening Pickup',
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
      'Saturday Skills & Scrimmage',
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

  -- Events (timestamps relative to now so the demo never goes stale)
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
      ((current_date + 4) + time '18:30') at time zone v_tz,
      24,
      14,
      'on',
      'Goalkeeper rotation every 15 minutes. RSVP so we know how many subs to expect.',
      v_tz,
      'DmPkNxWk'
    ),
    (
      v_ev_tent,
      v_org_id,
      v_sched_skills,
      v_loc_park,
      ((current_date + 11) + time '10:00') at time zone v_tz,
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
      ((current_date + 6) + time '18:30') at time zone v_tz,
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
      ((current_date + 8) + time '19:00') at time zone v_tz,
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
      ((current_date - 7) + time '18:30') at time zone v_tz,
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
      ((current_date - 14) + time '18:30') at time zone v_tz,
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
      ((current_date - 21) + time '18:30') at time zone v_tz,
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
      ((current_date - 28) + time '10:00') at time zone v_tz,
      20,
      10,
      'on',
      '',
      v_tz,
      'DmPkPs04'
    );

  insert into public.participants (id, org_id, phone, first_name, last_name, display_name)
  values
    (p_marcus, v_org_id, '12025550101', 'Marcus', 'Webb', 'Marcus'),
    (p_diego, v_org_id, '12025550102', 'Diego', 'Silva', 'Diego'),
    (p_jen, v_org_id, '12025550103', 'Jen', 'Park', 'Jen'),
    (p_tyler, v_org_id, '12025550104', 'Tyler', 'Brooks', 'Tyler'),
    (p_sofia, v_org_id, '12025550105', 'Sofia', 'Reyes', 'Sofia'),
    (p_chris, v_org_id, '12025550106', 'Chris', 'OBrien', 'Chris'),
    (p_amir, v_org_id, '12025550107', 'Amir', 'Hassan', 'Amir'),
    (p_elena, v_org_id, '12025550108', 'Elena', 'Voss', 'Elena'),
    (p_jordan, v_org_id, '12025550109', 'Jordan', 'Kim', 'JK'),
    (p_pat, v_org_id, '12025550110', 'Pat', 'Nolan', 'Pat'),
    (p_maya, v_org_id, '12025550111', 'Maya', 'Chen', 'Maya'),
    (p_leo, v_org_id, '12025550112', 'Leo', 'Santos', 'Leo'),
    (p_rachel, v_org_id, '12025550113', 'Rachel', 'Green', 'Rach'),
    (p_ben, v_org_id, '12025550114', 'Ben', 'Carter', 'Ben');

  -- Live session roster (varied arrival statuses + guests)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  values
    (v_org_id, v_ev_live, p_marcus, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_diego, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_jen, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_tyler, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_sofia, 1, 'confirmed'),
    (v_org_id, v_ev_live, p_chris, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_amir, 0, 'on_my_way'),
    (v_org_id, v_ev_live, p_elena, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_jordan, 2, 'confirmed'),
    (v_org_id, v_ev_live, p_pat, 0, 'running_late'),
    (v_org_id, v_ev_live, p_maya, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_leo, 0, 'in_traffic'),
    (v_org_id, v_ev_live, p_rachel, 0, 'confirmed'),
    (v_org_id, v_ev_live, p_ben, 0, 'maybe');

  -- Next week session (solid turnout, mostly confirmed)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  values
    (v_org_id, v_ev_next, p_marcus, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_diego, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_jen, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_tyler, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_sofia, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_chris, 1, 'confirmed'),
    (v_org_id, v_ev_next, p_elena, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_jordan, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_maya, 0, 'confirmed'),
    (v_org_id, v_ev_next, p_rachel, 0, 'confirmed');

  -- Tentative session (below minimum — shows tentative status)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  values
    (v_org_id, v_ev_tent, p_marcus, 0, 'confirmed'),
    (v_org_id, v_ev_tent, p_diego, 0, 'confirmed'),
    (v_org_id, v_ev_tent, p_jen, 0, 'confirmed'),
    (v_org_id, v_ev_tent, p_tyler, 0, 'maybe'),
    (v_org_id, v_ev_tent, p_ben, 0, 'confirmed');

  -- Online backup session
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  values
    (v_org_id, v_ev_online, p_marcus, 0, 'confirmed'),
    (v_org_id, v_ev_online, p_jen, 0, 'confirmed'),
    (v_org_id, v_ev_online, p_chris, 0, 'confirmed'),
    (v_org_id, v_ev_online, p_elena, 0, 'confirmed'),
    (v_org_id, v_ev_online, p_rachel, 0, 'confirmed'),
    (v_org_id, v_ev_online, p_ben, 0, 'confirmed');

  -- Past sessions (leaderboard caps + weekly streaks)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  select v_org_id, v_ev_past1, p.id, 0, 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_amir), (p_elena), (p_jordan), (p_maya), (p_rachel)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  select v_org_id, v_ev_past2, p.id, 0, 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_elena), (p_jordan), (p_pat), (p_maya)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  select v_org_id, v_ev_past3, p.id, 0, 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_chris), (p_amir),
    (p_elena), (p_jordan), (p_leo), (p_rachel)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status)
  select v_org_id, v_ev_past4, p.id, 0, 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_sofia), (p_maya), (p_leo), (p_ben)
  ) as p(id);
end;
$$;
