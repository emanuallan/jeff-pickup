import { Suspense } from 'react'
import {
  getOrgCapsLeaderboard,
  getOrgMvpLeaderboard,
  getOrgStreakLeaderboard,
} from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import type { Org } from '@/lib/orgs'
import { LeaderboardPanel } from './leaderboard-panel'
import { OrgHomeContentLoading } from './org-home-content-loading'

async function LeaderboardPanelLoader({ org }: { org: Org }) {
  const showMvp = orgFeatures(org).session_mvp_voting
  const [capsRows, streakRows, mvpRows] = await Promise.all([
    getOrgCapsLeaderboard(org.id),
    getOrgStreakLeaderboard(org.id),
    showMvp ? getOrgMvpLeaderboard(org.id) : Promise.resolve([]),
  ])

  return (
    <LeaderboardPanel
      org={org}
      capsRows={capsRows}
      streakRows={streakRows}
      mvpRows={mvpRows}
    />
  )
}

export function LeaderboardPanelSection({ org }: { org: Org }) {
  return (
    <Suspense fallback={<OrgHomeContentLoading variant="leaderboard" />}>
      <LeaderboardPanelLoader org={org} />
    </Suspense>
  )
}
