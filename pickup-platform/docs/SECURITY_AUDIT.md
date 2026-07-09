# Security Audit — Alpha (July 2026)

Practical security review of the Organizr Next.js app (`pickup-platform/`). This is an alpha hardening pass, not an enterprise certification.

## Executive summary

**No critical IDOR or missing console-auth bugs were found** in route handlers. Organizer access is enforced server-side via `getOrgForMember` + Supabase RLS; public participant writes use SECURITY DEFINER RPCs with session-token checks; service role usage is narrow (materializer, logo storage, org delete, sponsor logo upload, Stripe webhook writes).

Main residual risks are **intentional alpha UX tradeoffs** (phone-only session recovery), **operational gaps** (rate limits, cron secret hygiene), and dependency advisories in Next.js’s PostCSS transitive dependency.

---

## Findings by severity

### Critical

None identified in application-layer authorization for console/PII data access.

### High (documented — deferred)

| Issue | Location | Status |
|-------|----------|--------|
| Phone-only session recovery | `recover_participant_session` RPC, `recoverSession` action | **Documented only** — anyone who knows a participant’s 10-digit phone can obtain a session token for that org. OTP verification planned (`require_phone_verification` in schema is dormant). |
| No rate limiting | `/auth/verify-otp`, console PII CSV routes, public headcount poll | Documented — relies on Supabase OTP throttling for login |
| `CRON_SECRET` bearer = global write | `/api/cron/materialize` | Documented — rotate secret; restrict by IP when possible |

### Medium (addressed in this pass unless noted)

| Issue | Fix |
|-------|-----|
| Client-trusted `orgId` in `quickJoinEvent` | **Fixed** — org derived server-side from slug |
| Location URLs unsanitized on save/render | **Fixed** — `normalizeLinkUrl` on save; `safeExternalHref` at render |
| `location_id` not verified to belong to org | **Fixed** — `assertLocationInOrg` in schedule/event actions |
| `safeNextPath` bypass vectors | **Fixed** — reject `\`, `@`, encoded `//`, control chars, hostname tricks |
| Public actions used `getOrgBySlug` | **Fixed** — use `getPublicOrgBySlug` for active-org consistency |
| Console auth not in middleware | Documented — per-page checks + RLS backstop |
| Phone enumeration via recovery errors | Documented — no RPC changes this pass |
| No console API route tests | **Partial** — participants route smoke test added |

### Low (documented unless fixed)

| Issue | Status |
|-------|--------|
| CSRF on `POST /auth/signout` | Documented — nuisance only; `SameSite=Lax` mitigates |
| Unauthenticated `checkSlugAvailability` | Documented — slug enumeration |
| Logo MIME trust without magic bytes | **Fixed** — `validateLogoFileContent` |
| Supabase RPC errors returned to client | Documented |
| `JsonLd` uses `dangerouslySetInnerHTML` | Documented — safe (server-built JSON via `JSON.stringify`) |
| Interior operator UUID in source | Documented — RPC re-checks `auth.uid()` |
| Events readable cross-tenant for active orgs | Documented — RLS by design for public pages |
| PostCSS transitive advisory (via Next.js) | Documented — see npm audit below |

---

## Fixes applied (this pass)

| Area | Change |
|------|--------|
| Post-login redirects | Hardened [`lib/safe-next.ts`](../lib/safe-next.ts) |
| Quick join | Removed client `orgId`; derive from [`getPublicOrgBySlug`](../lib/public-data.ts) |
| Public actions | All org lookups via `getPublicOrgBySlug` in [`actions.ts`](../app/org/[slug]/cal/[eventId]/actions.ts) |
| Location URLs | Normalize on save in [`parse-location-form.ts`](../lib/console/parse-location-form.ts); safe render in [`event-ui.tsx`](../app/org/[slug]/_components/event-ui.tsx) via [`safeExternalHref`](../lib/social-links.ts) |
| Location ownership | [`assertLocationInOrg`](../lib/console/location-ownership.ts) in schedule/event create/update |
| Logo uploads | Magic-byte check in [`validateLogoFileContent`](../lib/org-logo.ts) |

---

## Tests added

| File | Coverage |
|------|----------|
| `lib/safe-next.test.ts` | Open-redirect hardening cases |
| `lib/console/parse-location-form.test.ts` | URL normalization / unsafe scheme stripping |
| `lib/console/location-ownership.test.ts` | Location org ownership helper |
| `lib/org-logo.test.ts` | PNG/JPEG/WebP magic bytes |
| `app/api/console/[orgSlug]/participants/route.test.ts` | 401 vs 200 auth smoke test |
| `lib/sponsorship.test.ts` | Sponsorship validators and lifecycle helpers |
| `lib/sponsor-logo.test.ts` | Sponsor logo storage path helpers |
| `lib/console/parse-sponsorship-tier-form.test.ts` | Tier form parsing |
| `app/api/sponsorship/checkout/route.test.ts` | Checkout validation and session creation |
| `app/api/webhooks/stripe/route.test.ts` | Webhook signature + checkout handler |
| `app/api/console/[orgSlug]/sponsorship/connect/route.test.ts` | Connect route auth |
| `app/org/[slug]/_components/org-sponsor-footer.test.tsx` | Public sponsor logo strip |

**Total:** 283 tests passing after sponsorships pass.

---

## Verification commands & results

Run from `pickup-platform/` on 2026-07-05:

| Command | Result |
|---------|--------|
| `npm run test` | **Pass** — 33 files, 144 tests |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass** |
| `npm run build` | **Pass** |
| `npm audit --audit-level=moderate` | **2 moderate** — PostCSS advisory in Next.js transitive dependency ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)). `npm audit fix --force` would downgrade Next.js — **not applied**. Monitor Next.js releases for patched PostCSS. |

---

## Architecture notes (unchanged, verified)

- **Middleware** refreshes Supabase sessions; does not gate `/console` (per-page auth instead).
- **Console API routes** consistently use `getOrgForMember` → 401; events scoped to authorized `org.id`.
- **Public headcount API** is intentionally public (`slug` + 8-char `short_id`).
- **Cookies:** Supabase auth (httpOnly, `SameSite=Lax`, secure in prod, `.organizr.co` domain); participant `hc_session` (host-scoped); visitor `hc_visitor` (httpOnly).
- **Secrets:** Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ROOT_DOMAIN` in client bundle. `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are server-only.

---

## Unresolved risks & recommended next steps

1. **Phone session recovery** — Add OTP step before issuing session tokens; enable `require_phone_verification` when ready.
2. **Rate limiting** — OTP verify, recovery, PII CSV exports, headcount polling (Vercel WAF / Upstash / Supabase edge).
3. **Middleware console gate** — Redirect unauthenticated `/console/*` to login (currently some routes return 404).
4. **Console API test suite** — Extend smoke tests to roster, visitors, analytics-detail, unregistered routes.
5. **Cron hardening** — Rotate `CRON_SECRET`; add IP allowlist if host supports it.
6. **Security headers** — Review CSP and `Referrer-Policy` in `app/layout.tsx`.
7. **Audit logging** — Log PII CSV downloads with user/org context.
8. **Dependency updates** — Upgrade Next.js when PostCSS advisory is resolved upstream.
9. **Role model** — If non-admin org members are added, update both app checks and RLS.

---

## Explicitly out of scope (this pass)

- Changes to `recover_participant_session` RPC or recovery UX
- Middleware console redirect
- Rate-limit infrastructure
- OTP verification implementation
- RLS/migration changes
