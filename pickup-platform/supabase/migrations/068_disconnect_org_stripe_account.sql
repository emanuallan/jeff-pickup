-- Allow unlinking a Connect account from an org when no live sponsorships remain.
-- Tier Stripe product/price IDs are cleared by the app after disconnect so they can be
-- recreated on a newly connected account.

create or replace function public.delete_org_stripe_account(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.org_stripe_accounts
  where org_id = p_org_id;
end;
$$;

revoke all on function public.delete_org_stripe_account(uuid) from public;
grant execute on function public.delete_org_stripe_account(uuid) to service_role;
