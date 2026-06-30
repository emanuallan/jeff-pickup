import type { Org } from '@/lib/orgs'
import { LEADERBOARD_MIN_SESSIONS } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'

export type OrgPublicNavKey = 'sessions' | 'leaderboard' | 'stats' | 'about'

export type OrgPublicNavItem = {
  key: OrgPublicNavKey
  href: string
  label: string
}

export type OrgPublicNavContext = {
  org: Org
  pastSessionCount: number
}

type OrgPublicNavDefinition = OrgPublicNavItem & {
  isVisible: (ctx: OrgPublicNavContext) => boolean
}

/** Public org section nav — add entries here as new pages ship. */
export const ORG_PUBLIC_NAV_DEFINITIONS: OrgPublicNavDefinition[] = [
  {
    key: 'sessions',
    href: '/cal',
    label: 'Sessions',
    isVisible: () => true,
  },
  {
    key: 'leaderboard',
    href: '/leaderboard',
    label: 'Leaderboard',
    isVisible: ({ org, pastSessionCount }) =>
      orgFeatures(org).leaderboard && pastSessionCount >= LEADERBOARD_MIN_SESSIONS,
  },
  {
    key: 'stats',
    href: '/stats',
    label: 'Stats',
    isVisible: () => true,
  },
  {
    key: 'about',
    href: '/about',
    label: 'About',
    isVisible: () => true,
  },
]

export function resolveOrgPublicNavItems(ctx: OrgPublicNavContext): OrgPublicNavItem[] {
  return ORG_PUBLIC_NAV_DEFINITIONS.filter((item) => item.isVisible(ctx)).map(
    ({ key, href, label }) => ({ key, href, label }),
  )
}
