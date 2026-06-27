import { getOrgConsoleNavCounts } from '@/lib/org-console-counts'
import { OrgConsoleAnalyticsSection } from './org-console-analytics'

/** Shows analytics only when the org has past sessions — cheap count check, heavy fetch inside. */
export async function OrgConsoleAnalyticsGate({ orgId }: { orgId: string }) {
  const counts = await getOrgConsoleNavCounts(orgId)
  if (counts.pastSessionCount === 0) {
    return null
  }

  return <OrgConsoleAnalyticsSection orgId={orgId} />
}
