-- Event analytics: page views + signup activity log for organizer console.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.event_page_views (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  viewer_key text not null,
  participant_id uuid references public.participants(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index event_page_views_event_id_idx on public.event_page_views (event_id);

create table public.event_signup_activity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  action text not null check (action in ('joined', 'left')),
  created_at timestamptz not null default now()
);

create index event_signup_activity_event_id_idx on public.event_signup_activity (event_id);

grant select on public.event_page_views to authenticated;
grant select on public.event_signup_activity to authenticated;

alter table public.event_page_views enable row level security;
alter table public.event_signup_activity enable row level security;

create policy "Org admins can view event page views"
  on public.event_page_views for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

create policy "Org admins can view signup activity"
  on public.event_signup_activity for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- record_event_page_view — public event page tracking (anon-safe)
-- ---------------------------------------------------------------------------

create or replace function public.record_event_page_view(
  p_event_id uuid,
  p_viewer_key text,
  p_participant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if nullif(trim(p_viewer_key), '') is null then
    raise exception 'viewer_key required';
  end if;

  select e.org_id into v_org_id
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  insert into public.event_page_views (org_id, event_id, viewer_key, participant_id)
  values (v_org_id, p_event_id, trim(p_viewer_key), p_participant_id);
end;
$$;

revoke all on function public.record_event_page_view(uuid, text, uuid) from public;
grant execute on function public.record_event_page_view(uuid, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_event_analytics — organizer console aggregates
-- ---------------------------------------------------------------------------

create or replace function public.get_event_analytics(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.events where id = p_event_id;

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if not public.is_org_member(v_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'page_views', (
      select count(*)::int from public.event_page_views where event_id = p_event_id
    ),
    'unique_visitors', (
      select count(distinct viewer_key)::int from public.event_page_views where event_id = p_event_id
    ),
    'unique_signups', (
      select count(distinct participant_id)::int
      from public.event_signup_activity
      where event_id = p_event_id and action = 'joined'
    ),
    'unique_left', (
      select count(distinct participant_id)::int
      from public.event_signup_activity
      where event_id = p_event_id and action = 'left'
    )
  );
end;
$$;

revoke all on function public.get_event_analytics(uuid) from public;
grant execute on function public.get_event_analytics(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- join_event — log signup activity
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
  v_starts_at timestamptz;
  v_phone text;
  v_participant_id uuid;
  v_session_token uuid;
  v_signup_id uuid;
  v_display text;
  v_guests int;
begin
  v_phone := public.normalize_phone(p_phone);
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'Invalid phone number';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'First and last name are required';
  end if;

  v_guests := greatest(0, least(20, coalesce(p_guest_count, 0)));

  select e.org_id, e.capacity, e.status, e.starts_at
  into v_org_id, v_capacity, v_event_status, v_starts_at
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.id = p_event_id and o.status = 'active';

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if v_event_status = 'cancelled' then
    raise exception 'This session was cancelled';
  end if;

  if v_starts_at < now() then
    raise exception 'Cannot sign up for a past session';
  end if;

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

  return jsonb_build_object(
    'signup_id', v_signup_id,
    'session_token', v_session_token,
    'display_name', v_display
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_event — log unregister activity
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

  insert into public.event_signup_activity (org_id, event_id, participant_id, action)
  values (v_org_id, v_event_id, v_participant_id, 'left');

  delete from public.signups where id = p_signup_id;
end;
$$;
