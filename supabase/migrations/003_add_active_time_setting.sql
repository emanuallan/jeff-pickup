-- Add active time setting (shown in header; configurable in admin panel)

insert into public.app_settings (key, value)
values ('active_time', '18:00')
on conflict (key) do nothing;

