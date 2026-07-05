-- Refresh demo org (slug: demo) — schema-current through 046.
-- Re-run safe: deletes and recreates ONLY the demo org (cascades all child rows).
-- Paste this entire file into the Supabase SQL Editor whenever you want fresh relative dates.
--
-- Console access: grants owner to emanuallan@gmail.com when that auth user exists.

do $$
declare
  v_operator_id constant uuid := '23f1a201-aafe-4fd6-826d-3f753f092d33';
  v_operator_exists boolean;

  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_loc_park uuid := 'a0000000-0000-4000-8000-000000000002';
  v_loc_turf uuid := 'a0000000-0000-4000-8000-000000000003';
  v_loc_zoom uuid := 'a0000000-0000-4000-8000-000000000004';
  v_sched_pickup uuid := 'a0000000-0000-4000-8000-000000000005';
  v_sched_skills uuid := 'a0000000-0000-4000-8000-000000000006';
  v_sched_volunteers uuid := 'a0000000-0000-4000-8000-000000000007';
  v_sched_beginners uuid := 'a0000000-0000-4000-8000-000000000008';
  v_tz text := 'America/Chicago';

  v_ev_live uuid := 'b0000000-0000-4000-8000-000000000001';
  v_ev_next uuid := 'b0000000-0000-4000-8000-000000000002';
  v_ev_up2 uuid := 'b0000000-0000-4000-8000-000000000003';
  v_ev_cancel uuid := 'b0000000-0000-4000-8000-000000000004';
  v_ev_tent uuid := 'b0000000-0000-4000-8000-000000000005';
  v_ev_online uuid := 'b0000000-0000-4000-8000-000000000006';
  v_ev_oneoff uuid := 'b0000000-0000-4000-8000-000000000007';
  v_ev_past1 uuid := 'b0000000-0000-4000-8000-000000000011';
  v_ev_past2 uuid := 'b0000000-0000-4000-8000-000000000012';
  v_ev_past3 uuid := 'b0000000-0000-4000-8000-000000000013';
  v_ev_past4 uuid := 'b0000000-0000-4000-8000-000000000014';
  v_ev_past5 uuid := 'b0000000-0000-4000-8000-000000000015';
  v_ev_past6 uuid := 'b0000000-0000-4000-8000-000000000016';
  v_ev_past7 uuid := 'b0000000-0000-4000-8000-000000000017';
  v_ev_past8 uuid := 'b0000000-0000-4000-8000-000000000018';
  v_ev_past9 uuid := 'b0000000-0000-4000-8000-000000000019';
  v_ev_past10 uuid := 'b0000000-0000-4000-8000-00000000001a';
  v_ev_past_sk1 uuid := 'b0000000-0000-4000-8000-000000000021';
  v_ev_past_sk2 uuid := 'b0000000-0000-4000-8000-000000000022';
  v_ev_past_sk3 uuid := 'b0000000-0000-4000-8000-000000000023';

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
  p_nick uuid := 'c0000000-0000-4000-8000-00000000000f';
  p_sara uuid := 'c0000000-0000-4000-8000-000000000010';
  p_omar uuid := 'c0000000-0000-4000-8000-000000000011';
  p_kate uuid := 'c0000000-0000-4000-8000-000000000012';
  p_luis uuid := 'c0000000-0000-4000-8000-000000000013';
  p_hannah uuid := 'c0000000-0000-4000-8000-000000000014';
  p_james uuid := 'c0000000-0000-4000-8000-000000000015';
  p_aisha uuid := 'c0000000-0000-4000-8000-000000000016';
  p_connor uuid := 'c0000000-0000-4000-8000-000000000017';
  p_zoe uuid := 'c0000000-0000-4000-8000-000000000018';
  p_miguel uuid := 'c0000000-0000-4000-8000-000000000019';
  p_lily uuid := 'c0000000-0000-4000-8000-00000000001a';
  p_alex uuid := 'c0000000-0000-4000-8000-00000000001b';
  p_nora uuid := 'c0000000-0000-4000-8000-00000000001c';

  v_today date;
  v_pickup_days int[] := array[2, 4]; -- Tue / Thu
  v_ev_next_day date;
  v_ev_up2_day date;
  v_ev_cancel_day date;
  v_ev_tent_day date;
  v_ev_online_day date;
  v_ev_oneoff_day date;
  v_ev_past1_day date;
  v_ev_past2_day date;
  v_ev_past3_day date;
  v_ev_past4_day date;
  v_ev_past5_day date;
  v_ev_past6_day date;
  v_ev_past7_day date;
  v_ev_past8_day date;
  v_ev_past9_day date;
  v_ev_past10_day date;
  v_ev_past_sk1_day date;
  v_ev_past_sk2_day date;
  v_ev_past_sk3_day date;
begin
  select exists(select 1 from auth.users where id = v_operator_id) into v_operator_exists;

  v_today := (now() at time zone v_tz)::date;

  select v_today + 4 + min((d - extract(dow from v_today + 4)::int + 7) % 7)::int
  into v_ev_next_day
  from unnest(v_pickup_days) as d;

  v_ev_up2_day := v_ev_next_day + 7;
  v_ev_cancel_day := v_ev_next_day + 14;
  v_ev_past1_day := v_ev_next_day - 7;
  v_ev_past2_day := v_ev_next_day - 14;
  v_ev_past3_day := v_ev_next_day - 21;
  v_ev_past4_day := v_ev_next_day - 28;
  v_ev_past5_day := v_ev_next_day - 35;
  v_ev_past6_day := v_ev_next_day - 42;
  v_ev_past7_day := v_ev_next_day - 49;
  v_ev_past8_day := v_ev_next_day - 56;
  v_ev_past9_day := v_ev_next_day - 63;
  v_ev_past10_day := v_ev_next_day - 70;

  select v_today + 11 + ((6 - extract(dow from v_today + 11)::int + 7) % 7)::int
  into v_ev_tent_day;

  select v_today + 8 + ((3 - extract(dow from v_today + 8)::int + 7) % 7)::int
  into v_ev_online_day;

  v_ev_oneoff_day := v_ev_next_day + 3;
  v_ev_past_sk1_day := v_ev_tent_day - 7;
  v_ev_past_sk2_day := v_ev_tent_day - 14;
  v_ev_past_sk3_day := v_ev_tent_day - 21;

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
        'returning_signup_modal', true,
        'public_roster', true,
        'guest_signups', true
      ),
      'waitlist', jsonb_build_object(
        'promotion_mode', 'strict_fifo'
      )
    ),
    case when v_operator_exists then v_operator_id else null end
  );

  if v_operator_exists then
    insert into public.org_members (org_id, user_id, role)
    values (v_org_id, v_operator_id, 'owner')
    on conflict (org_id, user_id) do update set role = 'owner';
  end if;

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
      v_loc_turf,
      v_org_id,
      'East Nashville Indoor Turf',
      '1200 Davidson St, Nashville, TN 37206',
      'https://maps.google.com/?q=East+Nashville+Indoor+Turf',
      36.1772,
      -86.7501,
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
    capacity, min_players, timezone, interval_weeks, additional_information
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
      1,
      'Bring a light and dark shirt. Cleats recommended on grass.'
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
      1,
      'Small-sided games — all levels welcome.'
    ),
    (
      v_sched_beginners,
      v_org_id,
      v_loc_turf,
      'Beginners Clinic',
      array[0],
      '17:00',
      60,
      16,
      8,
      v_tz,
      2,
      'No experience needed. We provide cones and bibs.'
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
      1,
      ''
    );

  insert into public.events (
    id, org_id, schedule_id, location_id, starts_at, capacity, min_players,
    status, announcement, additional_information, timezone, short_id, title, duration_min
  )
  values
    (
      v_ev_live,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      now() - interval '35 minutes',
      24,
      14,
      'on',
      'Bring a white and a dark shirt — we split teams at kickoff. Park in the main lot off Brogden Ave.',
      'Field 3 by the river — look for the flag.',
      v_tz,
      'DmPkLive',
      null,
      null
    ),
    (
      v_ev_next,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_next_day + time '18:30') at time zone v_tz,
      24,
      14,
      'on',
      'Lights are on — field 3 by the river. Casual pace, all levels welcome.',
      'Park in the main lot off Brogden Ave.',
      v_tz,
      'DmPkNxWk',
      null,
      null
    ),
    (
      v_ev_up2,
      v_org_id,
      v_sched_pickup,
      v_loc_park,
      (v_ev_up2_day + time '18:30') at time zone v_tz,
      24,
      14,
      'on',
      '',
      '',
      v_tz,
      'DmPkUp02',
      null,
      null
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
      '',
      v_tz,
      'DmPkCncl',
      null,
      null
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
      'Need a few more yeses before we confirm — great for touches and small-sided games.',
      '',
      v_tz,
      'DmPkTnWk',
      null,
      null
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
      '',
      v_tz,
      'DmPkZomm',
      null,
      null
    ),
    (
      v_ev_oneoff,
      v_org_id,
      null,
      v_loc_turf,
      (v_ev_oneoff_day + time '19:00') at time zone v_tz,
      30,
      16,
      'on',
      'Friday night 7v7 under the lights — invite a friend. Indoor cleats or flats.',
      'Indoor cleats or flats only. No studs.',
      v_tz,
      'DmPk7v7',
      'Friday Night 7v7',
      90
    ),
    (
      v_ev_past1, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past1_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs01', null, null
    ),
    (
      v_ev_past2, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past2_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs02', null, null
    ),
    (
      v_ev_past3, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past3_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs03', null, null
    ),
    (
      v_ev_past4, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past4_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs04', null, null
    ),
    (
      v_ev_past5, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past5_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs05', null, null
    ),
    (
      v_ev_past6, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past6_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs06', null, null
    ),
    (
      v_ev_past7, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past7_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs07', null, null
    ),
    (
      v_ev_past8, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past8_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs08', null, null
    ),
    (
      v_ev_past9, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past9_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs09', null, null
    ),
    (
      v_ev_past10, v_org_id, v_sched_pickup, v_loc_park, (v_ev_past10_day + time '18:30') at time zone v_tz, 24, 14, 'on', '', '', v_tz, 'DmPkPs10', null, null
    ),
    (
      v_ev_past_sk1, v_org_id, v_sched_skills, v_loc_park, (v_ev_past_sk1_day + time '10:00') at time zone v_tz, 20, 10, 'on', '', '', v_tz, 'DmSkPs01', null, null
    ),
    (
      v_ev_past_sk2, v_org_id, v_sched_skills, v_loc_park, (v_ev_past_sk2_day + time '10:00') at time zone v_tz, 20, 10, 'on', '', '', v_tz, 'DmSkPs02', null, null
    ),
    (
      v_ev_past_sk3, v_org_id, v_sched_skills, v_loc_park, (v_ev_past_sk3_day + time '10:00') at time zone v_tz, 20, 10, 'on', '', '', v_tz, 'DmSkPs03', null, null
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
    (p_ben, v_org_id, '5550100114', 'Ben', 'Carter', 'Ben'),
    (p_nick, v_org_id, '5550100115', 'Nick', 'Foster', 'Nick'),
    (p_sara, v_org_id, '5550100116', 'Sara', 'Mitchell', 'Sara'),
    (p_omar, v_org_id, '5550100117', 'Omar', 'Farouk', 'Omar'),
    (p_kate, v_org_id, '5550100118', 'Kate', 'Lindsey', 'Kate'),
    (p_luis, v_org_id, '5550100119', 'Luis', 'Morales', 'Luis'),
    (p_hannah, v_org_id, '5550100120', 'Hannah', 'Wright', 'Hannah'),
    (p_james, v_org_id, '5550100121', 'James', 'Porter', 'James'),
    (p_aisha, v_org_id, '5550100122', 'Aisha', 'Khan', 'Aisha'),
    (p_connor, v_org_id, '5550100123', 'Connor', 'Hayes', 'Connor'),
    (p_zoe, v_org_id, '5550100124', 'Zoe', 'Barnes', 'Zoe'),
    (p_miguel, v_org_id, '5550100125', 'Miguel', 'Torres', 'Miguel'),
    (p_lily, v_org_id, '5550100126', 'Lily', 'Nguyen', 'Lily'),
    (p_alex, v_org_id, '5550100127', 'Alex', 'Rivera', 'Alex'),
    (p_nora, v_org_id, '5550100128', 'Nora', 'Bell', 'Nora');

  -- Live session: busy roster with varied arrival statuses
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
    (v_org_id, v_ev_live, p_ben, 0, 'maybe', 'confirmed'),
    (v_org_id, v_ev_live, p_nick, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_sara, 1, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_omar, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_kate, 0, 'on_my_way', 'confirmed'),
    (v_org_id, v_ev_live, p_luis, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_live, p_hannah, 0, 'confirmed', 'confirmed');

  -- Next pickup: healthy headcount, room to grow (not waitlist-focused)
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
    (v_org_id, v_ev_next, p_nick, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_sara, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_omar, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_kate, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_luis, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_next, p_hannah, 0, 'maybe', 'confirmed'),
    (v_org_id, v_ev_next, p_james, 0, 'confirmed', 'confirmed');

  -- Week after next
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_up2, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_elena), (p_jordan), (p_maya), (p_leo), (p_nick), (p_sara)
  ) as p(id);

  -- One-off 7v7
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_oneoff, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_amir), (p_elena), (p_jordan), (p_maya), (p_leo), (p_rachel),
    (p_ben), (p_nick), (p_omar), (p_kate), (p_luis), (p_connor), (p_zoe)
  ) as p(id);

  -- Tentative skills (below minimum)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  values
    (v_org_id, v_ev_tent, p_marcus, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_diego, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_jen, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_tyler, 0, 'maybe', 'confirmed'),
    (v_org_id, v_ev_tent, p_ben, 0, 'confirmed', 'confirmed'),
    (v_org_id, v_ev_tent, p_lily, 0, 'confirmed', 'confirmed');

  -- Online volunteers sync
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_online, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_jen), (p_chris), (p_elena), (p_rachel), (p_ben),
    (p_hannah), (p_james), (p_aisha)
  ) as p(id);

  -- Past pickup sessions (leaderboard depth — core regulars attend most weeks)
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, ev.id, p.id, 0, 'confirmed', 'confirmed'
  from (
    values
      (v_ev_past1), (v_ev_past2), (v_ev_past3), (v_ev_past4),
      (v_ev_past5), (v_ev_past6), (v_ev_past7), (v_ev_past8)
  ) as ev(id)
  cross join (
    values
      (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
      (p_amir), (p_elena), (p_jordan), (p_maya), (p_rachel), (p_nick),
      (p_sara), (p_omar)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past9, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_chris), (p_amir),
    (p_elena), (p_jordan), (p_leo), (p_rachel), (p_pat), (p_ben)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past10, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_chris),
    (p_elena), (p_jordan), (p_maya), (p_leo), (p_kate), (p_luis)
  ) as p(id);

  -- Past skills sessions
  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past_sk1, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_sofia), (p_maya), (p_leo), (p_ben), (p_lily), (p_alex)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past_sk2, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_tyler), (p_sofia), (p_maya), (p_leo), (p_nora)
  ) as p(id);

  insert into public.signups (org_id, event_id, participant_id, guest_count, arrival_status, list_status)
  select v_org_id, v_ev_past_sk3, p.id, 0, 'confirmed', 'confirmed'
  from (values
    (p_marcus), (p_diego), (p_jen), (p_ben), (p_lily), (p_alex), (p_zoe)
  ) as p(id);

  -- Signup activity for console analytics + returning-player detection
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  select
    s.org_id,
    s.event_id,
    s.participant_id,
    'joined',
    case
      when e.starts_at < now() - interval '1 day'
        then e.starts_at - interval '1 day'
      when s.event_id = v_ev_live
        then now() - interval '2 days'
      when s.event_id = v_ev_next
        then now() - interval '18 hours'
      when s.event_id = v_ev_oneoff
        then now() - interval '3 days'
      else now() - interval '4 days'
    end
  from public.signups s
  join public.events e on e.id = s.event_id
  where s.org_id = v_org_id;

  -- Maya RSVP'd then left the next session (unregistered analytics)
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  values
    (v_org_id, v_ev_next, p_maya, 'joined', now() - interval '5 days'),
    (v_org_id, v_ev_next, p_maya, 'left', now() - interval '2 days');

  -- Connor joined one-off then left
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  values
    (v_org_id, v_ev_oneoff, p_connor, 'joined', now() - interval '4 days'),
    (v_org_id, v_ev_oneoff, p_connor, 'left', now() - interval '1 day');

  -- Tyler churn on next session
  insert into public.event_signup_activity (org_id, event_id, participant_id, action, created_at)
  values
    (v_org_id, v_ev_next, p_tyler, 'left', now() - interval '3 days');

  -- Page views for live session + next session (known participants + guests for unique-visitor analytics)
  insert into public.event_page_views (org_id, event_id, viewer_key, participant_id, viewed_at)
  values
    -- Live: 8 known participants on two devices each (deduped to 8 people)
    (v_org_id, v_ev_live, 'demo-marcus-mobile', p_marcus, now() - interval '4 hours'),
    (v_org_id, v_ev_live, 'demo-marcus-desktop', p_marcus, now() - interval '2 hours'),
    (v_org_id, v_ev_live, 'demo-jen-phone', p_jen, now() - interval '5 hours'),
    (v_org_id, v_ev_live, 'demo-jen-tablet', p_jen, now() - interval '1 hour'),
    (v_org_id, v_ev_live, 'demo-diego-mobile', p_diego, now() - interval '6 hours'),
    (v_org_id, v_ev_live, 'demo-diego-laptop', p_diego, now() - interval '3 hours'),
    (v_org_id, v_ev_live, 'demo-sofia-mobile', p_sofia, now() - interval '7 hours'),
    (v_org_id, v_ev_live, 'demo-sofia-desktop', p_sofia, now() - interval '90 minutes'),
    (v_org_id, v_ev_live, 'demo-elena-mobile', p_elena, now() - interval '8 hours'),
    (v_org_id, v_ev_live, 'demo-elena-tablet', p_elena, now() - interval '45 minutes'),
    (v_org_id, v_ev_live, 'demo-jordan-phone', p_jordan, now() - interval '5 hours'),
    (v_org_id, v_ev_live, 'demo-jordan-desktop', p_jordan, now() - interval '2 hours'),
    (v_org_id, v_ev_live, 'demo-chris-mobile', p_chris, now() - interval '4 hours'),
    (v_org_id, v_ev_live, 'demo-chris-laptop', p_chris, now() - interval '30 minutes'),
    (v_org_id, v_ev_live, 'demo-amir-phone', p_amir, now() - interval '3 hours'),
    (v_org_id, v_ev_live, 'demo-amir-tablet', p_amir, now() - interval '1 hour'),
    -- Live: anonymous guests
    (v_org_id, v_ev_live, 'demo-guest-live-01', null, now() - interval '9 hours'),
    (v_org_id, v_ev_live, 'demo-guest-live-02', null, now() - interval '8 hours'),
    (v_org_id, v_ev_live, 'demo-guest-live-03', null, now() - interval '6 hours'),
    (v_org_id, v_ev_live, 'demo-guest-live-04', null, now() - interval '4 hours'),
    (v_org_id, v_ev_live, 'demo-guest-live-05', null, now() - interval '2 hours'),
    (v_org_id, v_ev_live, 'demo-guest-live-06', null, now() - interval '1 hour'),
    -- Next: 5 known participants + 4 guests
    (v_org_id, v_ev_next, 'demo-marcus-next', p_marcus, now() - interval '20 hours'),
    (v_org_id, v_ev_next, 'demo-jen-next', p_jen, now() - interval '18 hours'),
    (v_org_id, v_ev_next, 'demo-diego-next', p_diego, now() - interval '16 hours'),
    (v_org_id, v_ev_next, 'demo-sofia-next-mobile', p_sofia, now() - interval '14 hours'),
    (v_org_id, v_ev_next, 'demo-sofia-next-desktop', p_sofia, now() - interval '12 hours'),
    (v_org_id, v_ev_next, 'demo-tyler-next', p_tyler, now() - interval '10 hours'),
    (v_org_id, v_ev_next, 'demo-elena-next', p_elena, now() - interval '8 hours'),
    (v_org_id, v_ev_next, 'demo-guest-next-01', null, now() - interval '22 hours'),
    (v_org_id, v_ev_next, 'demo-guest-next-02', null, now() - interval '16 hours'),
    (v_org_id, v_ev_next, 'demo-guest-next-03', null, now() - interval '10 hours'),
    (v_org_id, v_ev_next, 'demo-guest-next-04', null, now() - interval '4 hours');
end;
$$;
