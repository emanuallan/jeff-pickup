# Headcount — implementation TODOs

Track deferred work and known simplifications. Prefer shipping simple, refine later.

## Phase 0 — Foundation

- [x] Next.js app scaffold
- [x] Supabase migration: `orgs`, `org_members`, RLS
- [x] Subdomain middleware (`*.headcount.club`, `*.localhost`)
- [x] Organizer email magic-link auth
- [ ] Deploy to Vercel with wildcard domain `*.headcount.club`
- [ ] Session refresh on subdomain routes (middleware currently skips `updateSession` on rewrites)

## Phase 1 — Org + events core

- [x] `locations` table + CRUD in organizer console
- [x] `schedules` table (timezone defaults to organizer browser tz)
- [x] `events` table + 30-day rolling materializer (SQL RPC + Vercel Cron)
- [x] Public org page: list upcoming events
- [x] One-off event create/cancel in console
- [x] Minimal org creation form (`/console/new`)
- [x] Optional capacity (migration 003)
- [ ] Auto-materialize when a schedule is created (currently manual button)
- [ ] Geocoding for location lat/lon (deferred — fields exist, default 0)

## Phase 2 — Participant identity + roster

- [x] `participants` table (phone-keyed per org)
- [x] Device session token (httpOnly cookie `hc_session`)
- [x] Frictionless join / unregister (RPCs + server actions)
- [x] `signups` table + guest counts
- [x] Arrival status picker (§9.1 in MVP_PLAN.md)
- [x] Capacity + auto `tentative → on` promotion (`maybe_promote_event`)
- [x] Public event page with roster (`/org/[slug]/events/[eventId]`)
- [x] Organizer roster with contact info (`/console/[orgSlug]/events/[eventId]`)
- [ ] Run migration `004_participants_signups.sql` on Supabase
- [ ] OTP scaffold UI seam when `org.require_phone_verification` (dormant — no SMS)

## Phase 3 — Polish + self-serve onboarding

- [x] Live slug availability check in org-creation form
- [x] Branding: logo URL + accent color picker (console)
- [x] Weather on event detail page (Open-Meteo, no key)
- [x] Geocode location address on create (Nominatim)
- [x] Share button (native share + clipboard) on org + event pages
- [ ] i18n EN/ES — doing last, per owner
- [ ] Logo upload pipeline (Supabase Storage) — currently URL field only
- [ ] Weather on org-page event list cards (currently detail page only)
- [ ] Multi-step wizard (location + schedule in one flow) — console guides this today

## Phase 4 — Engagement (after fundamentals)

- [x] Caps leaderboard per org (`/leaderboard`, migration 005)
- [x] Weekly streaks + roster badges (new, streak fire, milestones, caps leader)
- [x] CSV export (organizer event roster page)
- [ ] Run migration `005_engagement_leaderboards.sql` on Supabase

## Post-MVP

- [ ] Waitlist
- [ ] Activate OTP (pick SMS provider)
- [ ] Reminders
- [ ] Custom domains
- [ ] Billing / subscriptions

## Known simplifications (intentional)

- Join/leave/status changes go through security-definer RPCs (not direct table writes)
- Phone stored as normalized digits only (no E.164 library yet)
- New session token created on each join (old sessions remain valid until expiry)
- Console links use `slug.localhost:3000` in dev, `https://slug.headcount.club` in prod
- Public org-page links are subdomain-relative (`/events/X`) — middleware adds the org prefix
- Weather only shows within ~15-day forecast horizon; needs a geocoded location
- Geocoding is best-effort (Nominatim); failures leave lat/lon at 0 (no weather)
