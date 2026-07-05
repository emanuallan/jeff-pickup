/** Pure URL builders — safe to import from client components. */

export function orgBaseUrl(slug: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  if (process.env.NODE_ENV === 'development') {
    return `http://${slug}.localhost:3000`
  }
  return `https://${slug}.${root}`
}

export function orgEventsUrl(slug: string): string {
  return orgBaseUrl(slug)
}

export function rootBaseUrl(): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return `https://${root}`
}

export function consoleOrgUrl(slug: string): string {
  return `${rootBaseUrl()}/console/${slug}`
}
