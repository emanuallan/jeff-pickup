import type { Org } from '@/lib/orgs'
import { LEADERBOARD_MIN_SESSIONS } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import {
  orgPublicNavHref,
  type OrgPublicNavItem,
  type OrgPublicNavKey,
} from '@/lib/org-public-nav'

export type OrgPublicNavContext = {
  org: Org
  pastSessionCount: number
}

type OrgPublicNavDefinition = {
  key: OrgPublicNavKey
  segment: string | null
  label: string
  isVisible: (ctx: OrgPublicNavContext) => boolean
}

export const ORG_PUBLIC_NAV_DEFINITIONS: OrgPublicNavDefinition[] = [
  {
    key: 'sessions',
    segment: null,
    label: 'Sessions',
    isVisible: () => true,
  },
  {
    key: 'leaderboard',
    segment: 'leaderboard',
    label: 'Leaderboard',
    isVisible: ({ org, pastSessionCount }) =>
      orgFeatures(org).leaderboard && pastSessionCount >= LEADERBOARD_MIN_SESSIONS,
  },
  {
    key: 'stats',
    segment: 'stats',
    label: 'Stats',
    isVisible: () => true,
  },
  {
    key: 'about',
    segment: 'about',
    label: 'About',
    isVisible: () => true,
  },
]

export function resolveOrgPublicNavItems(
  ctx: OrgPublicNavContext,
  basePath: string,
): OrgPublicNavItem[] {
  return ORG_PUBLIC_NAV_DEFINITIONS.filter((item) => item.isVisible(ctx)).map(
    ({ key, segment, label }) => ({
      key,
      label,
      href: orgPublicNavHref(basePath, segment),
    }),
  )
}
