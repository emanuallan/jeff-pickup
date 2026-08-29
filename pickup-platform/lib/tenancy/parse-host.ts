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
 * Internal path for a tenant host rewrite.
 * Returns null when the request is already on `/org/{slug}` so middleware
 * cannot rewrite `/org/jeff` → `/org/jeff/org/jeff` in a loop (Vercel 504).
 */
export function orgSubdomainRewritePath(pathname: string, orgSlug: string): string | null {
  const prefix = `/org/${orgSlug}`
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    return null
  }
  const path = pathname === '/' ? '' : pathname
  return `${prefix}${path}`
}
