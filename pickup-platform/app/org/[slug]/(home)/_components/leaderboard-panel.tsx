import type { Org } from '@/lib/orgs'
import type { CapsLeaderboardRow, MvpLeaderboardRow, StreakLeaderboardRow } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import {
  CapsLeaderboard,
  LeaderboardSummary,
  MvpLeaderboard,
  StreakLeaderboard,
} from '../../_components/leaderboard-ui'

type Props = {
  org: Org
  capsRows: CapsLeaderboardRow[]
  streakRows: StreakLeaderboardRow[]
  mvpRows?: MvpLeaderboardRow[]
}

export function LeaderboardPanel({ org, capsRows, streakRows, mvpRows = [] }: Props) {
  const accent = org.branding.accent_color
  const showMvp = orgFeatures(org).session_mvp_voting
  const topCaps = capsRows[0]
  const topCapsValue = topCaps?.caps ?? 0
  const leadersCount = capsRows.filter((row) => row.caps === topCapsValue).length

  return (
    <div className="flex flex-col gap-5 [&>*]:!mt-0">
      <LeaderboardSummary
        playerCount={capsRows.length}
        topName={topCaps?.display_name ?? null}
        topCaps={topCapsValue}
        leadersCount={leadersCount}
        accent={accent}
      />

      <div
        className={`grid gap-5 md:grid-cols-2 md:gap-6 [&>section]:!mt-0 ${
          showMvp ? 'xl:grid-cols-3' : ''
        }`}
      >
        <CapsLeaderboard rows={capsRows} accent={accent} />
        <StreakLeaderboard rows={streakRows} accent={accent} />
        {showMvp ? <MvpLeaderboard rows={mvpRows} accent={accent} /> : null}
      </div>
    </div>
  )
}
