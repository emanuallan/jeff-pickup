# Supabase schema

This folder contains SQL migrations for the shared “pickup signups” roster.

## Apply

In the Supabase SQL editor, run the migrations in order:

- `supabase/migrations/001_create_signups.sql`
- `supabase/migrations/002_signups_unregister_and_settings.sql`

This creates:

- `public.signups` (public select + insert) + a safe unregister function (`public.unregister_signup`)
- `public.app_settings` (public select + update) for the app’s active location

