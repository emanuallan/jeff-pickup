-- Admin/webhook clients use service_role to read sponsorship tables directly.
-- 052 granted authenticated only; PostgREST still needs explicit service_role grants.

grant select on public.org_stripe_accounts to service_role;
grant select on public.sponsorship_tiers to service_role;
grant select on public.sponsorships to service_role;
