-- Organizer in-app notifications (roster activity, v1)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizer_notification_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  kind text not null check (kind in ('new_signup', 'returning_signup', 'unregister')),
  created_at timestamptz not null default now()
);

create index organizer_notification_events_flush_idx
  on public.organizer_notification_events (org_id, event_id, kind, created_at);

create table public.organizer_notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (
    kind in (
      'new_signup_batch',
      'returning_signup_batch',
      'unregister_batch',
      'unregister_immediate'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organizer_notifications_org_created_idx
  on public.organizer_notifications (org_id, created_at desc);

create table public.organizer_notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.organizer_notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.organizer_notification_event_label(p_event_id uuid)
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

create or replace function public.enqueue_organizer_notification_event(
  p_org_id uuid,
  p_event_id uuid,
  p_participant_id uuid,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at timestamptz;
begin
  select e.starts_at
  into v_starts_at
  from public.events e
  where e.id = p_event_id
    and e.org_id = p_org_id
    and e.status <> 'cancelled'
    and e.starts_at >= now()
    and e.starts_at <= now() + interval '14 days';

  if v_starts_at is null then
    return;
  end if;

  insert into public.organizer_notification_events (org_id, event_id, participant_id, kind)
  values (p_org_id, p_event_id, p_participant_id, p_kind);
end;
$$;

create or replace function public.record_organizer_immediate_unregister(
  p_org_id uuid,
  p_event_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at timestamptz;
  v_short_id text;
  v_label text;
  v_display_name text;
begin
  select e.starts_at, e.short_id
  into v_starts_at, v_short_id
  from public.events e
  where e.id = p_event_id
    and e.org_id = p_org_id
    and e.status <> 'cancelled'
    and e.starts_at >= now()
    and e.starts_at <= now() + interval '14 days';

  if v_starts_at is null then
    return;
  end if;

  select display_name into v_display_name
  from public.participants
  where id = p_participant_id;

  v_label := public.organizer_notification_event_label(p_event_id);

  insert into public.organizer_notifications (org_id, event_id, kind, payload)
  values (
    p_org_id,
    p_event_id,
    'unregister_immediate',
    jsonb_build_object(
      'count', 1,
      'participant_names', jsonb_build_array(v_display_name),
      'event_short_id', v_short_id,
      'event_starts_at', v_starts_at,
      'event_label', v_label
    )
  );
end;
$$;

create or replace function public.flush_organizer_notification_batches(p_org_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_names jsonb;
  v_short_id text;
  v_starts_at timestamptz;
  v_label text;
  v_batch_kind text;
begin
  for r in
    select
      e.org_id,
      e.event_id,
      e.kind,
      array_agg(e.participant_id order by e.created_at) as participant_ids,
      count(*)::int as cnt
    from public.organizer_notification_events e
    where p_org_id is null or e.org_id = p_org_id
    group by e.org_id, e.event_id, e.kind
  loop
    v_batch_kind := case r.kind
      when 'new_signup' then 'new_signup_batch'
      when 'returning_signup' then 'returning_signup_batch'
      when 'unregister' then 'unregister_batch'
    end;

    select coalesce(
      jsonb_agg(p.display_name order by p.display_name),
      '[]'::jsonb
    )
    into v_names
    from public.participants p
    where p.id = any (r.participant_ids);

    select ev.short_id, ev.starts_at
    into v_short_id, v_starts_at
    from public.events ev
    where ev.id = r.event_id;

    v_label := public.organizer_notification_event_label(r.event_id);

    insert into public.organizer_notifications (org_id, event_id, kind, payload)
    values (
      r.org_id,
      r.event_id,
      v_batch_kind,
      jsonb_build_object(
        'count', r.cnt,
        'participant_names', v_names,
        'event_short_id', v_short_id,
        'event_starts_at', v_starts_at,
        'event_label', v_label
      )
    );

    delete from public.organizer_notification_events pending
    where pending.org_id = r.org_id
      and pending.event_id = r.event_id
      and pending.kind = r.kind;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_event — enqueue roster notifications
-- ---------------------------------------------------------------------------

create or replace function public.join_event(
  p_event_id uuid,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_guest_count int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_capacity int;
  v_headcount int;
  v_event_status text;
  v_phone text;
  v_participant_id uuid;
  v_session_token uuid;
  v_signup_id uuid;
  v_display text;
  v_guests int;
  v_existing_signup_id uuid;
  v_skip_churn boolean;
  v_is_returning boolean;
  v_notify_kind text;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Invalid phone number';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select e.org_id, e.capacity, e.status
  into v_org_id, v_capacity, v_event_status
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if v_event_status = 'cancelled' then
    raise exception 'This session was cancelled';
  end if;

  perform public.assert_event_open(p_event_id);

  v_headcount := public.event_headcount(p_event_id);
  if v_capacity is not null and (v_headcount + 1 + v_guests) > v_capacity then
    raise exception 'Session is full';
  end if;

  v_display := nullif(trim(p_display_name), '');
  if v_display is null then
    v_display := trim(p_first_name) || ' ' || left(trim(p_last_name), 1) || '.';
  end if;

  insert into public.participants (org_id, phone, first_name, last_name, display_name)
  values (v_org_id, v_phone, trim(p_first_name), trim(p_last_name), v_display)
  on conflict (org_id, phone) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        display_name = coalesce(nullif(trim(p_display_name), ''), participants.display_name)
  returning id into v_participant_id;

  if v_participant_id is null then
    select id into v_participant_id from public.participants
    where org_id = v_org_id and phone = v_phone;
  end if;

  select id into v_existing_signup_id
  from public.signups
  where event_id = p_event_id and participant_id = v_participant_id;

  insert into public.signups (org_id, event_id, participant_id, guest_count)
  values (v_org_id, p_event_id, v_participant_id, v_guests)
  on conflict (event_id, participant_id) do update
    set guest_count = excluded.guest_count
  returning id into v_signup_id;

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, p_event_id, v_participant_id, 'joined');

  insert into public.participant_sessions (participant_id, org_id)
  values (v_participant_id, v_org_id)
  returning token into v_session_token;

  perform public.maybe_promote_event(p_event_id);

  if v_existing_signup_id is null then
    select exists (
      select 1
      from public.event_signup_activity a
      where a.org_id = v_org_id
        and a.event_id = p_event_id
        and a.participant_id = v_participant_id
        and a.action = 'left'
        and a.created_at > now() - interval '1 hour'
    ) into v_skip_churn;

    if not v_skip_churn then
      select exists (
        select 1
        from public.event_signup_activity a
        where a.org_id = v_org_id
          and a.participant_id = v_participant_id
          and a.action = 'joined'
          and a.created_at < now() - interval '1 hour'
      ) into v_is_returning;

      v_notify_kind := case
        when v_is_returning then 'returning_signup'
        else 'new_signup'
      end;

      perform public.enqueue_organizer_notification_event(
        v_org_id, p_event_id, v_participant_id, v_notify_kind
      );
    end if;
  end if;

  return jsonb_build_object(
    'signup_id', v_signup_id,
    'session_token', v_session_token,
    'display_name', v_display
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_event — enqueue unregister notifications
-- ---------------------------------------------------------------------------

create or replace function public.leave_event(p_signup_id uuid, p_session_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant_id uuid;
  v_org_id uuid;
  v_starts_at timestamptz;
begin
  select s.event_id, s.participant_id, s.org_id
  into v_event_id, v_participant_id, v_org_id
  from public.signups s
  where s.id = p_signup_id;

  if v_event_id is null then
    raise exception 'Signup not found';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  perform public.assert_event_open(v_event_id);

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, v_event_id, v_participant_id, 'left');

  delete from public.signups where id = p_signup_id;

  select e.starts_at into v_starts_at
  from public.events e
  where e.id = v_event_id;

  if v_starts_at is not null
    and v_starts_at >= now()
    and v_starts_at <= now() + interval '14 days'
    and v_starts_at <= now() + interval '48 hours'
  then
    perform public.record_organizer_immediate_unregister(v_org_id, v_event_id, v_participant_id);
  else
    perform public.enqueue_organizer_notification_event(
      v_org_id, v_event_id, v_participant_id, 'unregister'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Inbox RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_organizer_notifications(
  p_org_id uuid default null,
  p_limit int default 30
)
returns table (
  id uuid,
  org_id uuid,
  org_slug text,
  org_name text,
  event_id uuid,
  kind text,
  payload jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  return query
  select
    n.id,
    n.org_id,
    o.slug as org_slug,
    o.name as org_name,
    n.event_id,
    n.kind,
    n.payload,
    n.created_at,
    r.read_at
  from public.organizer_notifications n
  join public.orgs o on o.id = n.org_id
  left join public.organizer_notification_reads r
    on r.notification_id = n.id and r.user_id = auth.uid()
  where public.is_org_member(n.org_id)
    and (p_org_id is null or n.org_id = p_org_id)
  order by n.created_at desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

create or replace function public.count_unread_organizer_notifications(
  p_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    return 0;
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  select count(*)::int into v_count
  from public.organizer_notifications n
  where public.is_org_member(n.org_id)
    and (p_org_id is null or n.org_id = p_org_id)
    and not exists (
      select 1 from public.organizer_notification_reads r
      where r.notification_id = n.id and r.user_id = auth.uid()
    );

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.mark_organizer_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.organizer_notifications n
    where n.id = p_notification_id
      and public.is_org_member(n.org_id)
  ) then
    raise exception 'Notification not found';
  end if;

  insert into public.organizer_notification_reads (user_id, notification_id)
  values (auth.uid(), p_notification_id)
  on conflict (user_id, notification_id) do nothing;
end;
$$;

create or replace function public.mark_all_organizer_notifications_read(p_org_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  insert into public.organizer_notification_reads (user_id, notification_id)
  select auth.uid(), n.id
  from public.organizer_notifications n
  where public.is_org_member(n.org_id)
    and (p_org_id is null or n.org_id = p_org_id)
    and not exists (
      select 1 from public.organizer_notification_reads r
      where r.notification_id = n.id and r.user_id = auth.uid()
    )
  on conflict (user_id, notification_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

alter table public.organizer_notifications enable row level security;
alter table public.organizer_notification_reads enable row level security;
alter table public.organizer_notification_events enable row level security;

create policy "Org members can view notifications"
  on public.organizer_notifications for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "Members can view own read state"
  on public.organizer_notification_reads for select
  to authenticated
  using (user_id = auth.uid());

create policy "Members can mark notifications read"
  on public.organizer_notification_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organizer_notifications n
      where n.id = notification_id and public.is_org_member(n.org_id)
    )
  );

grant select on public.organizer_notifications to authenticated;
grant select, insert on public.organizer_notification_reads to authenticated;

grant execute on function public.get_organizer_notifications(uuid, int) to authenticated;
grant execute on function public.count_unread_organizer_notifications(uuid) to authenticated;
grant execute on function public.mark_organizer_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_organizer_notifications_read(uuid) to authenticated;
