import type { Org } from '@/lib/orgs'
import { orgFeatures } from '@/lib/org-features'
import {
  orgPublicTabHref,
  ORG_PUBLIC_DEFAULT_TAB,
  type OrgPublicNavItem,
  type OrgPublicNavKey,
} from '@/lib/org-public-nav'

export type OrgPublicNavContext = {
  org: Org
  /** When false, the leaderboard tab stays hidden until the org has enough session history. */
  leaderboardUnlocked?: boolean
}

type OrgPublicNavDefinition = {
  key: OrgPublicNavKey
  label: string
  isVisible: (ctx: OrgPublicNavContext) => boolean
}

export const ORG_PUBLIC_NAV_DEFINITIONS: OrgPublicNavDefinition[] = [
  {
    key: ORG_PUBLIC_DEFAULT_TAB,
    label: 'Session',
    isVisible: () => true,
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    isVisible: ({ org, leaderboardUnlocked }) =>
      orgFeatures(org).leaderboard && leaderboardUnlocked === true,
  },
]

export function resolveOrgPublicNavItems(
  ctx: OrgPublicNavContext,
  basePath: string,
  cal?: string | null,
): OrgPublicNavItem[] {
  return ORG_PUBLIC_NAV_DEFINITIONS.filter((item) => item.isVisible(ctx)).map(
    ({ key, label }) => ({
      key,
      label,
      href: orgPublicTabHref(basePath, key, key === ORG_PUBLIC_DEFAULT_TAB ? cal : null),
    }),
  )
}
