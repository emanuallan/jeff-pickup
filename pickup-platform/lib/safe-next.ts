/** Open-redirect-safe internal path for post-login redirects. */
export function safeNextPath(next: string | null | undefined, fallback = '/console'): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return fallback
}
