import type { Org } from '@/lib/orgs'
import type { CapsLeaderboardRow, StreakLeaderboardRow } from '@/lib/engagement'
import {
  CapsLeaderboard,
  LeaderboardSummary,
  StreakLeaderboard,
} from '../../_components/leaderboard-ui'

type Props = {
  org: Org
  capsRows: CapsLeaderboardRow[]
  streakRows: StreakLeaderboardRow[]
}

export function LeaderboardPanel({ org, capsRows, streakRows }: Props) {
  const accent = org.branding.accent_color
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

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <CapsLeaderboard rows={capsRows} accent={accent} />
        <StreakLeaderboard rows={streakRows} accent={accent} />
      </div>
    </div>
  )
}
