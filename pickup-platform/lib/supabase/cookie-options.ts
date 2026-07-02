import type { CookieOptions } from '@supabase/ssr'

/** Apex hostname for cookie Domain (no port, no www). */
export function supabaseCookieRootDomain(): string | null {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  const hostname = raw.split(':')[0]?.toLowerCase() ?? 'organizr.co'
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}

/**
 * Shared Supabase auth cookie options — must match across browser, server,
 * middleware, and route-handler clients or sessions split across hosts.
 *
 * Production uses a root-domain cookie (e.g. `.organizr.co`) so organizer sessions
 * work on org subdomains. Development leaves domain unset — cookies are host-scoped,
 * so the organizer console link only appears on apex `/org/{slug}/...` paths, not on
 * `{slug}.localhost`.
 */
export function getSupabaseCookieOptions(): CookieOptions {
  const base: CookieOptions = {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }

  const root = supabaseCookieRootDomain()
  if (!root) {
    return base
  }

  return {
    ...base,
    domain: `.${root}`,
  }
}
