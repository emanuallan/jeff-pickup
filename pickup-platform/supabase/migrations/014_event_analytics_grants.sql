-- Allow service_role to inspect analytics tables (cron/ops); no change to public access.

grant select on public.event_page_views to service_role;
grant select on public.event_signup_activity to service_role;
