# Headcount — implementation TODOs

Track deferred work and known simplifications. Prefer shipping simple, refine later.

## Phase 0 — Foundation

- [x] Next.js app scaffold
- [x] Supabase migration: `orgs`, `org_members`, RLS
- [x] Subdomain middleware (`*.organizr.co`, `*.localhost`)
- [x] Organizer email OTP auth
- [ ] Deploy to Vercel with wildcard domain `*.organizr.co`
- [ ] Session refresh on subdomain routes (middleware currently skips `updateSession` on rewrites)

## Phase 1 — Org + events core

- [x] `locations` table + CRUD in organizer console
- [x] `schedules` table (timezone defaults to organizer browser tz)
- [x] `events` table + 30-day rolling materializer (SQL RPC + Vercel Cron)
- [x] Public org page: list upcoming events
- [x] One-off event create/cancel in console
- [x] Minimal org creation form (`/console/new`)
- [x] Optional capacity (migration 003)
- [x] Auto-materialize when a schedule is created (manual button remains as escape hatch)
- [ ] Geocoding for location lat/lon (deferred — fields exist, default 0)

## Phase 2 — Participant identity + roster

- [x] `participants` table (`participant_id` durable identity; phone optional contact after migration 099)
- [x] Device session token (httpOnly cookie `hc_session`)
- [x] Frictionless join / unregister (RPCs + server actions)
- [x] `signups` table + guest counts
- [x] Arrival status picker (§9.1 in MVP_PLAN.md)
- [x] Capacity + auto `tentative → on` promotion (`maybe_promote_event`)
- [x] Public event page with roster (`/org/[slug]/events/[eventId]`)
- [x] Organizer roster with contact info (`/console/[orgSlug]/events/[eventId]`)
- [ ] Run migration `004_participants_signups.sql` on Supabase
- [ ] Run migration `099_participant_id_identity.sql` on Supabase
- [x] Participant email OTP claim (migration `100_participant_email_otp_claim.sql`)
- [ ] Run migration `100_participant_email_otp_claim.sql` on Supabase
- [ ] OTP scaffold UI seam when `org.require_phone_verification` (dormant — no SMS)

## Phase 3 — Polish + self-serve onboarding

- [x] Live slug availability check in org-creation form
- [x] Branding: logo upload (Supabase Storage) + accent color picker (console)
- [x] Weather on event detail page (Open-Meteo, no key)
- [x] Geocode location address on create (Nominatim)
- [x] Share button (native share + clipboard) on org + event pages
- [ ] i18n EN/ES — doing last, per owner
- [ ] Weather on org-page event list cards (currently detail page only)
- [ ] Multi-step wizard (location + schedule in one flow) — console guides this today

## Phase 4 — Engagement (after fundamentals)

- [x] Caps leaderboard per org (`/leaderboard`, migration 005)
- [x] Weekly streaks + roster badges (new, streak fire, milestones, caps leader)
- [x] CSV export (organizer event roster page)
- [ ] Run migration `005_engagement_leaderboards.sql` on Supabase

## Post-MVP

- [ ] **Org public subnav shell** (parked) — layout-first nav with floating mobile dock was prototyped at `/hidden` on commits `66c4201`–`e3bfb0e`; restore via cherry-pick or `git revert` of the parking commit when ready to promote to `/cal`.
- [ ] Waitlist
- [ ] Activate OTP (pick SMS provider)
- [ ] Reminders
- [x] Post-session participant feedback + console feedback section (migration `047_session_feedback.sql`)
- [ ] Custom domains
- [ ] Billing / subscriptions (platform SaaS billing for organizers — separate from session fees)
- [x] **Group sponsorships** (migration `052_group_sponsorships.sql`) — Stripe Connect + sponsor logos; run migration and configure Stripe env vars before enabling in prod

## Pay-per-session (soft identity)

- [x] **Session fees** — `events.price_cents` + console fee field; Connect Checkout; webhook + return-URL sync; soft `join_event` rejects paid sessions
- [x] **Soft-session checkout** — `prepare_paid_checkout_participant` + nullable `event_payments.user_id` (migration `079_drop_participant_auth_pairing.sql`); identity is `participant_id` (migration 099)
- [ ] **Credits / wallets / Customer Portal** — deferred
- [ ] **Participant email OTP claim** — verify email → find/create on same `participant_id` model (stashed WIP)

## Known simplifications (intentional)

- Join/leave/status changes go through security-definer RPCs (not direct table writes)
- Phone stored as normalized digits only (no E.164 library yet)
- New session token created on each join (old sessions remain valid until expiry)
- Console links use `slug.localhost:3000` in dev, `https://slug.organizr.co` in prod
- Public org-page links are subdomain-relative (`/events/X`) — middleware adds the org prefix
- Weather only shows within ~15-day forecast horizon; needs a geocoded location
- Geocoding is best-effort (Nominatim); failures leave lat/lon at 0 (no weather)
