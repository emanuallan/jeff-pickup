# Headcount — MVP Plan

**Status:** Plan of record · **Author:** engineering · **Last updated:** 2026-06-10

**Platform:** Headcount (`organizr.co`). Orgs live on subdomains, e.g. `jeffsoccer.organizr.co`.

This document defines the MVP for **Headcount**, a multi-tenant platform for organizing recurring
group activities and tracking who's coming. It's derived from the single-org proof of concept in
the repo root (`../`, "Jeff Pickup"), which was soccer-specific. The PoC proved the model works for
one community; the goal here is to make it **replicable, self-serve, and activity-agnostic for many
orgs**, done the right way (real identity, real tenancy, real authorization).

> **Activity-agnostic:** the PoC was built for pickup *soccer*, but nothing in this product is
> soccer-specific. An org could run pickup basketball, run club meetups, board-game nights, etc.
> Copy and config are generic ("session"/"event"/"who's coming"), with the activity defined per org.

---

## 1. Goal & guardrails

**Goal:** Validate that the Jeff Pickup model generalizes to many independent organizations.

**Success for the MVP** = an organizer who has never met us can:
1. Create an org, pick a subdomain, add a location, and set up a recurring schedule, **and**
2. Share their link so participants can join the next session in under ~30 seconds with no app install and minimal friction.

**Scale target:** 10–20 orgs, ~100 participants each at launch; architecture must comfortably support **well above 100** per org (thousands of total participants, tens of thousands of signups/month) without redesign.

**Explicitly out of scope for the MVP** (deferred, not deleted):
- Subscriptions, billing, payments.
- Custom domains per org (subdomains only for now).
- Native mobile apps.
- The PoC experiments: `aura`, `omegaball`, WhatsApp `bot/`.

---

## 2. Locked decisions

These were decided up front and drive the rest of the plan:

| Area | Decision |
| --- | --- |
| **Stack** | Next.js (App Router) on Vercel + Supabase (Postgres, Auth, RLS) + Vercel Cron. Lighter alternative noted in §11. |
| **Domain / tenancy** | `organizr.co`; subdomain per org (`<slug>.organizr.co`, e.g. `jeffsoccer.organizr.co`); every tenant-owned row carries `org_id`; isolation enforced by Postgres RLS. |
| **Activity-agnostic** | No sport-specific logic or copy. Each org sets its own activity; the product speaks in generic terms (session, who's coming, headcount). |
| **Participant identity** | Phone-as-identity, frictionless. `first_name` + `last_name` + optional `display_name`. Device-bound session token. SMS OTP verification is **scaffolded but dormant** — built into the schema/UI seams, not wired up, until an org actually needs it. |
| **Organizer onboarding** | Fully self-serve, gated by an `org.status` flag so we can still hand-seed/approve the first orgs. |
| **Scheduling** | Organizer-defined recurring schedules that auto-materialize event instances on a rolling window; one-off events supported. |
| **Arrival statuses** | The PoC's free-form emojis are replaced by a fixed, meaningful status set (e.g. "on my way", "running late", "stuck in traffic") shown on the roster. |
| **Deferred** | No waitlist, no leaderboards/caps/streaks/badges, and no PoC data import in the core MVP — built only after the fundamentals are solid. |

---

## 3. What we keep from the PoC

These are the validated, high-value features. They are reframed around **org → event** instead of "one global list per day."

- **Roster / signups** per session: join, see who's coming, headcount, self-unregister, guest counts.
- **Arrival status** per signup (replaces random emoji): a fixed, meaningful set like "on my way / running late / stuck in traffic" — see §9.1.
- **Settings that matter:** location, start time, capacity/goal, session status (`tentative` / `on` / `cancelled`), announcements.
- **Auto status promotion:** flips `tentative → on` when committed headcount ≥ the session's minimum.
- **i18n:** English + Spanish (extensible).
- **Weather:** Open-Meteo emoji/temp at start time for the session's location (no API key).
- **Shareability:** clean public link per org/session, social links, share-to-FB/WhatsApp copy.

> **Deferred (built after fundamentals):** "caps" (distinct sessions played), weekly streaks, and
> roster badges (new player / streak / milestones). Validated in the PoC and worth keeping, but
> they are *not* core MVP — see §15.

## 4. What we fix (PoC hack → product)

| PoC hack | Why it doesn't scale | MVP fix |
| --- | --- | --- |
| Identity = a name in `localStorage` | Anyone can be anyone; name collisions; organizers can't reach people | Phone-keyed participant profiles; device session token; optional OTP verification |
| Self-unregister via `delete_token` in `localStorage` | Lost token = orphaned row; no real ownership | Ownership tied to participant identity + session; RLS-enforced |
| Admin = 5 taps + client-baked `VITE_ADMIN_PIN` | Not secret; no real authz | Real auth (Supabase Auth) + `org_members` roles (owner/admin) checked in RLS |
| `app_settings` is **publicly writable** | Any anon key holder can change settings | Settings become per-org/per-event columns; writes gated by org-admin RLS |
| Single global `app_settings` row, 2 hardcoded locations, hardcoded URLs/branding | Single-tenant by construction | `org_id` on everything; org-owned locations, branding, schedules |
| One "active" session per day | Can't model real schedules across orgs | First-class `events` with their own date/time/location/capacity/status |
| Cross-component coordination via custom DOM events | Fragile, hard to reason about | Server state via React Query + URL routing + (optionally) Supabase Realtime |

---

## 5. Architecture overview

```
                      <slug>.organizr.co
                                │
                    ┌───────────▼────────────┐
                    │  Next.js (App Router)   │   Vercel
                    │  - middleware: resolve  │
                    │    subdomain → org      │
                    │  - SSR org/event pages  │
                    │  - route handlers (API) │
                    │  - cron endpoints       │◄──── Vercel Cron
                    └───────────┬────────────┘
                                │  Supabase JS (RLS-scoped)
                    ┌───────────▼────────────┐
                    │       Supabase          │
                    │  - Postgres (+ RLS)     │
                    │  - Auth (email magic    │
                    │    link; phone OTP      │
                    │    scaffolded, dormant) │
                    │  - Edge Functions       │
                    │    [optional]           │
                    └─────────────────────────┘
                                │
                         Open-Meteo (weather)
                         SMS provider (OTP) — not wired up yet
```

**Request flow:** Vercel wildcard domain (`*.organizr.co`) → Next.js `middleware.ts` reads the
host, extracts the org `slug`, looks it up (cached) → injects `org_id` into request context →
pages/handlers query Supabase. RLS guarantees a request can only read/write rows for orgs the
caller is allowed to touch.

**Why Next.js here:** subdomain routing via middleware, server-rendered shareable org/event
pages (organizers want links that look good in WhatsApp/FB previews), a natural home for the
recurring-event generator (cron route) and the OTP/identity endpoints, and it scales fine.

---

## 6. Multi-tenancy model

- **Org resolution:** `slug` (subdomain of `organizr.co`) → `orgs.id`. Cache slug→id (in-memory LRU + short TTL) to avoid a DB hit per request.
- **Reserved subdomains:** `www`, `app`, `api`, `admin`, `auth`, `assets`, `static`, `help`, `status`, `mail`, `blog` — cannot be claimed as org slugs.
- **Isolation:** every tenant table has `org_id uuid not null references orgs(id)`. RLS policies join through `org_members` for writes and allow public read only where the org has opted into a public roster.
- **No cross-tenant leakage:** the anon/public key is still used client-side, but RLS — not the app — is the security boundary. Settings are never publicly writable.

---

## 7. Identity, auth & roles

Two distinct actor types, two friction levels.

### 7.1 Participants (frictionless)

- **Identity key:** phone number, normalized to **E.164**. This is the dedup/collision key.
- **Profile fields:** `first_name`, `last_name`, optional `display_name` (defaults to `First L.`).
- **Join flow (first time):** enter name + phone → upsert a `participant` keyed by `(org_id, phone)` → issue a **device session token** (httpOnly cookie + mirror in `localStorage` for the SPA), so they're recognized on return without re-typing.
- **Verification (scaffolded, dormant for MVP):** the schema (`phone_verified`) and an org-level
  `require_phone_verification` flag exist, and the join UI leaves a seam for a "Verify your number"
  SMS OTP step — but **it is not wired up**. No SMS provider is integrated yet. We turn it on only
  when a real org asks for it. Until then, joining never requires OTP.
- **What this solves vs the PoC:** no more name collisions (phone is unique), organizers can contact no-shows, and ownership of a signup is real (tied to participant + session), not a `localStorage` secret.
- **Privacy:** public roster shows `display_name` only. Phone/last name are visible only to org admins.

### 7.2 Organizers / admins (real auth)

- **Auth:** Supabase Auth — **email magic link** (passwordless) for MVP. Phone OTP for organizers is supported by Supabase but left dormant alongside participant OTP.
- **Roles (`org_members.role`):**
  - `owner` — created the org; full control, can transfer/delete.
  - `admin` — manage schedules, events, locations, announcements, settings, see contact info.
  - (future) `coach`/`captain` — limited, post-MVP.
- A single auth user can belong to multiple orgs (one person can run several communities).

### 7.3 Linking the two

A participant who is also an organizer can have their `auth.user` linked to their participant
record (same phone). MVP keeps them as separate concerns to avoid coupling friction — a logged-in
organizer still "joins" sessions as a participant.

---

## 8. Data model (target schema)

Fresh Postgres schema (not a migration of the PoC). Names are indicative.

```
orgs
  id              uuid pk
  slug            text unique            -- subdomain, validated against reserved list
  name            text
  activity        text  -- free label, e.g. 'Pickup soccer', 'Run club' (activity-agnostic)
  status          text  -- 'active' | 'pending' | 'suspended'   (gate for self-serve)
  default_locale  text  -- 'en' | 'es'; prefilled from organizer's browser at creation, editable
  branding        jsonb -- MVP: logo_url + accent_color only (kept minimal)
  require_phone_verification  boolean default false  -- dormant OTP gate (see §7.1)
  created_by      uuid  -- auth user
  created_at      timestamptz

org_members
  org_id          uuid fk -> orgs
  user_id         uuid fk -> auth.users
  role            text  -- 'owner' | 'admin'
  created_at      timestamptz
  pk (org_id, user_id)

locations
  id              uuid pk
  org_id          uuid fk -> orgs
  label           text
  address_lines   text[]
  lat             double precision
  lon             double precision
  maps_url        text
  is_active       boolean

schedules                         -- recurring definition
  id              uuid pk
  org_id          uuid fk -> orgs
  location_id     uuid fk -> locations
  title           text
  byweekday       int[]   -- 0..6 (or store an RRULE string)
  start_time      time
  duration_min    int
  capacity        int
  min_players     int
  timezone        text    -- IANA; defaults to organizer's detected tz at creation, editable
  is_active       boolean

events                            -- materialized instance OR one-off
  id              uuid pk
  org_id          uuid fk -> orgs
  schedule_id     uuid fk -> schedules (nullable for one-offs)
  location_id     uuid fk -> locations
  starts_at       timestamptz
  capacity        int            -- soft cap; over-capacity shows "full" (no waitlist in MVP)
  min_players     int
  status          text  -- 'tentative' | 'on' | 'cancelled'
  announcement    text  -- per-event note (replaces global announcement)
  unique (schedule_id, starts_at)  -- idempotent materialization

participants                      -- a person within an org
  id              uuid pk
  org_id          uuid fk -> orgs
  phone           text    -- E.164
  first_name      text
  last_name       text
  display_name    text
  phone_verified  boolean default false  -- dormant; only set once OTP is wired up
  user_id         uuid    -- optional link to auth.users
  created_at      timestamptz
  unique (org_id, phone)

signups                           -- one participant per event
  id              uuid pk
  org_id          uuid fk -> orgs
  event_id        uuid fk -> events
  participant_id  uuid fk -> participants
  guest_count     int  default 0  -- 0..N
  arrival_status  text default 'confirmed'  -- meaningful status set, see §9.1
  created_at      timestamptz
  unique (event_id, participant_id)

audit_log (optional MVP+): who changed what, per org
```

**Notes**
- **Settings move into columns** on `schedules`/`events`/`orgs` instead of a publicly-writable
  key-value table. This is the single biggest security fix from the PoC.
- **Capacity, no waitlist (MVP):** `capacity` is a soft cap used to show headcount and a "full"
  state. Waitlist mechanics (overflow queue, promotion on cancellation) are explicitly deferred.
- **Leaderboards/caps/streaks** are **not** in the core schema yet. They're derived from
  `signups + events` and will be added (per `org_id`) only after the fundamentals ship (§15).
- **No PoC data import.** Fresh database; the Jeff org is created from scratch like any other.

### 8.1 RLS policy sketch

- `orgs`: public `select` of `name`/`slug`/`branding`/`status` for active orgs; `insert` by any authenticated user (self-serve); `update/delete` only by `owner`.
- `org_members`: readable/writable only within the same org by `owner`/`admin`.
- `locations`, `schedules`: `select` public (for the org's public page); writes restricted to org `admin/owner`.
- `events`: `select` public for active orgs; writes restricted to org `admin/owner` and the cron service role.
- `participants`: `select` restricted — public sees nothing; org admins see their org's participants; a participant sees their own record via session. `insert/update` of own record allowed.
- `signups`: `select` public exposes a **view** with `display_name` + `guest_count` + `arrival_status` only (no phone). `insert` allowed for a valid participant+session; `update` (change arrival status) and `delete` (unregister) only by the owning participant or org admin.

---

## 9. Core features (MVP scope)

1. **Org public page** (`<slug>.organizr.co`): branding, activity label, next upcoming event(s), and a prominent "Join" CTA. SSR for good link previews.
2. **Event roster:** live list of who's coming, headcount vs capacity, guest counts, each person's **arrival status** (§9.1), session status, weather, location + map link.
3. **Frictionless join / unregister:** name + phone, recognized on return, self-unregister.
4. **Recurring schedules + auto-materialization:** organizer defines cadence; cron generates upcoming `events` in a **rolling 30-day window** that continuously rolls forward, so participants can sign up to any session within the active recurring schedule.
5. **One-off events:** organizer can add/cancel a single session.
6. **Capacity + auto status promotion** (`tentative → on` at min players). Over capacity shows "full" — no waitlist in MVP.
7. **Announcements** per event (and org-level optional).
8. **i18n** (EN/ES) with per-org default locale.
9. **Weather** per event location.
10. **Organizer console:** manage org profile/branding/activity, locations, schedules, events, view roster + participant contact, export CSV (nice-to-have).

> **Not in core MVP:** leaderboards, caps, weekly streaks, and badges (deferred — §15).

### 9.1 Arrival status (replaces the PoC's random emojis)

In the PoC, emojis on the roster were arbitrary. Here, each signup carries one **meaningful status**
from a fixed, app-defined set — useful info for organizers and other players. Each maps to an emoji
+ localized label; a participant can set/change it on their own signup at any time.

| status | emoji | label (EN) |
| --- | --- | --- |
| `confirmed` | ✅ | I'm in (default) |
| `on_my_way` | 🚗 | On my way |
| `running_late` | ⏰ | Running late |
| `in_traffic` | 🚦 | Stuck in traffic |
| `maybe` | ❓ | Maybe |
| `cant_make_it` | 🙅 | Can't make it |

- The set is defined in app config (not free-form), localized via i18n, and easily extended.
- `cant_make_it` is effectively a soft self-unregister/no-show signal the organizer can see.
- Org-configurable custom status sets are a **post-MVP** nicety; MVP ships the fixed list above.

---

## 10. Registration & onboarding flows

### 10.1 Organizer onboarding (self-serve)

1. Land on marketing/root (`organizr.co` / `www`), click **Create your group**.
2. **Sign in** (passwordless email magic link) → creates an `auth.user`.
3. **Create org:** name + **activity** label + desired **slug** (live availability check against reserved + taken list) → `<slug>.organizr.co`.
   - Org created with `status = 'active'` by default; we can flip the default to `'pending'`
     to hand-approve the first cohort without code changes.
4. **Add a location** (label, address → geocode lat/lon, maps link).
5. **Create a recurring schedule** (days, time, duration, capacity, min players, timezone).
   - Cron immediately materializes the next instances so the page isn't empty.
6. **Customize** (optional): logo, color, default language, announcement.
7. **Publish & share:** copy `<slug>.organizr.co` + auto-generated WhatsApp/FB share text.

Result: a working public page with upcoming sessions, in minutes, with zero help from us.

### 10.2 Participant onboarding (frictionless)

1. Open the org link (`<slug>.organizr.co`) — sees the **next session** and current roster.
2. Tap **Join**.
3. First time: enter **first name, last name, phone** (optional `display_name`). Submit.
   - (Dormant seam: a "Verify number" OTP step lives here but is off until an org needs it.)
4. Instantly on the roster; device session remembers them. They can set an **arrival status** (§9.1).
5. Returning: recognized → one-tap **Join** for any upcoming session; can unregister anytime.

### 10.3 Returning across devices

- New device → entering the same phone re-links to the existing participant. (Once OTP is wired up,
  a quick code can confirm ownership; until then, re-linking is by phone match alone.)

---

## 11. Background jobs

- **Event materializer (cron, e.g. hourly/daily):** for each active schedule, ensure `events`
  exist for the **rolling 30-day window** (rolls forward each run); idempotent via `unique (schedule_id, starts_at)`. The window can be lengthened later without schema changes since the recurring schedule is the source of truth.
- **Status/cleanup:** mark past events, optionally auto-cancel sessions that never hit min players (org-configurable, MVP+).
- **Reminders (MVP+):** SMS/push "you're on for tonight" — designed for now, built after validation.

Runtime options: **Vercel Cron → Next route handler** (recommended, uses Supabase service role),
or Supabase `pg_cron` + Edge Function. Either works; Vercel Cron keeps logic in one codebase.

---

## 12. Security model (summary)

- **RLS is the boundary**, not the client. Anon key may be public; policies enforce per-org access.
- **No publicly writable settings** (the worst PoC hole) — settings are columns gated by org-admin RLS.
- **Participant privacy:** public roster view exposes display name + guest count only.
- **Rate limiting** on join/OTP endpoints (per IP + per phone) to prevent abuse.
- **Reserved slugs** and slug validation to prevent subdomain squatting/impersonation.
- **Audit trail** for admin actions (lightweight in MVP).

---

## 13. Tech choices & repo structure

**Recommended (plan of record):** Next.js (App Router, TypeScript) on Vercel + Supabase + Tailwind + React Query (or RSC + server actions where it fits) + `@supabase/ssr`.

**Lighter alternative** (if we want minimal change from the PoC): keep the existing **Vite + React SPA**, add Supabase **Auth + RLS**, do subdomain resolution client-side, and run materialization via Supabase `pg_cron` + Edge Functions. Faster to start from the current code, but worse link previews and a more awkward home for cron/OTP. Recommendation is Next.js.

Proposed structure for this subdirectory:

```
pickup-platform/
  README.md
  docs/
    MVP_PLAN.md            <- this file
  app/                     <- Next.js app router (when scaffolded)
    (marketing)/           <- root domain: landing, create-org, auth
    (org)/                 <- subdomain-scoped: public page, event, join
    (console)/             <- organizer admin console
    api/ or route handlers <- cron, otp, webhooks
  lib/
    supabase/              <- server & browser clients, RLS-aware helpers
    tenancy/               <- slug resolution, reserved list
    i18n/, date/, weather/
  middleware.ts            <- subdomain -> org resolution
  supabase/
    migrations/            <- fresh schema (orgs, members, events, ...)
    policies/              <- RLS
```

---

## 14. Data & migration

- **Fresh database.** Do **not** carry over the PoC schema (key-value settings, single-tenant).
- **No data import.** We do **not** migrate the PoC's signups/caps/streaks. The Jeff community is
  created from scratch like any other org (slug `jeffsoccer`, activity "Pickup soccer", its two
  locations, a recurring schedule) — which doubles as our first real self-serve onboarding test.

---

## 15. Phased delivery

Sequenced so each phase is shippable/testable. Fundamentals first; engagement features come only
after the core loop works.

- **Phase 0 — Foundation:** Next.js app, Supabase project, Tailwind, organizer auth (email magic link), base schema (`orgs`, `org_members`), subdomain (`*.organizr.co`) middleware + reserved slugs, RLS scaffolding.
- **Phase 1 — Org + events core:** activity-agnostic org profile, locations, schedules, event materializer cron, organizer console to create them, public org page rendering upcoming events.
- **Phase 2 — Participant identity + roster (the core loop):** phone-keyed participants, device sessions, frictionless join/unregister, guest counts, **arrival statuses** (§9.1), capacity + auto status promotion, announcements. OTP seams present but **dormant** (`require_phone_verification` flag, verify step stubbed, no SMS provider).
- **Phase 3 — Lightweight polish:** weather, i18n (EN/ES), share text, branding, and the end-to-end self-serve org-creation wizard with slug availability UX. Create the Jeff org as the first real tenant.
- **Phase 4 — Engagement (after fundamentals are solid):** per-org caps + weekly streaks + roster badges, CSV export.

(Waitlist, OTP activation, reminders, custom domains, billing, role expansion, org-custom status sets = post-MVP.)

---

## 16. Decisions resolved

- **Name + domain:** Headcount, `organizr.co`; orgs at `<slug>.organizr.co` (e.g. `jeffsoccer.organizr.co`). ✅
- **OTP:** scaffolded but dormant — no SMS provider wired up until a real org needs it. ✅
- **Waitlist:** out of MVP. ✅
- **Phone privacy regs:** not a design concern for MVP. ✅
- **Data import:** none — fresh DB; Jeff org created from scratch. ✅
- **Leaderboards/caps/streaks/badges:** deferred to Phase 4, after fundamentals. ✅
- **Activity-agnostic:** product is generic; activity defined per org. ✅
- **Arrival statuses:** fixed meaningful set replaces random emojis (§9.1). ✅
- **Timezone:** `schedule.timezone` defaults to the organizer's detected timezone at creation and is editable per schedule. ✅
- **Locale:** `org.default_locale` is prefilled from the organizer's browser at creation and editable; participants can still toggle EN/ES. ✅
- **Materialization window:** rolling **30 days**, continuously rolling forward; extensible later without schema changes. ✅
- **Branding (MVP):** logo + accent color only — no hero media. ✅
