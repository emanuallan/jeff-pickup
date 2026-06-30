export const HIDDEN_ORG_NAV_BASE = '/hidden'

/** Session detail paths under the hidden preview shell. */
export const HIDDEN_SESSION_BASE = '/hidden/cal'

export type OrgPublicNavKey = 'sessions' | 'leaderboard' | 'stats' | 'about'

export type OrgPublicNavItem = {
  key: OrgPublicNavKey
  href: string
  label: string
}

export function orgPublicNavHref(basePath: string, segment: string | null): string {
  return segment ? `${basePath}/${segment}` : basePath
}

/** Map the current URL to the active nav tab (sessions includes /hidden/cal/*). */
export function orgPublicNavActiveKey(pathname: string, basePath: string): OrgPublicNavKey {
  if (!pathname.startsWith(basePath)) {
    return 'sessions'
  }

  const suffix = pathname.slice(basePath.length)

  if (suffix.startsWith('/leaderboard')) return 'leaderboard'
  if (suffix.startsWith('/stats')) return 'stats'
  if (suffix.startsWith('/about')) return 'about'

  return 'sessions'
}
