-- Outbound clicks from public sponsor logos → sponsor websites.
-- Used for console visit analytics + CSV reports to individual sponsors.

create table public.sponsor_link_clicks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  sponsorship_id uuid not null references public.sponsorships(id) on delete cascade,
  placement text not null check (placement in ('footer', 'ticker')),
  viewer_key text not null,
  participant_id uuid references public.participants(id) on delete set null,
  clicked_at timestamptz not null default now()
);

create index sponsor_link_clicks_sponsorship_clicked_at_idx
  on public.sponsor_link_clicks (sponsorship_id, clicked_at desc);

create index sponsor_link_clicks_org_clicked_at_idx
  on public.sponsor_link_clicks (org_id, clicked_at desc);

alter table public.sponsor_link_clicks enable row level security;

create policy "Org admins can view sponsor link clicks"
  on public.sponsor_link_clicks for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

grant select on public.sponsor_link_clicks to authenticated;
grant select on public.sponsor_link_clicks to service_role;

-- ---------------------------------------------------------------------------
-- record_sponsor_link_click — public logo click tracking (anon-safe)
-- ---------------------------------------------------------------------------

create or replace function public.record_sponsor_link_click(
  p_sponsorship_id uuid,
  p_placement text,
  p_viewer_key text,
  p_participant_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_sponsor_url text;
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
    p_participant_id
  );

  return v_sponsor_url;
end;
$$;

revoke all on function public.record_sponsor_link_click(uuid, text, text, uuid) from public;
grant execute on function public.record_sponsor_link_click(uuid, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_sponsor_link_click_stats — console aggregates per sponsorship
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
    ) c on true
    where s.org_id = p_org_id
      and s.status in ('approved', 'hidden', 'canceled')
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_sponsor_link_click_stats(uuid) from public;
grant execute on function public.get_sponsor_link_click_stats(uuid) to authenticated;
