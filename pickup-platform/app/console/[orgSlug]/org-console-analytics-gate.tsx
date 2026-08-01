import { OrgConsoleAnalyticsSection } from './org-console-analytics'

/** Always show the analytics section — empty state inside when there's no data yet. */
export async function OrgConsoleAnalyticsGate({ orgId }: { orgId: string }) {
  return <OrgConsoleAnalyticsSection orgId={orgId} />
}
