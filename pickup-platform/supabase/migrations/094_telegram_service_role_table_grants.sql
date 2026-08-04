-- Telegram bot + MVP announce use the service-role key.
-- This project does not grant core tables to service_role by default; only
-- telegram_* tables were granted in 091. Direct PostgREST selects then 403,
-- which made /link say "already linked" (RPC) while /in said "account not found"
-- (failed participants select).

grant select on public.participants to service_role;
grant select on public.signups to service_role;
grant select on public.events to service_role;
grant select on public.orgs to service_role;
grant select on public.schedules to service_role;
grant select on public.locations to service_role;

grant select on public.session_mvp_finalizations to service_role;
grant select on public.session_mvp_awards to service_role;
grant update on public.session_mvp_finalizations to service_role;
