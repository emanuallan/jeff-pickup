# Organizr — session context (for AI assistants)

Paste the block below at the start of a new chat to restore project context. The codebase,
`docs/`, and `supabase/migrations/` are authoritative — this file is a map, not the source of truth.

---

```
You are helping me build "Organizr" (organizr.co), a multi-tenant SaaS. Before doing anything,
read the files referenced below to confirm details — this prompt is a map, not the source of truth.
Treat the codebase, docs/, and supabase/migrations as authoritative over anything here.

## Where the code lives (IMPORTANT)
- Repo root: jeff-pickup (git remote: github.com/emanuallan/jeff-pickup, branch: main)
- The ACTUAL product is in the `pickup-platform/` subdirectory. ALL new work happens there.
- The repo root itself (src/, bot/, vite.config.ts, etc.) is the ORIGINAL proof-of-concept:
  a single-org, soccer-specific app called "Jeff Pickup" built with Vite. It is INSPIRATION /
  reference ONLY. Do NOT build product features there. It also contains deferred PoC experiments
  (aura, omegaball, a WhatsApp bot) that are explicitly out of scope.
- On Vercel, the project's Root Directory is set to `pickup-platform`.

## What Organizr is
An activity-agnostic platform for organizing recurring group activities (pickup sports, run clubs,
meetups, etc.) and tracking who's coming ("headcount"). It generalizes the Jeff Pickup PoC into a
replicable, self-serve, multi-tenant product. Each org gets its own subdomain (e.g.
jeffsoccer.organizr.co). Copy is generic ("session", "who's coming"); each org sets its own activity.
- Product name: "Organizr" is the brand/default everywhere user-facing. "Headcount" was the old
  codename — now only used as a descriptive word, and it still appears in internal docs/migration
  comments/package.json name (intentionally left).
- Read pickup-platform/docs/MVP_PLAN.md and pickup-platform/docs/TODO.md first — they're the plan
  of record and the live task list.

## Stack & architecture
- Next.js 15 App Router + React 19, TypeScript, Tailwind v4.
- Supabase: Postgres + Auth (passwordless email OTP for organizers) + RLS. Separate PROD Supabase project
  (not the PoC DB). Migrations live in pickup-platform/supabase/migrations/ (001–006) and are run
  MANUALLY in the Supabase SQL Editor, in order. See pickup-platform/supabase/README.md.
- Vercel hosting + Vercel Cron (daily /api/cron/materialize, protected by CRON_SECRET).
- Multi-tenancy: middleware.ts reads the host, extracts the org slug, and rewrites
  slug.organizr.co/<path> → /org/[slug]/<path>. Local dev uses slug.localhost:3000. The
  apex (organizr.co) serves marketing/login/console. lib/tenancy/parse-host.ts + reserved-slugs.ts.
- Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ROOT_DOMAIN
  (=organizr.co), SUPABASE_SERVICE_ROLE_KEY (server-only, used by materializer/cron), CRON_SECRET.
  See pickup-platform/.env.example.

## Key directories (under pickup-platform/)
- app/page.tsx, login/ — apex marketing + auth
- app/console/ — organizer console (create org, branding, locations, schedules, generate sessions,
  one-off events, rosters with contact + CSV export)
- app/org/[slug]/ — PUBLIC tenant pages: page.tsx redirects to the soonest upcoming event (or
  /events if none); events/ (list), events/[eventId]/ (detail + join/roster), leaderboard/
- app/api/ — cron/materialize, console roster
- app/auth/ — signout
- lib/ — supabase/{client,server,middleware,admin}, tenancy/, events, schedules, locations,
  signups, engagement, badges, weather (Open-Meteo), geocode (Nominatim), datetime,
  og-image.tsx + og-metadata.ts (OG/social previews)

## Domain model (Postgres, all tenant rows carry org_id, isolated by RLS)
orgs → org_members (owner/admin) → locations → schedules → events → participants/signups/
participant_sessions. Events are materialized from recurring schedules into a rolling 30-day window
by a security-definer RPC (materialize_events) called via the service-role key. Participants are
phone-keyed per org with device session tokens (httpOnly cookie). Writes for the public join flow go
through security-definer RPCs (join_event, leave_event, update_arrival_status). Post-session feedback
uses participant_notifications + session_feedback (migration 047). Leaderboards (caps +
weekly streaks) and badges are computed from signups/events.

## Conventions & gotchas learned the hard way
- Social/OG previews: do NOT use Next's file-based opengraph-image convention here — its
  auto-generated URLs leak the internal /org/[slug] rewrite path and 404 on subdomains. Instead we
  serve images from explicit route handlers at .../og-image/route.tsx, and build canonical public
  image URLs from the slug in lib/og-metadata.ts (orgBaseUrl). OG descriptions are clamped to ~125
  chars on a word boundary. OG cards (lib/og-image.tsx) show the org logo (fallback: accent-color
  letter badge) and a CTA pill ("Count me in" for events).
- Timezones: events store a `timezone` column; display via formatEventTime() in the event's zone.
  Server (Vercel) is UTC, so never format event times without an explicit timeZone or they show in
  UTC. One-off events convert organizer-local input → UTC via lib/datetime.ts.
- OTP email hits Supabase's tiny built-in SMTP rate limit; production needs custom SMTP
  (e.g. SendGrid/Brevo/Resend) configured in the Supabase dashboard + domain SPF/DKIM. No code change.
- Wildcard subdomain SSL: organizr.co, www.organizr.co, AND *.organizr.co must all be added in
  Vercel, with nameservers pointed at Vercel for the wildcard cert. Missing the wildcard =
  ERR_CONNECTION_CLOSED on subdomains.
- Location deletion is blocked when schedules/events reference it (FK on-delete-restrict), with a
  friendly error instead of a raw FK failure.
- Known TODOs: i18n EN/ES deferred; logo is
  a URL field only (no upload pipeline yet); SMS/OTP scaffolded but dormant.

## Working agreements
- **Testing (alpha+):** Before commit/push on new features or major refactors, run `npm run test` in
  pickup-platform/ and ensure it passes. New features need new tests; refactors must update or fix
  existing tests. Stack: Vitest + Testing Library (`npm run test`, `npm run test:watch`).
- Verify production builds with `npm run build` in pickup-platform/ after substantive changes.
- Only commit/push when I explicitly ask. When I do: stage relevant files, write a concise
  conventional-style message, push to main. (Note: shell globbing needs paths with [brackets] quoted.)
- Prefer small, reasonable defaults over asking; flag scope/destructive changes.

Now read pickup-platform/docs/MVP_PLAN.md, pickup-platform/docs/TODO.md, and pickup-platform/README.md,
then give me a 5-line summary of current project state and ask what I want to work on.
```

---

## Shorter restore (if context is tight)

```
Read pickup-platform/docs/CONTEXT.md (the prompt block inside it), then pickup-platform/docs/MVP_PLAN.md,
pickup-platform/docs/TODO.md, and pickup-platform/README.md. Summarize current state in 5 lines and
ask what to work on. All product work is in pickup-platform/ only — repo root is the Jeff Pickup PoC.
```
