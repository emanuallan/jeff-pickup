-- Restrict archiving sponsor visit analytics to inactive (non-live) sponsors.
-- Safe to run even if 089 already included this check (create or replace).

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
