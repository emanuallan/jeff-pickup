# Supabase schema

This folder contains SQL migrations for the shared “pickup signups” roster.

## Apply

In the Supabase SQL editor, run the migrations in order:

- `supabase/migrations/001_create_signups.sql`
- `supabase/migrations/002_signups_unregister_and_settings.sql`
- `supabase/migrations/003_add_active_time_setting.sql`
- `supabase/migrations/004_add_announcement_settings.sql`
- `supabase/migrations/005_decouple_location_and_admin_remove.sql`

This creates:

- `public.signups` (public select + insert) + a safe unregister function (`public.unregister_signup`)
- `public.app_settings` (public select + update) for the app’s active location
- `active_time` setting (shown in header)
- `announcement_text` + `announcement_date` settings (banner)
- Uniqueness is now one list per day: `(play_date, lower(player_name))`
- Admin removal RPC: `public.admin_remove_signup(signup_id, pin)` (requires server-side PIN hash)

## Configure admin PIN hash

Run this in the Supabase SQL editor (choose your PIN):

```sql
update public.admin_secrets
set value = crypt('1234', gen_salt('bf'))
where key = 'admin_pin_hash';
```

Then in the app’s Admin panel, enter the same PIN and you’ll be able to remove players.

