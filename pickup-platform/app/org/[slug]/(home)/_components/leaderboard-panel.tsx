import type { Org } from '@/lib/orgs'
import type { CapsLeaderboardRow, MvpLeaderboardRow, StreakLeaderboardRow } from '@/lib/engagement'
import type { LeaderboardMonthChip, LeaderboardPeriodId } from '@/lib/leaderboard-period'
import { orgFeatures } from '@/lib/org-features'
import {
  CapsLeaderboard,
  LeaderboardSummary,
  MvpLeaderboard,
  StreakLeaderboard,
} from '../../_components/leaderboard-ui'
import { LeaderboardMonthChips } from './leaderboard-month-chips'

type Props = {
  org: Org
  capsRows: CapsLeaderboardRow[]
  streakRows: StreakLeaderboardRow[]
  mvpRows?: MvpLeaderboardRow[]
  chips: LeaderboardMonthChip[]
  activePeriodId: LeaderboardPeriodId
  showStreaks: boolean
}

export function LeaderboardPanel({
  org,
  capsRows,
  streakRows,
  mvpRows = [],
  chips,
  activePeriodId,
  showStreaks,
}: Props) {
  const accent = org.branding.accent_color
  const showMvp = orgFeatures(org).session_mvp_voting
  const topCaps = capsRows[0]
  const topCapsValue = topCaps?.caps ?? 0
  const leadersCount = capsRows.filter((row) => row.caps === topCapsValue).length
  const boardCount = 1 + (showStreaks ? 1 : 0) + (showMvp ? 1 : 0)

  return (
    <div className="flex flex-col gap-5 [&>*]:!mt-0">
      <LeaderboardMonthChips chips={chips} activePeriodId={activePeriodId} accent={accent} />

      <LeaderboardSummary
        playerCount={capsRows.length}
        topName={topCaps?.display_name ?? null}
        topCaps={topCapsValue}
        leadersCount={leadersCount}
        accent={accent}
      />

      <div
        className={`grid gap-5 md:gap-6 [&>section]:!mt-0 ${
          boardCount >= 3
            ? 'md:grid-cols-2 xl:grid-cols-3'
            : boardCount === 2
              ? 'md:grid-cols-2'
              : ''
        }`}
      >
        <CapsLeaderboard rows={capsRows} accent={accent} />
        {showStreaks ? <StreakLeaderboard rows={streakRows} accent={accent} /> : null}
        {showMvp ? <MvpLeaderboard rows={mvpRows} accent={accent} /> : null}
      </div>
    </div>
  )
}
