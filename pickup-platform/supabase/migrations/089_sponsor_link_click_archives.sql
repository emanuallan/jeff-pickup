-- Sponsor visit archives + per-person visitor lists.
-- Depends on 088_sponsor_link_clicks.sql.

-- ---------------------------------------------------------------------------
-- Archives: snapshot periods so organizers can reset live counters
-- ---------------------------------------------------------------------------

create table public.sponsor_link_click_archives (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  sponsorship_id uuid not null references public.sponsorships(id) on delete cascade,
  sponsor_name text not null,
  contact_email text not null default '',
  sponsor_url text,
  tier_name text not null default 'Tier',
  total_clicks int not null check (total_clicks >= 0),
  unique_visitors int not null check (unique_visitors >= 0),
  first_click_at timestamptz,
  last_click_at timestamptz,
  archived_at timestamptz not null default now(),
  archived_by uuid references auth.users(id) on delete set null
);

create index sponsor_link_click_archives_org_archived_at_idx
  on public.sponsor_link_click_archives (org_id, archived_at desc);

create index sponsor_link_click_archives_sponsorship_idx
  on public.sponsor_link_click_archives (sponsorship_id, archived_at desc);

alter table public.sponsor_link_click_archives enable row level security;

create policy "Org admins can view sponsor link click archives"
  on public.sponsor_link_click_archives for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

grant select on public.sponsor_link_click_archives to authenticated;
grant select on public.sponsor_link_click_archives to service_role;

alter table public.sponsor_link_clicks
  add column if not exists archive_id uuid
    references public.sponsor_link_click_archives(id) on delete set null;

create index if not exists sponsor_link_clicks_sponsorship_current_idx
  on public.sponsor_link_clicks (sponsorship_id, clicked_at desc)
  where archive_id is null;

-- ---------------------------------------------------------------------------
-- Live stats only count non-archived clicks
-- ---------------------------------------------------------------------------

create or replace function public.get_sponsor_link_click_stats(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'sponsorship_id', s.id,
        'sponsor_name', s.sponsor_name,
        'contact_email', s.contact_email,
        'sponsor_url', s.sponsor_url,
        'tier_name', coalesce(t.name, 'Tier'),
        'status', s.status,
        'total_clicks', coalesce(c.total_clicks, 0),
        'unique_visitors', coalesce(c.unique_visitors, 0),
        'first_click_at', c.first_click_at,
        'last_click_at', c.last_click_at
      )
      order by coalesce(c.total_clicks, 0) desc, s.sponsor_name asc
    )
    from public.sponsorships s
    left join public.sponsorship_tiers t on t.id = s.tier_id
    left join lateral (
      select
        count(*)::int as total_clicks,
        count(distinct viewer_key)::int as unique_visitors,
        min(clicked_at) as first_click_at,
        max(clicked_at) as last_click_at
      from public.sponsor_link_clicks cl
      where cl.sponsorship_id = s.id
        and cl.archive_id is null
    ) c on true
    where s.org_id = p_org_id
      and (
        s.status in ('approved', 'hidden')
        or coalesce(c.total_clicks, 0) > 0
      )
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Archived period list
-- ---------------------------------------------------------------------------

create or replace function public.get_sponsor_link_click_archives(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'sponsorship_id', a.sponsorship_id,
        'sponsor_name', a.sponsor_name,
        'contact_email', a.contact_email,
        'sponsor_url', a.sponsor_url,
        'tier_name', a.tier_name,
        'total_clicks', a.total_clicks,
        'unique_visitors', a.unique_visitors,
        'first_click_at', a.first_click_at,
        'last_click_at', a.last_click_at,
        'archived_at', a.archived_at
      )
      order by a.archived_at desc
    )
    from public.sponsor_link_click_archives a
    where a.org_id = p_org_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_sponsor_link_click_archives(uuid) from public;
grant execute on function public.get_sponsor_link_click_archives(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Archive the current (non-archived) click period for one sponsorship
-- ---------------------------------------------------------------------------

create or replace function public.archive_sponsor_link_analytics(p_sponsorship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sponsorships%rowtype;
  v_tier_name text;
  v_total int;
  v_unique int;
  v_first timestamptz;
  v_last timestamptz;
  v_archive_id uuid;
begin
  select * into v_row
  from public.sponsorships s
  where s.id = p_sponsorship_id;

  if not found then
    raise exception 'Sponsorship not found';
  end if;

  if not public.is_org_member(v_row.org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  -- Only inactive (not live on public pages) sponsors can be archived.
  if v_row.status = 'approved' then
    raise exception 'Hide or cancel this sponsor before archiving visit analytics';
  end if;

  select
    count(*)::int,
    count(distinct viewer_key)::int,
    min(clicked_at),
    max(clicked_at)
  into v_total, v_unique, v_first, v_last
  from public.sponsor_link_clicks
  where sponsorship_id = p_sponsorship_id
    and archive_id is null;

  if coalesce(v_total, 0) = 0 then
    raise exception 'No current visits to archive';
  end if;

  select coalesce(t.name, 'Tier') into v_tier_name
  from public.sponsorship_tiers t
  where t.id = v_row.tier_id;

  insert into public.sponsor_link_click_archives (
    org_id,
    sponsorship_id,
    sponsor_name,
    contact_email,
    sponsor_url,
    tier_name,
    total_clicks,
    unique_visitors,
    first_click_at,
    last_click_at,
    archived_by
  )
  values (
    v_row.org_id,
    v_row.id,
    v_row.sponsor_name,
    coalesce(v_row.contact_email, ''),
    v_row.sponsor_url,
    coalesce(v_tier_name, 'Tier'),
    v_total,
    v_unique,
    v_first,
    v_last,
    auth.uid()
  )
  returning id into v_archive_id;

  update public.sponsor_link_clicks
  set archive_id = v_archive_id
  where sponsorship_id = p_sponsorship_id
    and archive_id is null;

  return jsonb_build_object(
    'ok', true,
    'archive_id', v_archive_id,
    'total_clicks', v_total,
    'unique_visitors', v_unique
  );
end;
$$;

revoke all on function public.archive_sponsor_link_analytics(uuid) from public;
grant execute on function public.archive_sponsor_link_analytics(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resolve soft-session participants on click (replaces p_participant_id arg)
-- ---------------------------------------------------------------------------

drop function if exists public.record_sponsor_link_click(uuid, text, text, uuid);

create or replace function public.record_sponsor_link_click(
  p_sponsorship_id uuid,
  p_placement text,
  p_viewer_key text,
  p_session_token uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_sponsor_url text;
  v_participant_id uuid;
begin
  if p_placement is distinct from 'footer' and p_placement is distinct from 'ticker' then
    raise exception 'Invalid placement';
  end if;

  if nullif(trim(p_viewer_key), '') is null then
    raise exception 'viewer_key required';
  end if;

  select s.org_id, s.sponsor_url
  into v_org_id, v_sponsor_url
  from public.sponsorships s
  join public.orgs o on o.id = s.org_id
  where s.id = p_sponsorship_id
    and o.status = 'active'
    and s.status = 'approved'
    and s.hidden_at is null
    and nullif(trim(s.sponsor_url), '') is not null;

  if v_org_id is null then
    raise exception 'Sponsorship not found';
  end if;

  if p_session_token is not null then
    select ps.participant_id
    into v_participant_id
    from public.participant_sessions ps
    where ps.token = p_session_token
      and ps.org_id = v_org_id
      and ps.expires_at > now();
  end if;

  insert into public.sponsor_link_clicks (
    org_id,
    sponsorship_id,
    placement,
    viewer_key,
    participant_id
  )
  values (
    v_org_id,
    p_sponsorship_id,
    p_placement,
    trim(p_viewer_key),
    v_participant_id
  );

  return v_sponsor_url;
end;
$$;

revoke all on function public.record_sponsor_link_click(uuid, text, text, uuid) from public;
grant execute on function public.record_sponsor_link_click(uuid, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Per-person visit breakdown for a sponsorship period
-- p_archive_id null = current (live) period
-- ---------------------------------------------------------------------------

create or replace function public.get_sponsor_link_click_visitors(
  p_sponsorship_id uuid,
  p_archive_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select s.org_id into v_org_id
  from public.sponsorships s
  where s.id = p_sponsorship_id;

  if v_org_id is null then
    raise exception 'Sponsorship not found';
  end if;

  if not public.is_org_member(v_org_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  if p_archive_id is not null and not exists (
    select 1
    from public.sponsor_link_click_archives a
    where a.id = p_archive_id
      and a.sponsorship_id = p_sponsorship_id
      and a.org_id = v_org_id
  ) then
    raise exception 'Archive not found';
  end if;

  return (
    with clicks as (
      select
        cl.viewer_key,
        cl.participant_id,
        p.first_name,
        p.last_name,
        p.display_name,
        p.phone
      from public.sponsor_link_clicks cl
      left join public.participants p on p.id = cl.participant_id
      where cl.sponsorship_id = p_sponsorship_id
        and (
          (p_archive_id is null and cl.archive_id is null)
          or (p_archive_id is not null and cl.archive_id = p_archive_id)
        )
    ),
    by_viewer as (
      select
        viewer_key,
        count(*)::int as visit_count,
        (array_agg(participant_id) filter (where participant_id is not null))[1] as participant_id,
        (array_agg(first_name) filter (where participant_id is not null))[1] as first_name,
        (array_agg(last_name) filter (where participant_id is not null))[1] as last_name,
        (array_agg(display_name) filter (where participant_id is not null))[1] as display_name,
        (array_agg(phone) filter (where participant_id is not null))[1] as phone
      from clicks
      group by viewer_key
    ),
    known as (
      select
        participant_id,
        coalesce(nullif(trim(display_name), ''), trim(first_name || ' ' || left(last_name, 1) || '.')) as display_name,
        coalesce(first_name, '') as first_name,
        coalesce(last_name, '') as last_name,
        coalesce(phone, '') as phone,
        sum(visit_count)::int as visit_count
      from by_viewer
      where participant_id is not null
      group by participant_id, display_name, first_name, last_name, phone
    ),
    guests as (
      select
        count(*)::int as visitor_count,
        coalesce(sum(visit_count), 0)::int as visit_count
      from by_viewer
      where participant_id is null
    )
    select jsonb_build_object(
      'known', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'participant_id', k.participant_id,
            'display_name', k.display_name,
            'first_name', k.first_name,
            'last_name', k.last_name,
            'phone', k.phone,
            'visit_count', k.visit_count
          )
          order by k.visit_count desc, k.display_name asc
        )
        from known k
      ), '[]'::jsonb),
      'guests', jsonb_build_object(
        'visitor_count', coalesce((select visitor_count from guests), 0),
        'visit_count', coalesce((select visit_count from guests), 0)
      )
    )
  );
end;
$$;

revoke all on function public.get_sponsor_link_click_visitors(uuid, uuid) from public;
grant execute on function public.get_sponsor_link_click_visitors(uuid, uuid) to authenticated;
