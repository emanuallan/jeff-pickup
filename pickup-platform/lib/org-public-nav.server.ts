import type { Org } from '@/lib/orgs'
import { orgFeatures } from '@/lib/org-features'
import {
  hiddenTabHref,
  HIDDEN_DEFAULT_TAB,
  type OrgPublicNavItem,
  type OrgPublicNavKey,
} from '@/lib/org-public-nav'

export type OrgPublicNavContext = {
  org: Org
}

type OrgPublicNavDefinition = {
  key: OrgPublicNavKey
  label: string
  isVisible: (ctx: OrgPublicNavContext) => boolean
}

export const ORG_PUBLIC_NAV_DEFINITIONS: OrgPublicNavDefinition[] = [
  {
    key: HIDDEN_DEFAULT_TAB,
    label: 'Matchday',
    isVisible: () => true,
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    isVisible: ({ org }) => orgFeatures(org).leaderboard,
  },
]

export function resolveOrgPublicNavItems(
  ctx: OrgPublicNavContext,
  basePath: string,
  ev?: string | null,
): OrgPublicNavItem[] {
  return ORG_PUBLIC_NAV_DEFINITIONS.filter((item) => item.isVisible(ctx)).map(
    ({ key, label }) => ({
      key,
      label,
      href: hiddenTabHref(basePath, key, key === HIDDEN_DEFAULT_TAB ? ev : null),
    }),
  )
}
