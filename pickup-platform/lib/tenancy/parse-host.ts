import { RESERVED_SLUGS } from './reserved-slugs'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'

/**
 * Extract org slug from the request host.
 * e.g. jeffsoccer.organizr.co → "jeffsoccer"
 *      jeffsoccer.localhost → "jeffsoccer" (local dev)
 */
export function parseOrgSlugFromHost(host: string): string | null {
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''
  const root = ROOT_DOMAIN.split(':')[0]?.toLowerCase() ?? 'organizr.co'

  // Apex / www — no org slug
  if (hostname === root || hostname === `www.${root}`) {
    return null
  }

  // Subdomain of root domain
  if (hostname.endsWith(`.${root}`)) {
    const slug = hostname.slice(0, -(root.length + 1))
    if (!slug || slug.includes('.') || RESERVED_SLUGS.has(slug)) {
      return null
    }
    return slug
  }

  // Local dev: slug.localhost
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.slice(0, -'.localhost'.length)
    if (!slug || slug.includes('.') || RESERVED_SLUGS.has(slug)) {
      return null
    }
    return slug
  }

  return null
}

export function getRootDomain(): string {
  return ROOT_DOMAIN
}

/**
 * Cookie `domain` for sharing the auth session across the apex and org subdomains.
 * Returns `undefined` when the host should use default host-only cookies (localhost,
 * Vercel previews, etc.) — browsers reject `Domain=localhost`, and forcing a domain
 * on the auth callback can prevent the session from being stored at all.
 */
export function getAuthCookieDomain(host: string): string | undefined {
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return undefined
  }
  const root = ROOT_DOMAIN.split(':')[0]?.toLowerCase() || 'organizr.co'
  if (hostname === root || hostname === `www.${root}` || hostname.endsWith(`.${root}`)) {
    return `.${root}`
  }
  return undefined
}

export function withAuthCookieOptions(
  host: string,
  options?: Record<string, unknown>,
): Record<string, unknown> {
  const domain = getAuthCookieDomain(host)
  if (!domain) return options ?? {}
  return { ...options, domain }
}
