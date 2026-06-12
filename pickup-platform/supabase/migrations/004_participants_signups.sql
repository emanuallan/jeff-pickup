-- Headcount Phase 2: participants, sessions, signups + join/leave RPCs

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  phone text not null,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  phone_verified boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, phone)
);

create index participants_org_id_idx on public.participants (org_id);

create table public.participant_sessions (
  token uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '1 year'),
  created_at timestamptz not null default now()
);

create index participant_sessions_participant_id_idx on public.participant_sessions (participant_id);

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  guest_count int not null default 0 check (guest_count >= 0 and guest_count <= 20),
  arrival_status text not null default 'confirmed'
    check (arrival_status in (
      'confirmed', 'on_my_way', 'running_late', 'in_traffic', 'maybe', 'cant_make_it'
    )),
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create index signups_event_id_idx on public.signups (event_id);

-- ---------------------------------------------------------------------------
-- Public roster view (display_name only — no phone)
-- ---------------------------------------------------------------------------

create or replace view public.event_roster_public as
select
  s.id,
  s.event_id,
  s.org_id,
  s.guest_count,
  s.arrival_status,
  s.created_at,
  p.display_name
from public.signups s
join public.participants p on p.id = s.participant_id;

-- ---------------------------------------------------------------------------
-- API grants
-- ---------------------------------------------------------------------------

grant select on public.participants to authenticated;
grant select on public.signups to authenticated;
grant select on public.event_roster_public to anon, authenticated;

-- Writes go through RPCs only (no direct insert on signups/participants for anon)

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.participants enable row level security;
alter table public.participant_sessions enable row level security;
alter table public.signups enable row level security;

-- Participants: org admins can view (for contact info)
create policy "Org admins can view participants"
  on public.participants for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

-- Signups: org admins can view full signups
create policy "Org admins can view signups"
  on public.signups for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

-- participant_sessions: no client access (RPC only via security definer)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(trim(p_phone), '\D', '', 'g'), '');
$$;

create or replace function public.event_headcount(p_event_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(1 + s.guest_count), 0)::int
  from public.signups s
  where s.event_id = p_event_id
    and s.arrival_status <> 'cant_make_it';
$$;

create or replace function public.maybe_promote_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min int;
  v_headcount int;
begin
  select min_players into v_min from public.events where id = p_event_id;
  v_headcount := public.event_headcount(p_event_id);

  if v_headcount >= v_min then
    update public.events
    set status = 'on'
    where id = p_event_id and status = 'tentative';
  end if;
end;
$$;

create or replace function public.resolve_session_participant(p_token uuid, p_org_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ps.participant_id
  from public.participant_sessions ps
  where ps.token = p_token
    and ps.org_id = p_org_id
    and ps.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- join_event RPC
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
-- leave_event RPC
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

  delete from public.signups where id = p_signup_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_arrival_status RPC
-- ---------------------------------------------------------------------------

create or replace function public.update_arrival_status(
  p_signup_id uuid,
  p_session_token uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_org_id uuid;
  v_event_id uuid;
begin
  if p_status not in (
    'confirmed', 'on_my_way', 'running_late', 'in_traffic', 'maybe', 'cant_make_it'
  ) then
    raise exception 'Invalid status';
  end if;

  select s.participant_id, s.org_id, s.event_id
  into v_participant_id, v_org_id, v_event_id
  from public.signups s
  where s.id = p_signup_id;

  if v_participant_id is null then
    raise exception 'Signup not found';
  end if;

  if public.resolve_session_participant(p_session_token, v_org_id) <> v_participant_id then
    raise exception 'Not authorized';
  end if;

  update public.signups
  set arrival_status = p_status
  where id = p_signup_id;

  perform public.maybe_promote_event(v_event_id);
end;
$$;

-- Returning participant lookup (cookie-based)
create or replace function public.get_participant_for_session(
  p_session_token uuid,
  p_org_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'participant_id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'display_name', p.display_name,
    'phone', p.phone
  )
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.token = p_session_token
    and ps.org_id = p_org_id
    and ps.expires_at > now();
$$;

create or replace function public.get_signup_for_session(
  p_event_id uuid,
  p_session_token uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'signup_id', s.id,
    'guest_count', s.guest_count,
    'arrival_status', s.arrival_status,
    'display_name', p.display_name
  )
  from public.signups s
  join public.participants p on p.id = s.participant_id
  join public.participant_sessions ps on ps.participant_id = p.id
  where s.event_id = p_event_id
    and ps.token = p_session_token
    and ps.expires_at > now();
$$;

-- Grant RPCs to anon (public join flow)
grant execute on function public.join_event(uuid, text, text, text, text, int) to anon, authenticated;
grant execute on function public.leave_event(uuid, uuid) to anon, authenticated;
grant execute on function public.update_arrival_status(uuid, uuid, text) to anon, authenticated;
grant execute on function public.get_participant_for_session(uuid, uuid) to anon, authenticated;
grant execute on function public.get_signup_for_session(uuid, uuid) to anon, authenticated;
