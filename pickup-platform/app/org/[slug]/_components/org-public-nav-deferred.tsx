import type { Org } from '@/lib/orgs'
import { getPublicOrgPastSessionCount } from '@/lib/public-data'
import { resolveOrgPublicNavItems, type OrgPublicNavKey } from '@/lib/org-public-nav'
import { OrgPublicNav } from './org-public-nav'

type Props = {
  org: Org
  activeKey: OrgPublicNavKey
}

/** Resolves which nav items to show (leaderboard unlock, feature flags). */
export async function OrgPublicNavDeferred({ org, activeKey }: Props) {
  const pastSessionCount = await getPublicOrgPastSessionCount(org.id)
  const items = resolveOrgPublicNavItems({ org, pastSessionCount })

  return <OrgPublicNav items={items} activeKey={activeKey} accent={org.branding.accent_color} />
}
