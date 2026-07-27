import { Suspense } from 'react'
import {
  getOrgCapsLeaderboard,
  getOrgMvpLeaderboard,
  getOrgStreakLeaderboard,
  type LeaderboardTimeRange,
} from '@/lib/engagement'
import type { LeaderboardMonthChip, LeaderboardPeriod } from '@/lib/leaderboard-period'
import { leaderboardPeriodId } from '@/lib/leaderboard-period'
import { orgFeatures } from '@/lib/org-features'
import type { Org } from '@/lib/orgs'
import { LeaderboardMonthChips } from './leaderboard-month-chips'
import { LeaderboardPanel, LeaderboardPanelSkeleton } from './leaderboard-panel'

export type LeaderboardPeriodResolved = {
  period: LeaderboardPeriod
  chips: LeaderboardMonthChip[]
  range: LeaderboardTimeRange
}

async function LeaderboardPanelLoader({
  org,
  range,
  showStreaks,
  showMvp,
}: {
  org: Org
  range: LeaderboardTimeRange
  showStreaks: boolean
  showMvp: boolean
}) {
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
      showStreaks={showStreaks}
    />
  )
}

/**
 * Same layout pattern as MatchdayPanel: period chips stay outside Suspense so they
 * remain visible while boards reload for the selected month / all-time.
 */
export function LeaderboardPanelSection({
  org,
  resolved,
}: {
  org: Org
  resolved: LeaderboardPeriodResolved
}) {
  const { period, chips, range } = resolved
  const periodId = leaderboardPeriodId(period)
  const showStreaks = period.kind === 'all'
  const showMvp = orgFeatures(org).session_mvp_voting
  const accent = org.branding.accent_color

  return (
    <div className="flex flex-col gap-5">
      <LeaderboardMonthChips chips={chips} activePeriodId={periodId} accent={accent} />
      <Suspense
        fallback={<LeaderboardPanelSkeleton showStreaks={showStreaks} showMvp={showMvp} />}
        key={periodId}
      >
        <LeaderboardPanelLoader
          org={org}
          range={range}
          showStreaks={showStreaks}
          showMvp={showMvp}
        />
      </Suspense>
    </div>
  )
}
