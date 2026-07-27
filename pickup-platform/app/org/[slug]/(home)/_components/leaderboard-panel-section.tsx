import { Suspense } from 'react'
import {
  getOrgCapsLeaderboard,
  getOrgMvpLeaderboard,
  getOrgStreakLeaderboard,
  resolveOrgLeaderboardPeriod,
} from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import type { Org } from '@/lib/orgs'
import { LeaderboardPanel } from './leaderboard-panel'
import { OrgHomeContentLoading } from './org-home-content-loading'

async function LeaderboardPanelLoader({
  org,
  periodParam,
}: {
  org: Org
  periodParam?: string | null
}) {
  const showMvp = orgFeatures(org).session_mvp_voting
  const { period, periodId, chips, range } = await resolveOrgLeaderboardPeriod(
    org.id,
    periodParam,
  )
  const showStreaks = period.kind === 'all'

  const [capsRows, streakRows, mvpRows] = await Promise.all([
    getOrgCapsLeaderboard(org.id, 50, range),
    showStreaks ? getOrgStreakLeaderboard(org.id) : Promise.resolve([]),
    showMvp ? getOrgMvpLeaderboard(org.id, 50, range) : Promise.resolve([]),
  ])

  return (
    <LeaderboardPanel
      org={org}
      capsRows={capsRows}
      streakRows={streakRows}
      mvpRows={mvpRows}
      chips={chips}
      activePeriodId={periodId}
      showStreaks={showStreaks}
    />
  )
}

export function LeaderboardPanelSection({
  org,
  periodParam,
}: {
  org: Org
  periodParam?: string | null
}) {
  return (
    <Suspense fallback={<OrgHomeContentLoading variant="leaderboard" />} key={periodParam ?? ''}>
      <LeaderboardPanelLoader org={org} periodParam={periodParam} />
    </Suspense>
  )
}
