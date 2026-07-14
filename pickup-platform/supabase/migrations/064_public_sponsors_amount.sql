-- Include monthly amount on public sponsors so the footer can size logos by tier.

create or replace function public.get_public_sponsors(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  if not exists (
    select 1 from public.orgs o where o.id = p_org_id and o.status = 'active'
  ) then
    return '[]'::jsonb;
  end if;

  v_active := public.org_sponsorships_active(p_org_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'sponsor_name', s.sponsor_name,
        'logo_url', s.logo_url,
        'sponsor_url', s.sponsor_url,
        'monthly_amount_cents', s.monthly_amount_cents
      )
      order by s.monthly_amount_cents desc, s.approved_at nulls last, s.created_at
    )
    from public.sponsorships s
    where s.org_id = p_org_id
      and s.status = 'approved'
      and s.hidden_at is null
      and s.logo_url is not null
      and (s.subscription_status is null or s.subscription_status in ('active', 'trialing'))
  ), '[]'::jsonb);
end;
$$;
