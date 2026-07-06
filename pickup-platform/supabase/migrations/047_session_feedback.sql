-- Post-session feedback + participant notifications (v1)

-- ---------------------------------------------------------------------------
-- Feature default (session_feedback on)
-- ---------------------------------------------------------------------------

alter table public.orgs
  alter column settings set default '{
    "features": {
      "user_badges": true,
      "leaderboard": true,
      "returning_signup_modal": true,
      "public_roster": true,
      "guest_signups": true,
      "session_feedback": true
    }
  }'::jsonb;

update public.orgs
set settings = jsonb_set(
  settings,
  '{features,session_feedback}',
  coalesce(settings->'features'->'session_feedback', 'true'::jsonb),
  true
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  outcome text not null check (outcome in ('rated', 'no_attend')),
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id),
  check (
    (outcome = 'rated' and rating is not null)
    or (outcome = 'no_attend' and rating is null)
  )
);

create index session_feedback_org_created_idx
  on public.session_feedback (org_id, created_at desc);

create index session_feedback_event_id_idx
  on public.session_feedback (event_id);

create table public.participant_notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  kind text not null check (kind in ('session_feedback')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id, kind)
);

create index participant_notifications_participant_idx
  on public.participant_notifications (participant_id, created_at desc);

create table public.participant_notification_reads (
  notification_id uuid not null references public.participant_notifications(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, participant_id)
);

create table public.participant_notification_dismissals (
  notification_id uuid not null references public.participant_notifications(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (notification_id, participant_id)
);

alter table public.session_feedback enable row level security;
alter table public.participant_notifications enable row level security;
alter table public.participant_notification_reads enable row level security;
alter table public.participant_notification_dismissals enable row level security;

create policy "Org members can view session feedback"
  on public.session_feedback for select
  to authenticated
  using (public.is_org_member(org_id));

grant select on public.session_feedback to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_session_feedback_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (o.settings->'features'->>'session_feedback')::boolean from public.orgs o where o.id = p_org_id),
    true
  );
$$;

create or replace function public.participant_feedback_event_label(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(e.title), ''),
    nullif(trim(s.title), ''),
    to_char(e.starts_at at time zone coalesce(e.timezone, 'UTC'), 'Dy, Mon DD')
  )
  from public.events e
  left join public.schedules s on s.id = e.schedule_id
  where e.id = p_event_id;
$$;

create or replace function public.participant_feedback_event_payload(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'event_short_id', e.short_id,
    'event_label', public.participant_feedback_event_label(e.id),
    'event_starts_at', e.starts_at,
    'location_label', coalesce(l.label, 'Location')
  )
  from public.events e
  left join public.locations l on l.id = e.location_id
  where e.id = p_event_id;
$$;

create or replace function public.assert_participant_session_token(
  p_session_token uuid,
  p_org_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
begin
  v_participant_id := public.resolve_session_participant(p_session_token, p_org_id);
  if v_participant_id is null then
    raise exception 'Not authorized';
  end if;
  return v_participant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Materialize feedback notifications
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
      and not exists (
        select 1 from public.session_feedback sf
        where sf.event_id = s.event_id and sf.participant_id = s.participant_id
      )
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

-- ---------------------------------------------------------------------------
-- Inbox
-- ---------------------------------------------------------------------------

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

  select count(*)::int into v_unread
  from public.participant_notifications n
  where n.participant_id = v_participant_id
    and n.org_id = p_org_id
    and n.kind = 'session_feedback'
    and public.event_ends_at(n.event_id) > now() - interval '14 days'
    and not exists (
      select 1 from public.session_feedback sf
      where sf.event_id = n.event_id and sf.participant_id = v_participant_id
    )
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
          and not exists (
            select 1 from public.session_feedback sf
            where sf.event_id = n.event_id and sf.participant_id = v_participant_id
          )
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

create or replace function public.mark_participant_notification_read(
  p_notification_id uuid,
  p_session_token uuid
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
  select n.org_id, n.participant_id
  into v_org_id, v_participant_id
  from public.participant_notifications n
  where n.id = p_notification_id;

  if v_org_id is null then
    raise exception 'Notification not found';
  end if;

  if public.assert_participant_session_token(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  insert into public.participant_notification_reads (notification_id, participant_id)
  values (p_notification_id, v_participant_id)
  on conflict (notification_id, participant_id) do nothing;
end;
$$;

create or replace function public.dismiss_participant_notification(
  p_notification_id uuid,
  p_session_token uuid
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
  select n.org_id, n.participant_id
  into v_org_id, v_participant_id
  from public.participant_notifications n
  where n.id = p_notification_id;

  if v_org_id is null then
    raise exception 'Notification not found';
  end if;

  if public.assert_participant_session_token(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  insert into public.participant_notification_dismissals (notification_id, participant_id)
  values (p_notification_id, v_participant_id)
  on conflict (notification_id, participant_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Submit feedback / no-attend
-- ---------------------------------------------------------------------------

create or replace function public.dismiss_participant_feedback_notification(
  p_event_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  select n.id into v_notification_id
  from public.participant_notifications n
  where n.event_id = p_event_id
    and n.participant_id = p_participant_id
    and n.kind = 'session_feedback';

  if v_notification_id is null then
    return;
  end if;

  insert into public.participant_notification_dismissals (notification_id, participant_id)
  values (v_notification_id, p_participant_id)
  on conflict (notification_id, participant_id) do nothing;
end;
$$;

create or replace function public.assert_session_feedback_eligible(
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
    raise exception 'Feedback window has closed';
  end if;

  if not public.org_session_feedback_enabled(v_org_id) then
    raise exception 'Session feedback is not enabled';
  end if;

  if exists (
    select 1 from public.session_feedback sf
    where sf.event_id = p_event_id and sf.participant_id = p_participant_id
  ) then
    raise exception 'Feedback already submitted';
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
    raise exception 'Not eligible for feedback';
  end if;

  return v_org_id;
end;
$$;

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

  perform public.dismiss_participant_feedback_notification(p_event_id, v_participant_id);
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

  perform public.dismiss_participant_feedback_notification(p_event_id, v_participant_id);
end;
$$;

grant execute on function public.materialize_session_feedback_notifications(int) to service_role;
grant execute on function public.get_participant_notification_inbox(uuid, uuid, int) to anon, authenticated;
grant execute on function public.mark_participant_notification_read(uuid, uuid) to anon, authenticated;
grant execute on function public.dismiss_participant_notification(uuid, uuid) to anon, authenticated;
grant execute on function public.submit_session_feedback(uuid, uuid, int, text) to anon, authenticated;
grant execute on function public.mark_session_no_attend(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
