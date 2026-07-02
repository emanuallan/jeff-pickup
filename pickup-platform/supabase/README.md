# Supabase setup (Headcount)

Use a **new** Supabase project. Do not reuse the PoC (`../supabase`) database.

## 1. Create project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public key** into `pickup-platform/.env`.

### Recommended project settings (Data API)

Under **Project Settings → Data API**:

| Option | Setting | Why |
| --- | --- | --- |
| Enable Data API | **On** | Required for `supabase-js` / `@supabase/ssr` |
| Automatically expose new tables | **Off** | New tables stay hidden until we explicitly grant access |
| Enable automatic RLS | **On** | Safety net — every new `public` table gets RLS enabled |

With auto-expose **off**, every migration must deliberately expose tables (see §5 below).
With automatic RLS **on**, RLS is enabled automatically, but you still need policies — a table
with RLS and no policies returns zero rows (or denies writes).

## 2. Run migration

In the Supabase **SQL Editor**, run in order:

1. `supabase/migrations/001_orgs_and_members.sql`
2. `supabase/migrations/002_locations_schedules_events.sql`
3. `supabase/migrations/003_optional_capacity.sql`
4. `supabase/migrations/004_participants_signups.sql`
5. `supabase/migrations/005_engagement_leaderboards.sql`
6. `supabase/migrations/006_event_timezone.sql`
7. `supabase/migrations/007_schedule_event_skips.sql`
8. `supabase/migrations/008_online_locations.sql`
9. `supabase/migrations/009_update_guest_count.sql`
10. `supabase/migrations/010_optional_min_participants.sql`
11. `supabase/migrations/011_schedule_interval.sql`
12. `supabase/migrations/012_normalize_phone_us10.sql`
13. `supabase/migrations/041_org_logo_storage.sql` (after all prior migrations through 040)
14. `supabase/migrations/042_org_logo_storage_select.sql`

Run migrations 013–040 in order as well if this is a fresh project — see `supabase/migrations/` for the full sequence.

## 3. Auth settings

Enable **Email** provider. Password auth is not needed.

Organizer sign-in uses **email OTP** (6-digit code). Copy [`templates/email-otp.html`](templates/email-otp.html)
into **Authentication → Email Templates → Magic Link** in the Supabase dashboard. (Supabase labels this
template "Magic Link" in the UI, but the content must be OTP-only.)

The template must include `{{ .Token }}` and must **not** include `{{ .ConfirmationURL }}`.

OTP length is set in **Authentication → Providers → Email** (we use **6** digits; keep app and dashboard in sync).

Redirect URLs (`/auth/callback`) are **not** required for OTP sign-in.

Recommended: configure custom SMTP (SendGrid, Resend, Brevo, etc.) under **Authentication → SMTP** —
the built-in Supabase sender has a low rate limit.

## 4. Seed a test org (optional)

After signing in once (so you have a `auth.users` row), create a test org:

```sql
-- Replace YOUR_USER_ID with your auth.users id
insert into public.orgs (slug, name, description, created_by)
values ('jeffsoccer', 'Jeff Soccer', 'Pickup soccer', 'YOUR_USER_ID');
-- Trigger auto-adds you as owner via handle_new_org()
```

Visit `http://jeffsoccer.localhost:3000` locally.

## 5. Service role key (Phase 1+)

Under **Project Settings → API**, copy the **service_role** key into `.env.local` as
`SUPABASE_SERVICE_ROLE_KEY`. This is **server-only** — never expose it as `NEXT_PUBLIC_*`.

Used for:
- "Generate next 30 days of sessions" in the organizer console
- Vercel Cron (`/api/cron/materialize`)

## 6. Exposing a new table (checklist)

Use this for every new migration when **Automatically expose new tables** is disabled.

### Checklist

1. **Create the table** with `org_id` (or equivalent tenant key) on all tenant-owned rows.
2. **Enable RLS** — automatic RLS may do this, but include it explicitly in the migration anyway:
   ```sql
   alter table public.my_table enable row level security;
   ```
3. **Grant API access** — only the operations the client actually needs:
   ```sql
   -- Read-only for anon + authenticated (typical for public roster data)
   grant select on public.my_table to anon, authenticated;

   -- Writes for authenticated only (typical for organizer actions)
   grant insert, update, delete on public.my_table to authenticated;

   -- RPCs the client calls directly
   grant execute on function public.my_rpc(...) to anon, authenticated;
   ```
   Prefer the **minimum** grants. Many writes should go through RPCs (`security definer`) instead
   of direct table `insert`/`update`/`delete`.
4. **Write RLS policies** — one policy per operation (`select`, `insert`, `update`, `delete`).
   Scope every policy by `org_id` and/or `auth.uid()`. Reuse helpers like `is_org_member()`.
5. **Sanity-check from the client** after deploying:
   - Expected reads work (e.g. anon can `select` active orgs).
   - Expected writes work (e.g. authenticated owner can `update` their org).
   - Cross-tenant access is blocked (user A cannot read/write org B's rows).
   - A table with no grant returns a permission error — that means auto-expose is working.

### Minimal migration template

```sql
-- 1. Table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index events_org_id_idx on public.events (org_id);

-- 2. RLS
alter table public.events enable row level security;

-- 3. Grants (adjust per table — this example is public read, admin write)
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

-- 4. Policies
create policy "Anyone can view events for active orgs"
  on public.events for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.orgs o
      where o.id = events.org_id and o.status = 'active'
    )
  );

create policy "Org admins can manage events"
  on public.events for all
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']))
  with check (public.is_org_member(org_id, array['owner', 'admin']));
```

### Common mistakes

- **Table created but not granted** → client gets `permission denied for table …`. Add grants in the migration.
- **RLS on, no policies** → `select` returns empty. Add policies.
- **Policy too broad** → e.g. `using (true)` on `insert`/`update`. Always scope by tenant + role.
- **Direct table writes for sensitive ops** → prefer an RPC with `security definer` and explicit checks
  (like `unregister_signup` in the PoC).
