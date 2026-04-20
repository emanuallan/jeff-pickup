# Supabase schema

This folder contains SQL migrations for the shared “pickup signups” roster.

## Apply

In the Supabase SQL editor, run the migrations in order:

- `supabase/migrations/001_create_signups.sql`
- `supabase/migrations/002_signups_unregister_and_settings.sql`
- `supabase/migrations/003_add_active_time_setting.sql`
- `supabase/migrations/004_add_announcement_settings.sql`

This creates:

- `public.signups` (public select + insert) + a safe unregister function (`public.unregister_signup`)
- `public.app_settings` (public select + update) for the app’s active location
- `active_time` setting (shown in header)
- `announcement_text` + `announcement_date` settings (banner)

