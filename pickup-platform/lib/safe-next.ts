/** Open-redirect-safe internal path for post-login redirects. */
export function safeNextPath(next: string | null | undefined, fallback = '/console'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }

  if (next.includes('\\') || next.includes('@')) {
    return fallback
  }

  if (/[\u0000-\u001F\u007F]/.test(next)) {
    return fallback
  }

  let decoded = next
  try {
    decoded = decodeURIComponent(next)
  } catch {
    return fallback
  }

  if (decoded.startsWith('//') || decoded.includes('\\') || decoded.includes('@')) {
    return fallback
  }

  try {
    const parsed = new URL(next, 'http://n')
    if (parsed.hostname !== 'n') {
      return fallback
    }
  } catch {
    return fallback
  }

  return next
}
