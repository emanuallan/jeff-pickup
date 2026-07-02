import type { CookieOptions } from '@supabase/ssr'

/**
 * Shared Supabase auth cookie options.
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

  if (process.env.NODE_ENV !== 'production') {
    return base
  }

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  return {
    ...base,
    domain: `.${root}`,
  }
}
