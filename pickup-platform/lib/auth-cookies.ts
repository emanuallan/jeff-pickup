import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import type { ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { getSupabaseCookieOptions, supabaseCookieRootDomain } from '@/lib/supabase/cookie-options'

type WritableCookies =
  | Pick<ResponseCookies, 'set' | 'delete'>
  | ReadonlyRequestCookies

export function getParticipantCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  }
}

function expiredCookieBase() {
  const { path, sameSite, secure } = getSupabaseCookieOptions()
  return {
    path: path ?? '/',
    sameSite,
    secure,
    maxAge: 0,
    expires: new Date(0),
  }
}

/** Expire a cookie for host-only and any configured root-domain variants. */
export function expireCookieEverywhere(store: WritableCookies, name: string) {
  const base = expiredCookieBase()
  store.set(name, '', base)

  const root = supabaseCookieRootDomain()
  if (root) {
    store.set(name, '', { ...base, domain: `.${root}` })
    store.set(name, '', { ...base, domain: root })
  }
}

/** Clear hc_session using the same attributes as setSessionToken (host-scoped by default). */
export function clearParticipantSession(store: WritableCookies) {
  const expired = {
    ...getParticipantCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  }

  store.set(SESSION_COOKIE, '', expired)

  const root = supabaseCookieRootDomain()
  if (root) {
    store.set(SESSION_COOKIE, '', { ...expired, domain: `.${root}` })
    store.set(SESSION_COOKIE, '', { ...expired, domain: root })
  }

  if ('delete' in store && typeof store.delete === 'function') {
    store.delete(SESSION_COOKIE)
    if (root) {
      store.delete({ name: SESSION_COOKIE, domain: `.${root}` })
      store.delete({ name: SESSION_COOKIE, domain: root })
    }
  }
}

/** Clear participant session on the incoming request store and the outgoing response. */
export async function applyParticipantSessionClear(response: NextResponse) {
  const cookieStore = await cookies()
  clearParticipantSession(cookieStore)
  clearParticipantSession(response.cookies)
}

function collectSupabaseAuthCookieNames(
  request: NextRequest,
  extraCookies: Array<{ name: string }>,
): string[] {
  const names = new Set<string>()
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      names.add(cookie.name)
    }
  }
  for (const cookie of extraCookies) {
    if (cookie.name.startsWith('sb-')) {
      names.add(cookie.name)
    }
  }
  return [...names]
}

/** Belt-and-suspenders cleanup after Supabase sign-out (handles legacy host-only cookies). */
export function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
  extraCookies: Array<{ name: string }> = [],
) {
  for (const name of collectSupabaseAuthCookieNames(request, extraCookies)) {
    expireCookieEverywhere(response.cookies, name)
  }
}

export async function clearAuthCookiesForSignOut(
  request: NextRequest,
  response: NextResponse,
) {
  const cookieStore = await cookies()
  clearParticipantSession(response.cookies)
  clearSupabaseAuthCookies(request, response, cookieStore.getAll())
}

/** Organizer sign-in should not reuse an anonymous participant session on this host. */
export async function clearParticipantSessionForSignIn(response: NextResponse) {
  await applyParticipantSessionClear(response)
}
