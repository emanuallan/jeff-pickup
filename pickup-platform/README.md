# Headcount

**`organizr.co`** — a multi-tenant, activity-agnostic platform for organizing recurring group
activities and tracking who's coming.

Each organization gets its own subdomain, e.g. `jeffsoccer.organizr.co`.

> The original PoC lives in the repo root (`../`). **Do not build new product features there.**

## Status

**Phase 3 — Polish & onboarding** (built; i18n deferred to last)

- Live slug availability in org creation
- Branding: logo URL + accent color
- Weather on event pages (Open-Meteo) + address geocoding
- Share button (native share / clipboard)
- Remaining: i18n EN/ES (intentionally last)

See [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md) for the full plan and [`docs/TODO.md`](docs/TODO.md) for what's next.

## Quick start

```bash
cd pickup-platform
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

1. Create a **new** Supabase project and run migrations `001` + `002` — see [`supabase/README.md`](supabase/README.md).
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (for generating sessions).
3. Open `http://localhost:3000`, sign in at `/login`, create a group at `/console/new`.
4. Add a location → schedule → **Generate next 30 days** → view `http://your-slug.localhost:3000`.

For local subdomain testing, set in `.env`:

```
NEXT_PUBLIC_ROOT_DOMAIN=localhost
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Project structure

```
pickup-platform/
  app/                  # Next.js App Router
    (marketing)/        # landing, login
    org/[slug]/         # public org pages (also served via subdomain rewrite)
    console/            # organizer console
    auth/               # callback, signout
  lib/
    supabase/           # browser + server clients
    tenancy/            # subdomain parsing, reserved slugs
  middleware.ts         # subdomain → /org/[slug] rewrite
  supabase/migrations/  # Postgres schema + RLS
  docs/                 # MVP plan, TODOs
```
