-- Add announcement banner settings (admin-set; auto-hide after midnight via date check in app)

insert into public.app_settings (key, value)
values
  ('announcement_text', ''),
  ('announcement_date', '')
on conflict (key) do nothing;

