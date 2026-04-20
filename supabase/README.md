# Supabase schema

This folder contains SQL migrations for the shared “pickup signups” roster.

## Apply

In the Supabase SQL editor, run the migration in:

- `supabase/migrations/001_create_signups.sql`

That will create the `public.signups` table, indexes, and Row Level Security (RLS) policies for **public select + insert**.

