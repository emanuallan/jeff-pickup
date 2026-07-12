-- Post-session debrief: MVP voting, player stats, extended feedback wizard

-- ---------------------------------------------------------------------------
-- Feature defaults
-- ---------------------------------------------------------------------------

update public.orgs
set settings = jsonb_set(
  settings,
  '{features,session_mvp_voting}',
  coalesce(settings->'features'->'session_mvp_voting', 'true'::jsonb),
  true
);

update public.orgs
set settings = jsonb_set(
  settings,
  '{features,session_player_stats}',
  coalesce(settings->'features'->'session_player_stats', 'false'::jsonb),
  true
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.session_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  voter_participant_id uuid not null references public.participants(id) on delete cascade,
  nominee_participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, voter_participant_id),
  check (voter_participant_id <> nominee_participant_id)
);

create index session_mvp_votes_event_id_idx on public.session_mvp_votes (event_id);

create table public.session_mvp_finalizations (
  event_id uuid primary key references public.events(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  finalized_at timestamptz not null default now(),
  total_votes int not null default 0
);

create table public.session_mvp_awards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  vote_count int not null default 0,
  finalized_at timestamptz not null default now(),
  badge_expires_at timestamptz not null,
  unique (event_id, participant_id)
);

create index session_mvp_awards_org_badge_idx
  on public.session_mvp_awards (org_id, badge_expires_at desc);

create index session_mvp_awards_participant_idx
  on public.session_mvp_awards (participant_id, badge_expires_at desc);

create table public.session_player_stats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  goals smallint not null default 0 check (goals >= 0 and goals <= 99),
  assists smallint not null default 0 check (assists >= 0 and assists <= 99),
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create index session_player_stats_event_id_idx on public.session_player_stats (event_id);

create table public.session_debrief_skips (
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  step text not null check (step in ('mvp', 'stats', 'feedback')),
  created_at timestamptz not null default now(),
  primary key (event_id, participant_id, step)
);

alter table public.session_mvp_votes enable row level security;
alter table public.session_mvp_finalizations enable row level security;
alter table public.session_mvp_awards enable row level security;
alter table public.session_player_stats enable row level security;
alter table public.session_debrief_skips enable row level security;

create policy "Org members can view session mvp votes"
  on public.session_mvp_votes for select to authenticated
  using (public.is_org_member(org_id));

create policy "Org members can view session mvp finalizations"
  on public.session_mvp_finalizations for select to authenticated
  using (public.is_org_member(org_id));

create policy "Org members can view session mvp awards"
  on public.session_mvp_awards for select to authenticated
  using (public.is_org_member(org_id));

create policy "Org members can view session player stats"
  on public.session_player_stats for select to authenticated
  using (public.is_org_member(org_id));

grant select on public.session_mvp_votes to authenticated;
grant select on public.session_mvp_finalizations to authenticated;
grant select on public.session_mvp_awards to authenticated;
grant select on public.session_player_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Feature helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_session_mvp_voting_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (o.settings->'features'->>'session_mvp_voting')::boolean from public.orgs o where o.id = p_org_id),
    true
  );
$$;

create or replace function public.org_session_player_stats_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (o.settings->'features'->>'session_player_stats')::boolean from public.orgs o where o.id = p_org_id),
    false
  );
$$;

create or replace function public.participant_roster_display_name(p_participant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'Player'
  )
  from public.participants p
  where p.id = p_participant_id;
$$;

create or replace function public.session_mvp_voting_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.event_ends_at(p_event_id) > now() - interval '6 hours'
    and public.event_ends_at(p_event_id) <= now();
$$;

create or replace function public.next_org_event_ends_at(
  p_org_id uuid,
  p_after_starts_at timestamptz
)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select public.event_ends_at(e.id)
  from public.events e
  where e.org_id = p_org_id
    and e.status <> 'cancelled'
    and e.starts_at > p_after_starts_at
  order by e.starts_at asc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Debrief step completion
-- ---------------------------------------------------------------------------

create or replace function public.session_mvp_step_complete(
  p_event_id uuid,
  p_participant_id uuid,
  p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.org_session_mvp_voting_enabled(p_org_id) then true
    when exists (
      select 1 from public.session_mvp_votes v
      where v.event_id = p_event_id and v.voter_participant_id = p_participant_id
    ) then true
    when exists (
      select 1 from public.session_debrief_skips s
      where s.event_id = p_event_id and s.participant_id = p_participant_id and s.step = 'mvp'
    ) then true
    when not public.session_mvp_voting_open(p_event_id) then true
    else false
  end;
$$;

create or replace function public.session_stats_step_complete(
  p_event_id uuid,
  p_participant_id uuid,
  p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.org_session_player_stats_enabled(p_org_id) then true
    when exists (
      select 1 from public.session_player_stats s
      where s.event_id = p_event_id and s.participant_id = p_participant_id
    ) then true
    when exists (
      select 1 from public.session_debrief_skips s
      where s.event_id = p_event_id and s.participant_id = p_participant_id and s.step = 'stats'
    ) then true
    else false
  end;
$$;

create or replace function public.session_feedback_step_complete(
  p_event_id uuid,
  p_participant_id uuid,
  p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.org_session_feedback_enabled(p_org_id) then true
    when exists (
      select 1 from public.session_feedback sf
      where sf.event_id = p_event_id and sf.participant_id = p_participant_id
    ) then true
    when exists (
      select 1 from public.session_debrief_skips s
      where s.event_id = p_event_id and s.participant_id = p_participant_id and s.step = 'feedback'
    ) then true
    else false
  end;
$$;

create or replace function public.session_debrief_complete(
  p_event_id uuid,
  p_participant_id uuid,
  p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.session_mvp_step_complete(p_event_id, p_participant_id, p_org_id)
    and public.session_stats_step_complete(p_event_id, p_participant_id, p_org_id)
    and public.session_feedback_step_complete(p_event_id, p_participant_id, p_org_id);
$$;

create or replace function public.try_dismiss_debrief_notification(
  p_event_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  if v_org_id is null then
    return;
  end if;

  if not public.session_debrief_complete(p_event_id, p_participant_id, v_org_id) then
    return;
  end if;

  perform public.dismiss_participant_feedback_notification(p_event_id, p_participant_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- MVP finalization
-- ---------------------------------------------------------------------------

create or replace function public.finalize_session_mvp_votes(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_starts_at timestamptz;
  v_badge_expires_at timestamptz;
  v_max_votes int := 0;
  v_total_votes int := 0;
  r record;
begin
  if exists (
    select 1 from public.session_mvp_finalizations f where f.event_id = p_event_id
  ) then
    return;
  end if;

  select e.org_id, e.starts_at
  into v_org_id, v_starts_at
  from public.events e
  where e.id = p_event_id;

  if v_org_id is null then
    return;
  end if;

  if not public.org_session_mvp_voting_enabled(v_org_id) then
    return;
  end if;

  if public.event_ends_at(p_event_id) > now() - interval '6 hours' then
    return;
  end if;

  select count(*)::int into v_total_votes
  from public.session_mvp_votes v
  where v.event_id = p_event_id;

  insert into public.session_mvp_finalizations (event_id, org_id, total_votes)
  values (p_event_id, v_org_id, v_total_votes);

  if v_total_votes = 0 then
    return;
  end if;

  select max(vote_count) into v_max_votes
  from (
    select count(*)::int as vote_count
    from public.session_mvp_votes v
    where v.event_id = p_event_id
    group by v.nominee_participant_id
  ) tallies;

  v_badge_expires_at := coalesce(
    public.next_org_event_ends_at(v_org_id, v_starts_at),
    public.event_ends_at(p_event_id) + interval '7 days'
  );

  for r in
    select v.nominee_participant_id, count(*)::int as vote_count
    from public.session_mvp_votes v
    where v.event_id = p_event_id
    group by v.nominee_participant_id
    having count(*) = v_max_votes
  loop
    insert into public.session_mvp_awards (
      org_id, event_id, participant_id, vote_count, badge_expires_at
    )
    values (
      v_org_id, p_event_id, r.nominee_participant_id, r.vote_count, v_badge_expires_at
    );
  end loop;
end;
$$;

create or replace function public.finalize_pending_session_mvp_votes(
  p_lookback_hours int default 48
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select e.id as event_id
    from public.events e
    where e.status <> 'cancelled'
      and public.event_ends_at(e.id) <= now() - interval '6 hours'
      and public.event_ends_at(e.id) > now() - make_interval(hours => greatest(1, least(p_lookback_hours, 336)))
      and public.org_session_mvp_voting_enabled(e.org_id)
      and not exists (
        select 1 from public.session_mvp_finalizations f where f.event_id = e.id
      )
  loop
    perform public.finalize_session_mvp_votes(r.event_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.get_active_session_mvp_badges(p_org_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      a.participant_id::text,
      jsonb_build_object(
        'event_label', public.participant_feedback_event_label(a.event_id),
        'event_id', a.event_id
      )
    ),
    '{}'::jsonb
  )
  from public.session_mvp_awards a
  where a.org_id = p_org_id
    and a.badge_expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Update materializer + inbox for debrief completion
-- ---------------------------------------------------------------------------

create or replace function public.materialize_session_feedback_notifications(
  p_lookback_hours int default 24
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  r record;
begin
  for r in
    select
      s.org_id,
      s.event_id,
      s.participant_id
    from public.signups s
    join public.events e on e.id = s.event_id
    where s.list_status = 'confirmed'
      and e.status <> 'cancelled'
      and public.event_ends_at(e.id) <= now()
      and public.event_ends_at(e.id) > now() - make_interval(hours => greatest(1, least(p_lookback_hours, 336)))
      and public.org_session_feedback_enabled(s.org_id)
      and not public.session_debrief_complete(s.event_id, s.participant_id, s.org_id)
      and not exists (
        select 1 from public.participant_notifications pn
        where pn.event_id = s.event_id
          and pn.participant_id = s.participant_id
          and pn.kind = 'session_feedback'
      )
  loop
    insert into public.participant_notifications (org_id, event_id, participant_id, kind, payload)
    values (
      r.org_id,
      r.event_id,
      r.participant_id,
      'session_feedback',
      public.participant_feedback_event_payload(r.event_id)
    )
    on conflict (event_id, participant_id, kind) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;

create or replace function public.get_participant_notification_inbox(
  p_session_token uuid,
  p_org_id uuid,
  p_limit int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_unread int;
begin
  v_participant_id := public.assert_participant_session_token(p_session_token, p_org_id);

  if not public.org_session_feedback_enabled(p_org_id) then
    return jsonb_build_object('unread_count', 0, 'notifications', '[]'::jsonb);
  end if;

  perform public.materialize_session_feedback_notifications(336);
  perform public.finalize_pending_session_mvp_votes(336);

  select count(*)::int into v_unread
  from public.participant_notifications n
  where n.participant_id = v_participant_id
    and n.org_id = p_org_id
    and n.kind = 'session_feedback'
    and public.event_ends_at(n.event_id) > now() - interval '14 days'
    and not public.session_debrief_complete(n.event_id, v_participant_id, p_org_id)
    and not exists (
      select 1 from public.participant_notification_dismissals d
      where d.notification_id = n.id and d.participant_id = v_participant_id
    )
    and not exists (
      select 1 from public.participant_notification_reads r
      where r.notification_id = n.id and r.participant_id = v_participant_id
    );

  return jsonb_build_object(
    'unread_count', coalesce(v_unread, 0),
    'notifications', coalesce((
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          n.id,
          n.org_id,
          n.event_id,
          n.kind,
          n.payload,
          n.created_at,
          r.read_at
        from public.participant_notifications n
        left join public.participant_notification_reads r
          on r.notification_id = n.id and r.participant_id = v_participant_id
        where n.participant_id = v_participant_id
          and n.org_id = p_org_id
          and n.kind = 'session_feedback'
          and public.event_ends_at(n.event_id) > now() - interval '14 days'
          and not public.session_debrief_complete(n.event_id, v_participant_id, p_org_id)
          and not exists (
            select 1 from public.participant_notification_dismissals d
            where d.notification_id = n.id and d.participant_id = v_participant_id
          )
        order by n.created_at desc
        limit greatest(1, least(p_limit, 100))
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Debrief RPCs
-- ---------------------------------------------------------------------------

create or replace function public.assert_session_debrief_eligible(
  p_event_id uuid,
  p_participant_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
begin
  select e.org_id, e.status
  into v_org_id, v_status
  from public.events e
  where e.id = p_event_id;

  if v_org_id is null then
    raise exception 'Session not found';
  end if;

  if v_status = 'cancelled' then
    raise exception 'This session was cancelled';
  end if;

  if public.event_ends_at(p_event_id) > now() then
    raise exception 'This session has not ended yet';
  end if;

  if public.event_ends_at(p_event_id) <= now() - interval '14 days' then
    raise exception 'Debrief window has closed';
  end if;

  if not public.org_session_feedback_enabled(v_org_id) then
    raise exception 'Session debrief is not enabled';
  end if;

  if not exists (
    select 1 from public.signups s
    where s.event_id = p_event_id
      and s.participant_id = p_participant_id
      and s.list_status = 'confirmed'
  )
  and not exists (
    select 1 from public.participant_notifications n
    where n.event_id = p_event_id
      and n.participant_id = p_participant_id
      and n.kind = 'session_feedback'
  ) then
    raise exception 'Not eligible for debrief';
  end if;

  return v_org_id;
end;
$$;

create or replace function public.get_session_debrief_state(
  p_session_token uuid,
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
  v_mvp_enabled boolean;
  v_stats_enabled boolean;
  v_feedback_enabled boolean;
  v_mvp_open boolean;
  v_mvp_vote uuid;
  v_mvp_skipped boolean;
  v_stats_skipped boolean;
  v_feedback_skipped boolean;
  v_feedback_submitted boolean;
  v_stats_submitted boolean;
  v_steps jsonb := '[]'::jsonb;
  v_initial_step text;
begin
  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  if v_org_id is null then
    raise exception 'Session not found';
  end if;

  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_debrief_eligible(p_event_id, v_participant_id);
  perform public.finalize_session_mvp_votes(p_event_id);

  v_mvp_enabled := public.org_session_mvp_voting_enabled(v_org_id);
  v_stats_enabled := public.org_session_player_stats_enabled(v_org_id);
  v_feedback_enabled := public.org_session_feedback_enabled(v_org_id);
  v_mvp_open := public.session_mvp_voting_open(p_event_id);

  select v.nominee_participant_id into v_mvp_vote
  from public.session_mvp_votes v
  where v.event_id = p_event_id and v.voter_participant_id = v_participant_id;

  select exists (
    select 1 from public.session_debrief_skips s
    where s.event_id = p_event_id and s.participant_id = v_participant_id and s.step = 'mvp'
  ) into v_mvp_skipped;

  select exists (
    select 1 from public.session_debrief_skips s
    where s.event_id = p_event_id and s.participant_id = v_participant_id and s.step = 'stats'
  ) into v_stats_skipped;

  select exists (
    select 1 from public.session_debrief_skips s
    where s.event_id = p_event_id and s.participant_id = v_participant_id and s.step = 'feedback'
  ) into v_feedback_skipped;

  select exists (
    select 1 from public.session_player_stats s
    where s.event_id = p_event_id and s.participant_id = v_participant_id
  ) into v_stats_submitted;

  select exists (
    select 1 from public.session_feedback sf
    where sf.event_id = p_event_id and sf.participant_id = v_participant_id
  ) into v_feedback_submitted;

  if v_mvp_enabled then
    v_steps := v_steps || jsonb_build_array('mvp');
  end if;
  if v_stats_enabled then
    v_steps := v_steps || jsonb_build_array('stats');
  end if;
  if v_feedback_enabled then
    v_steps := v_steps || jsonb_build_array('feedback');
  end if;

  if v_mvp_enabled and not public.session_mvp_step_complete(p_event_id, v_participant_id, v_org_id) then
    v_initial_step := 'mvp';
  elsif v_stats_enabled and not public.session_stats_step_complete(p_event_id, v_participant_id, v_org_id) then
    v_initial_step := 'stats';
  elsif v_feedback_enabled and not public.session_feedback_step_complete(p_event_id, v_participant_id, v_org_id) then
    v_initial_step := 'feedback';
  else
    v_initial_step := coalesce(v_steps->>0, 'feedback');
  end if;

  return jsonb_build_object(
    'mvp_voting_enabled', v_mvp_enabled,
    'player_stats_enabled', v_stats_enabled,
    'feedback_enabled', v_feedback_enabled,
    'mvp_voting_open', v_mvp_open,
    'mvp_vote_cast', v_mvp_vote is not null,
    'mvp_nominee_participant_id', v_mvp_vote,
    'mvp_skipped', v_mvp_skipped,
    'mvp_step_complete', public.session_mvp_step_complete(p_event_id, v_participant_id, v_org_id),
    'stats_submitted', v_stats_submitted,
    'stats_skipped', v_stats_skipped,
    'stats_step_complete', public.session_stats_step_complete(p_event_id, v_participant_id, v_org_id),
    'feedback_submitted', v_feedback_submitted,
    'feedback_skipped', v_feedback_skipped,
    'feedback_step_complete', public.session_feedback_step_complete(p_event_id, v_participant_id, v_org_id),
    'debrief_complete', public.session_debrief_complete(p_event_id, v_participant_id, v_org_id),
    'initial_step', v_initial_step,
    'steps', v_steps,
    'ballot', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'participant_id', s.participant_id,
          'display_name', public.participant_roster_display_name(s.participant_id)
        )
        order by public.participant_roster_display_name(s.participant_id)
      )
      from public.signups s
      where s.event_id = p_event_id
        and s.list_status = 'confirmed'
        and s.participant_id <> v_participant_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_session_mvp_vote(
  p_session_token uuid,
  p_event_id uuid,
  p_nominee_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
begin
  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_debrief_eligible(p_event_id, v_participant_id);

  if not public.org_session_mvp_voting_enabled(v_org_id) then
    raise exception 'MVP voting is not enabled';
  end if;

  if not public.session_mvp_voting_open(p_event_id) then
    raise exception 'MVP voting has closed';
  end if;

  if p_nominee_participant_id = v_participant_id then
    raise exception 'You cannot vote for yourself';
  end if;

  if exists (
    select 1 from public.session_mvp_votes v
    where v.event_id = p_event_id and v.voter_participant_id = v_participant_id
  ) then
    raise exception 'You have already voted';
  end if;

  if not exists (
    select 1 from public.signups s
    where s.event_id = p_event_id
      and s.participant_id = p_nominee_participant_id
      and s.list_status = 'confirmed'
  ) then
    raise exception 'Invalid nominee';
  end if;

  if not exists (
    select 1 from public.signups s
    where s.event_id = p_event_id
      and s.participant_id = v_participant_id
      and s.list_status = 'confirmed'
  ) then
    raise exception 'Not eligible to vote';
  end if;

  insert into public.session_mvp_votes (org_id, event_id, voter_participant_id, nominee_participant_id)
  values (v_org_id, p_event_id, v_participant_id, p_nominee_participant_id);

  perform public.try_dismiss_debrief_notification(p_event_id, v_participant_id);
end;
$$;

create or replace function public.skip_session_debrief_step(
  p_session_token uuid,
  p_event_id uuid,
  p_step text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
begin
  if p_step not in ('mvp', 'stats', 'feedback') then
    raise exception 'Invalid step';
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_debrief_eligible(p_event_id, v_participant_id);

  if p_step = 'mvp' and not public.org_session_mvp_voting_enabled(v_org_id) then
    raise exception 'MVP voting is not enabled';
  end if;

  if p_step = 'stats' and not public.org_session_player_stats_enabled(v_org_id) then
    raise exception 'Player stats are not enabled';
  end if;

  if p_step = 'feedback' and not public.org_session_feedback_enabled(v_org_id) then
    raise exception 'Session feedback is not enabled';
  end if;

  if p_step = 'mvp' and not public.session_mvp_voting_open(p_event_id) then
    raise exception 'MVP voting has closed';
  end if;

  insert into public.session_debrief_skips (event_id, participant_id, step)
  values (p_event_id, v_participant_id, p_step)
  on conflict (event_id, participant_id, step) do nothing;

  perform public.try_dismiss_debrief_notification(p_event_id, v_participant_id);
end;
$$;

create or replace function public.submit_session_player_stats(
  p_session_token uuid,
  p_event_id uuid,
  p_goals int,
  p_assists int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
begin
  if p_goals is null or p_goals < 0 or p_goals > 99 then
    raise exception 'Goals must be between 0 and 99';
  end if;

  if p_assists is null or p_assists < 0 or p_assists > 99 then
    raise exception 'Assists must be between 0 and 99';
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_debrief_eligible(p_event_id, v_participant_id);

  if not public.org_session_player_stats_enabled(v_org_id) then
    raise exception 'Player stats are not enabled';
  end if;

  if exists (
    select 1 from public.session_player_stats s
    where s.event_id = p_event_id and s.participant_id = v_participant_id
  ) then
    raise exception 'Stats already submitted';
  end if;

  insert into public.session_player_stats (org_id, event_id, participant_id, goals, assists)
  values (v_org_id, p_event_id, v_participant_id, p_goals, p_assists);

  perform public.try_dismiss_debrief_notification(p_event_id, v_participant_id);
end;
$$;

-- Update feedback submit to use debrief dismiss
create or replace function public.submit_session_feedback(
  p_session_token uuid,
  p_event_id uuid,
  p_rating int,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
  v_comment text;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  v_comment := nullif(trim(coalesce(p_comment, '')), '');

  if p_rating <= 2 and v_comment is null then
    raise exception 'Comment is required for ratings of 2 or lower';
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_feedback_eligible(p_event_id, v_participant_id);

  insert into public.session_feedback (org_id, event_id, participant_id, outcome, rating, comment)
  values (v_org_id, p_event_id, v_participant_id, 'rated', p_rating, v_comment);

  perform public.try_dismiss_debrief_notification(p_event_id, v_participant_id);
end;
$$;

create or replace function public.mark_session_no_attend(
  p_session_token uuid,
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_participant_id uuid;
  v_signup_id uuid;
begin
  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  v_participant_id := public.assert_participant_session_token(p_session_token, v_org_id);
  perform public.assert_session_feedback_eligible(p_event_id, v_participant_id);

  select s.id into v_signup_id
  from public.signups s
  where s.event_id = p_event_id
    and s.participant_id = v_participant_id
    and s.list_status = 'confirmed';

  if v_signup_id is not null then
    insert into public.event_signup_activity (org_id, event_id, participant_id, action)
    values (v_org_id, p_event_id, v_participant_id, 'left');

    delete from public.signups where id = v_signup_id;
  end if;

  insert into public.session_feedback (org_id, event_id, participant_id, outcome, rating, comment)
  values (v_org_id, p_event_id, v_participant_id, 'no_attend', null, null);

  perform public.try_dismiss_debrief_notification(p_event_id, v_participant_id);
end;
$$;

grant execute on function public.finalize_pending_session_mvp_votes(int) to service_role;
grant execute on function public.finalize_session_mvp_votes(uuid) to service_role;
grant execute on function public.get_active_session_mvp_badges(uuid) to anon, authenticated;
grant execute on function public.get_session_debrief_state(uuid, uuid) to anon, authenticated;
grant execute on function public.submit_session_mvp_vote(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.skip_session_debrief_step(uuid, uuid, text) to anon, authenticated;
grant execute on function public.submit_session_player_stats(uuid, uuid, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
