/** Subdomains that cannot be claimed as org slugs. */
export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'auth',
  'assets',
  'static',
  'help',
  'status',
  'mail',
  'blog',
])

/** Simple slug validation: lowercase alphanumeric + hyphens, 3–32 chars. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug)
}

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-')
}
