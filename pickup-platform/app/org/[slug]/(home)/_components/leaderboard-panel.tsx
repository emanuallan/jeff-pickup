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
  showStreaks: boolean
  /** Month boards count only events inside that month (not cumulative to date). */
  monthScoped?: boolean
}

/** MVP / caps / streaks boards for the selected period (chips live outside Suspense). */
export function LeaderboardPanel({
  org,
  capsRows,
  streakRows,
  mvpRows = [],
  showStreaks,
  monthScoped = false,
}: Props) {
  const accent = org.branding.accent_color
  const showMvp = orgFeatures(org).session_mvp_voting && mvpRows.length > 0
  const topCaps = capsRows[0]
  const topCapsValue = topCaps?.caps ?? 0
  const leadersCount = capsRows.filter((row) => row.caps === topCapsValue).length
  const boardCount = 1 + (showStreaks ? 1 : 0) + (showMvp ? 1 : 0)

  return (
    <div className="flex flex-col gap-5 [&>*]:!mt-0">
      <LeaderboardSummary
        playerCount={capsRows.length}
        topName={topCaps?.display_name ?? null}
        topCaps={topCapsValue}
        leadersCount={leadersCount}
        accent={accent}
        monthScoped={monthScoped}
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
        {showMvp ? (
          <MvpLeaderboard rows={mvpRows} accent={accent} monthScoped={monthScoped} />
        ) : null}
        <CapsLeaderboard rows={capsRows} accent={accent} monthScoped={monthScoped} />
        {showStreaks ? <StreakLeaderboard rows={streakRows} accent={accent} /> : null}
      </div>
    </div>
  )
}

/** Content-only skeleton while period boards load — month chips stay mounted above. */
export function LeaderboardPanelSkeleton({
  showStreaks,
  showMvp,
}: {
  showStreaks: boolean
  showMvp: boolean
}) {
  const boardCount = 1 + (showStreaks ? 1 : 0) + (showMvp ? 1 : 0)

  return (
    <div className="flex flex-col gap-5" role="status" aria-live="polite" aria-label="Loading leaderboard">
      <div className="h-20 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
      <div
        className={`grid gap-5 md:gap-6 ${
          boardCount >= 3
            ? 'md:grid-cols-2 xl:grid-cols-3'
            : boardCount === 2
              ? 'md:grid-cols-2'
              : ''
        }`}
      >
        {showMvp ? (
          <div className="h-56 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        ) : null}
        <div className="h-72 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        {showStreaks ? (
          <div className="h-56 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        ) : null}
      </div>
    </div>
  )
}
