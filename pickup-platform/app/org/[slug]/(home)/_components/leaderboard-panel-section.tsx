import { Suspense } from 'react'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import type { Org } from '@/lib/orgs'
import { LeaderboardPanel } from './leaderboard-panel'
import { OrgHomeContentLoading } from './org-home-content-loading'

async function LeaderboardPanelLoader({ org }: { org: Org }) {
  const [capsRows, streakRows] = await Promise.all([
    getOrgCapsLeaderboard(org.id),
    getOrgStreakLeaderboard(org.id),
  ])

  return <LeaderboardPanel org={org} capsRows={capsRows} streakRows={streakRows} />
}

export function LeaderboardPanelSection({ org }: { org: Org }) {
  return (
    <Suspense fallback={<OrgHomeContentLoading variant="leaderboard" />}>
      <LeaderboardPanelLoader org={org} />
    </Suspense>
  )
}
