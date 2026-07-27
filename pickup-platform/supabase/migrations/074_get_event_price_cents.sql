-- Expose session fee via RPC so join UI does not depend on PostgREST schema cache
-- picking up events.price_cents after migration 073.

create or replace function public.get_event_price_cents(
  p_org_id uuid,
  p_event_ref text
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select e.price_cents
  from public.events e
  join public.orgs o on o.id = e.org_id
  where e.org_id = p_org_id
    and e.short_id = p_event_ref
    and o.status = 'active';
$$;

revoke all on function public.get_event_price_cents(uuid, text) from public;
grant execute on function public.get_event_price_cents(uuid, text) to anon, authenticated;

comment on function public.get_event_price_cents(uuid, text) is
  'Returns events.price_cents for public join gating (null/0 = free).';
