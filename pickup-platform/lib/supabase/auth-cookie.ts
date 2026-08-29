/**
 * True when the request has a Supabase access/refresh cookie that would make
 * `getUser()` hit Auth over the network. PKCE verifier cookies do not count.
 */
export function hasSupabaseAuthCookie(cookies: { name: string }[]): boolean {
  return cookies.some((cookie) => {
    const { name } = cookie
    if (!name.startsWith('sb-')) return false
    return /(^|-)auth-token(?:\.\d+)?$/.test(name)
  })
}

/**
 * Organizer Auth in Edge middleware is only for login/console redirects.
 * Public org hosts must never await Auth — a hung getUser() 504s slug.organizr.co.
 */
export function middlewareShouldRefreshSession(
  pathname: string,
  orgSlug: string | null,
): boolean {
  if (orgSlug) return false
  if (pathname.startsWith('/org/')) return false
  if (pathname.startsWith('/auth/')) return false
  return pathname === '/login' || pathname.startsWith('/console')
}
