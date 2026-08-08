# Organizr rebuild — Phases 0–1 (plan only)

**Status:** Planning artifact · **Ship cadence:** two phases at a time · **Build location:** future **separate private GitHub repo** (not inside jeff-pickup)

This document gathers the product decisions from the redesign discussion, a once-over of what the current Next app got wrong (including Vercel Fluid Active CPU with a single org), live-roster improvements, and the concrete Phase 0–1 build plan.

Current code in [`pickup-platform/`](../) is **reference only** — port jobs and lessons, not god-modules or dual-identity hacks.

---

## 1. Decisions locked

| Topic | Decision |
| --- | --- |
| Repo | Plan now; later a **separate private** monorepo |
| Cadence | **Two phases at a time** → this doc = **Phase 0 + Phase 1** |
| Mobile | **Expo (React Native)** |
| Web | **Next.js App Router** (join + OG/share front door) |
| Backend | **Supabase** (Postgres / Auth / Storage) — not Convex |
| Identity | One global **user**; per-org **memberships** + roles (`owner` / `admin` / `participant`) |
| App home | Create groups **and** see all groups you belong to (admin or player) |
| Participant funnel | Web-first join (no install); app is the upgrade |
| Paid (later) | **Stripe Connect** (lazy onboarding when enabling paid) |
| Wallet / name-only join | Later; schema allows nullable `user_id` on signups for guest seats |
| Bots | Later, same API (Telegram first) |
| **Platform branding** | Keep **Organizr** (name, domain, logo asset). Centralize in one constants module so name/logo/colors/tagline are trivial to swap. Per-org accent/logo remain tenant branding and are separate. |
| **Platform accent** | **`#615fff`** — single source of truth in `BRAND.color.accent` (web CSS vars + Expo theme). |
| **UX bar** | **Premium, Robinhood-like** for organized pickup sports: intuitive, simple, clean. Calm dark UI, decisive hierarchy, minimal chrome, purposeful motion — never cluttered “admin dashboard” energy on core flows. |
| **Auth OTP channel** | **Email OTP first** (cheap/free tiers). Platform config toggles **email \| sms \| both** so SMS can turn on later without a rewrite. Same “enter contact → 6-digit code” UX; only the contact field changes. |
| **Public positioning** | **Soccer-only** in marketing / apex copy for now (“pickup soccer”, pitches, kick-off). Product data stays multi-sport-ready. |
| **Group sport type** | Every org has a `sport` (or `activity_type`) enum/text field; **default `soccer`**. Used later for copy, defaults, and features per sport. In-app chrome can stay mostly generic (“session”, “who’s coming”) unless sport-specific UI is intentional. |

---

## 2. Platform brand tokens (keep Organizr; make swappable)

Current app already has a thin [`lib/organizr-brand.ts`](../lib/organizr-brand.ts) but hardcodes the wordmark in UI and splits accents. Rebuild locks platform accent to **`#615fff`** and puts all brand tokens in one module.

**Rebuild rule:** one module in `packages/core` (e.g. `brand.ts`) consumed by web + mobile:

```ts
export const BRAND = {
  name: 'Organizr',
  nameLegal: 'Organizr',
  domain: 'organizr.co',
  tagline: 'Know who’s coming', // or current marketing line
  logo: {
    mark: '/brand/organizr-logo.png',       // symbol
    // wordmarkMark optional if you add a lockup asset later
  },
  color: {
    accent: '#615fff',      // locked platform accent
    background: '#0a0a0a',
    foreground: '#fafafa',
    muted: '#a1a1aa',
  },
} as const
```

- UI never hardcodes `"Organizr"` or hex accents — import `BRAND.name` / `BRAND.color.accent`
- OG images, emails, Expo splash/icon, and marketing all read the same constants
- Changing brand later = edit constants + replace assets under `/brand/`

**Tenant branding** (`orgs.branding.logo_url`, `accent_color`) stays orthogonal: platform chrome uses `BRAND`; public group pages use org accent (fallback to platform `#615fff` when unset).

### UX principles — premium pickup (Robinhood-like)

Borrow the *feel*, not the finance metaphors:

| Principle | In practice |
| --- | --- |
| **One job per screen** | Create session, join, roster — no settings kitchen sinks on the happy path |
| **Decisive hierarchy** | Big next session / headcount / primary CTA; secondary actions quiet |
| **Clean density** | Prefer whitespace and typography over cards-in-cards, pill clusters, stat strips |
| **Thumb-first** | Large tap targets; primary action reachable; sheets for short tasks |
| **Purposeful motion** | 2–3 polished transitions (join confirm, roster enter, tab/page) — no noise |
| **Instant feedback** | Optimistic join/leave; skeleton only when needed; never full-page thrash |
| **Trust calm** | Dark zinc base + `#615fff` accent; high contrast type; avoid generic purple-glow SaaS clutter |
| **Organizer speed** | Create → share in as few steps as possible; advanced options progressive |

**Flow review bar (Phases 0–1):** if a step doesn’t help create, share, or join, cut it or bury it.

### Identity notes (suggestions — not blocking)

Keep **Organizr** for the rewrite unless you deliberately rename. It already owns `organizr.co` and matches “create/run a group.”

If you ever revisit naming, the tension is:

| Direction | Pros | Cons |
| --- | --- | --- |
| **Organizr** (current) | Known domain; broad enough for any activity | Generic “organizer” misspelling; weak wedge signal (“headcount”) |
| **Headcount** (old codename) | Owns the core job: who’s coming | Narrower; rename/domain cost |
| **Organizr** product + sharper line | Keep brand; sell the job in the tagline | Needs consistent visual + copy |

**Practical recommendation:** stay **Organizr**, tighten execution in Phase 0/1:

1. **Accent locked:** `#615fff` everywhere platform chrome touches.
2. **One tagline** tied to the wedge (who’s coming / session headcount), used on marketing + OG.
3. **Constants module** so a future rename/rebrand is a config + asset change, not a rewrite.
4. Premium UX principles above as the design bar for every flow.

No rename in Phases 0–1 unless you explicitly decide otherwise.

### Auth — email OTP first, SMS later (toggleable)

**Why this fits:** SMS costs money per message; email OTP on Supabase + a free/cheap SMTP provider (Resend/Brevo/SendGrid free tier) is enough while raising capital. Paying users / paid sessions are when SMS (or phone verify) earns its keep.

**Design**

```ts
// packages/core — platform config (env-driven)
export type OtpChannel = 'email' | 'sms'
export type OtpMode = 'email' | 'sms' | 'both'  // both = user picks, or email default + optional phone

// v1 default
export const AUTH_OTP_MODE: OtpMode = 'email'
```

- Supabase Auth supports both; app reads `AUTH_OTP_MODE` (or `NEXT_PUBLIC_AUTH_OTP_MODE`)
- **v1 UI:** email only — one field, send code, verify
- **Later:** flip to `sms` or `both` without changing membership/session model
- Store **both** `email` and `phone` on `users` as nullable; at least one verified identifier required
- Linking path later: “Add phone” for users who started on email (needed before hard SMS or paid trust)
- Custom SMTP early if built-in Supabase email rate limits bite (still far cheaper than SMS)

**Don’t:** build two fully separate auth products. One OTP flow, channel selected by config (+ optional user choice when `both`).

### Soccer-first public, multi-sport data

- **Apex / marketing / OG for the platform:** speak pickup soccer only for now.
- **Org model:** store sport type from day one so basketball, run club, etc. don’t require a schema rewrite later.

```ts
// packages/core — extend over time; DB stores the value
export const SPORT_TYPES = ['soccer', 'basketball', 'volleyball', 'running', 'other'] as const
export type SportType = (typeof SPORT_TYPES)[number]
export const DEFAULT_SPORT: SportType = 'soccer'
```

- `orgs.sport` not null, default `'soccer'`
- Create-group flow can hide the picker in v1 (always soccer) or show a disabled “more sports soon”
- Future: sport-aware labels, default session length/capacity, and marketing surfaces per type — without changing tenancy

---

## 3. Product north star

Make **creating sessions**, **sharing sessions**, and **signing up** as frictionless as possible.

```
Organizer (app): create group → location → session → share link
Participant (web): open link → join in ~30s → optional “get the app”
Returning user (app): see all groups + next sessions; admin where roles allow
```

---

## 4. What the current app got wrong

### 4.1 Product / architecture

| Smell | Evidence (current) | Rebuild rule |
| --- | --- | --- |
| Soft per-org phone identity | `participants` unique `(org_id, phone)`; host-scoped `hc_session` | Global `users` + `memberships`; phone is a verified attribute |
| Dual auth cookie maze | Organizer `sb-*` vs soft session writers in actions + APIs | One session strategy; organizer auth never shares participant cookie plumbing |
| Mutation soup | Server actions + RPCs + route handlers + Telegram parallel stack | Typed API both Expo and Next call |
| God-modules | `join-section.tsx` ~965, `console/actions.ts` ~1422, `og-image.tsx` ~1534 | Split by domain from day one |
| Dishonest routing | `/cal/[eventId]` redirects; UI under `/?cal=` | Honest `/s/[sessionId]` (or equivalent) under tenant host |
| Feature accretion | Feed, MVP, sponsorships, Telegram while join/console sprawl | Phases 0–1 = create / share / join only |

### 4.2 Data efficiency — Vercel Fluid Active CPU with one org

The Vercel warning is **Fluid Active CPU** (free tier included hours), not tenant scale. With one org this is **self-inflicted continuous compute**.

**Top offenders**

1. **Live headcount poll** (`lib/live-session-poll.ts` + `app/api/org/.../headcount`) — every **20s**, `Cache-Control: no-store`, returns **full roster + waitlist**. N open tabs ⇒ continuous serverless invocations.
2. **Middleware `auth.getUser()` on public traffic** — anonymous HTML still pays Supabase session refresh.
3. **Always-dynamic public SSR** — `cookies()` for soft session in org layout; stacked layouts refetch org/sponsors/events; participation loads roster + per-person engagement/badge RPCs on first paint.
4. **OG/share `ImageResponse` (Satori)** + share button `cache: 'no-store'` — CPU/memory spikes on crawl/share.
5. **`router.refresh()` after join/leave** + per-visit page-view `after()` inserts — re-run full SSR tree; unbounded analytics writes.

Daily cron materialize is **not** a top continuous offender.

```
Every open tab ──20s──► full roster poll (no-store) ──► Fluid CPU
Every HTML hit ───────► middleware getUser + dynamic SSR fan-out ──► Fluid CPU
Share / OG ───────────► Satori image gen ──► Fluid CPU spikes
Join/leave ───────────► router.refresh() full tree ──► Fluid CPU
```

### 4.3 Live roster — target model

Do **not** port the 20s full-roster poll.

- Prefer **Supabase Realtime** (or SSE) on signups for the open session
- Poll **only as fallback**: tiny `{ version, headcount, status }` — never full roster on the wire
- Single client **session store** (roster, headcount, `mySignup`); mutations **optimistic** then confirm
- No full `router.refresh()` for roster edits; revalidate tagged public metadata only when needed
- Pause when tab hidden / session ended; rate-limit public live endpoints

---

## 5. Target system (Phases 0–1)

### Monorepo (future private repo)

```
organizr/
  apps/web                 # Next.js — marketing, public session, join, OG
  apps/mobile              # Expo — auth, your groups, create session
  packages/core            # types, validators, API client, domain helpers
  supabase/migrations
  docs/ROADMAP.md
  docs/EFFICIENCY.md       # non-negotiable perf rules
```

Tooling: **pnpm workspaces + Turborepo**, TypeScript everywhere.

### Core schema (Phase 0)

- `users` — global person (auth id, phone, names)
- `orgs` — slug, name, **`sport` (default `soccer`)**, optional free-text activity label, branding, status
- `memberships` — `(user_id, org_id)` + roles; admin can appear on rosters
- `locations`, `sessions` (one-off in Phase 1; schedules in Phase 2)
- `signups` — `session_id` + **nullable `user_id`** (guest/name-only later) + display fields, guests, arrival_status

RLS: public read of active org + public session + public roster view; writes via authenticated user or security-definer join helpers.

### Efficiency rules (non-negotiable)

Write these into `docs/EFFICIENCY.md` when the repo is created:

1. Anonymous public routes: **no** Supabase `getUser` in middleware.
2. Cacheable public shell: anonymous session page must not require participant cookies; personalize via small client island.
3. **No full-roster polling.** Realtime or `{version,headcount,status}` only.
4. **No `router.refresh()` for roster mutations** — patch local store.
5. OG/share: CDN TTLs; never `cache: 'no-store'` on share download.
6. Analytics: sample or unique-per-viewer-per-day; prefer edge beacon.
7. First paint: headcount + join CTA before badges/engagement.
8. Exit gate: measure “open session page + idle 2 min” invocations/min before calling Phase 1 done.

---

## 6. Phase 0 — Foundations

**Goal:** One account; create/belong to groups; roles work; both clients boot against one API.

**Build**

- Supabase project + migrations: users / orgs / memberships (`orgs.sport` default `soccer`; users.email + users.phone nullable)
- **Email OTP auth** (mode config defaults to `email`; SMS wired as dormant/toggle)
- Typed API: create org, list my orgs, get org, membership helpers
- Next.js: login (email OTP), **soccer-positioned** marketing shell, auth callback
- Expo: login (email OTP), Your groups (empty states), create group (sport defaults to soccer; picker optional/hidden)
- Middleware: host → org rewrite only; **no `getUser` on anonymous public routes**
- `packages/core` types + API client + **`brand.ts`** + **`SPORT_TYPES` / `DEFAULT_SPORT`**
- `docs/EFFICIENCY.md` + roadmap stub

**Out:** sessions, join, roster, payments, bots, recurrence, multi-sport marketing

**Exit:** Sign in on web or app → create a group (sport=`soccer`) → see it under Your groups → role = owner.

---

## 7. Phase 1 — Create / share / join

**Goal:** Create a session, share a link with preview; stranger joins on web in ~30s without installing the app.

**Build**

- Locations CRUD (app-first)
- One-off session create (app-first)
- Honest public URL, e.g. `https://{slug}.organizr.co/s/{sessionId}` (SSR)
- OG image route with **CDN cache headers**
- Web join / leave / roster / headcount (real user; lazy OTP OK)
- App: create session + join for signed-in members
- Post-join “Get the app” nudge only after success
- Live updates: Realtime **or** tiny versioned poll; single client store; optimistic join/leave
- Analytics: beacon / deduped upsert — not unbounded SSR `after()` inserts

**Out:** recurrence (2), push/multi-group home polish (3), Connect (4), Telegram (6)

**Exit:** App create location + session → share → OG works → web join → roster updates for open viewers without refresh storms / full-roster polling. Create / share / join flows pass the premium UX bar (one job per screen, calm hierarchy, purposeful motion, `#615fff` accent only).

---

## 8. Full roadmap (later two-phase slices)

| Slice | Phases | Focus |
| --- | --- | --- |
| **This plan** | **0–1** | Foundations + create/share/web join |
| Next | 2–3 | Recurrence + organizer speed; multi-group app + push |
| Then | 4–5 | Stripe Connect paid sessions; identity hardening |
| Then | 6–7 | Telegram on same API; wedge polish |
| Later | 8 | Guest/name-only join, wallet, engagement extras |

---

## 9. Deliberately do not port

- Soft-only `hc_session` per org as product identity
- `/cal` + query-param shell + legacy redirect matrix
- Join / console / OG god-modules as-is
- 20s full-roster headcount poll
- Middleware auth refresh on public pages
- Telegram, sponsorships, feed, MVP, leaderboards into v1
- Jeff Pickup Vite root, aura, omegaball
- Wallet / platform subscriptions

---

## 10. When build starts (checklist)

1. Create **private** repo + pnpm/turbo monorepo skeleton  
2. New Supabase project + Phase 0 migrations  
3. Implement Phase 0 → Phase 1 against efficiency checklist  
4. Keep `pickup-platform/` open only as behavioral reference  
5. After 0–1 ships: write the **Phases 2–3** plan next  

No scaffold in jeff-pickup as part of this planning phase.
