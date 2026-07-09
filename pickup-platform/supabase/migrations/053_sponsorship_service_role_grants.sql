-- Webhook/admin RPCs in 052 revoked PUBLIC execute but omitted service_role grants.

grant execute on function public.upsert_org_stripe_account(uuid, text, boolean, boolean, boolean)
  to service_role;

grant execute on function public.upsert_sponsorship_from_checkout(
  uuid, uuid, text, text, text, text, text, text, text, text, int, text, numeric, text
) to service_role;

grant execute on function public.update_sponsorship_subscription_status(text, text, text)
  to service_role;
