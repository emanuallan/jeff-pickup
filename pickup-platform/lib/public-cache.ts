import { unstable_cache } from 'next/cache'

/** Set DISABLE_PUBLIC_CACHE=1 to bypass cross-request caching (quick rollback). */
export const PUBLIC_CACHE_ENABLED = process.env.DISABLE_PUBLIC_CACHE !== '1'

export const PUBLIC_ORG_REVALIDATE = 60
export const PUBLIC_EVENTS_REVALIDATE = 30
export const PUBLIC_ROSTER_REVALIDATE = 15

export function withPublicCache<T>(
  keyParts: string[],
  revalidate: number,
  tags: string[],
  fn: () => Promise<T>,
): Promise<T> {
  if (!PUBLIC_CACHE_ENABLED) {
    return fn()
  }

  return unstable_cache(fn, keyParts, { revalidate, tags })()
}
