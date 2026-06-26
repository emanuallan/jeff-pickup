import type { CapsLeaderboardRow, StreakLeaderboardRow } from '@/lib/engagement'
import { hexToRgba, readableTextColor } from '@/lib/colors'

/** Dense rank: tied values share the same rank (1, 1, 3…). */
export function denseRank<T>(rows: T[], valueFn: (row: T) => number): number[] {
  return rows.map((row, idx) => {
    const prev = rows[idx - 1]
    if (!prev) return 1
    const val = valueFn(row)
    if (valueFn(prev) === val) {
      return rows.slice(0, idx).filter((r) => valueFn(r) > val).length + 1
    }
    return idx + 1
  })
}

function RankBadge({ rank, accent }: { rank: number; accent: string }) {
  if (rank === 1) {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm"
        style={{ backgroundColor: accent, color: readableTextColor(accent) }}
      >
        1
      </span>
    )
  }

  const medal =
    rank === 2
      ? 'bg-zinc-300/15 text-zinc-200 ring-1 ring-zinc-500/20'
      : rank === 3
        ? 'bg-amber-600/20 text-amber-200 ring-1 ring-amber-500/25'
        : 'bg-zinc-800/90 text-zinc-500'

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${medal}`}
    >
      {rank}
    </span>
  )
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8 4h8v2.5a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 4H4.5a1.5 1.5 0 0 0 0 3H6M18 4h1.5a1.5 1.5 0 0 1 0 3H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 10.5V14M9.5 18h5l.75 2H8.75L9.5 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 22c4-2.5 6.5-6 6.5-10a6.5 6.5 0 0 0-11-4.7C5.5 9.5 5 12 6 14c-2.5-1-3.5-4-2-6.5C2 10.5 4.5 16 8 18c-.5-2 .5-4 2-5.5-1 3 1 6.5 2 9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SectionHeader({
  icon,
  iconClassName,
  title,
  subtitle,
}: {
  icon: 'trophy' | 'flame'
  iconClassName: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
      >
        {icon === 'trophy' ? (
          <TrophyIcon className="h-5 w-5" />
        ) : (
          <FlameIcon className="h-5 w-5" />
        )}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
  )
}

function CapsPodium({
  rows,
  ranks,
  accent,
}: {
  rows: CapsLeaderboardRow[]
  ranks: number[]
  accent: string
}) {
  if (rows.length === 0) return null

  // Visual order: 2nd · 1st · 3rd
  const slots: Array<{ row: CapsLeaderboardRow; rank: number; place: 1 | 2 | 3 } | null> = [
    rows[1] ? { row: rows[1], rank: ranks[1], place: 2 } : null,
    { row: rows[0], rank: ranks[0], place: 1 },
    rows[2] ? { row: rows[2], rank: ranks[2], place: 3 } : null,
  ]

  const heights: Record<1 | 2 | 3, string> = {
    1: 'h-28',
    2: 'h-20',
    3: 'h-16',
  }

  return (
    <div className="mt-6 flex items-end justify-center gap-2 sm:gap-3">
      {slots.map((slot, i) =>
        slot ? (
          <div
            key={slot.row.participant_id}
            className={`flex min-w-0 flex-1 flex-col items-center ${slot.place === 1 ? 'z-10 -mt-2' : ''}`}
          >
            <p className="mb-2 max-w-full truncate text-center text-sm font-semibold text-zinc-100">
              {slot.row.display_name}
            </p>
            <p
              className={`mb-3 tabular-nums font-bold ${slot.place === 1 ? 'text-2xl text-zinc-50' : 'text-lg text-zinc-200'}`}
            >
              {slot.row.caps}
              <span className="ml-0.5 text-xs font-medium text-zinc-500">
                {slot.row.caps === 1 ? 'cap' : 'caps'}
              </span>
            </p>
            <div
              className={`relative w-full overflow-hidden rounded-t-2xl ${heights[slot.place]} flex items-start justify-center pt-3`}
              style={
                slot.place === 1
                  ? {
                      background: `linear-gradient(to top, ${hexToRgba(accent, 0.35)}, ${hexToRgba(accent, 0.12)})`,
                      boxShadow: `inset 0 1px 0 ${hexToRgba(accent, 0.4)}`,
                    }
                  : slot.place === 2
                    ? { backgroundColor: 'rgba(228, 228, 231, 0.08)' }
                    : { backgroundColor: 'rgba(217, 119, 6, 0.12)' }
              }
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                  slot.place === 1 ? '' : slot.place === 2 ? 'bg-zinc-300/15 text-zinc-200' : 'bg-amber-600/20 text-amber-200'
                }`}
                style={
                  slot.place === 1
                    ? { backgroundColor: accent, color: readableTextColor(accent) }
                    : undefined
                }
              >
                {slot.rank}
              </span>
            </div>
          </div>
        ) : (
          <div key={`empty-${i}`} className="min-w-0 flex-1" aria-hidden />
        ),
      )}
    </div>
  )
}

function CapsRow({
  row,
  rank,
  accent,
  topCaps,
  isLeader,
}: {
  row: CapsLeaderboardRow
  rank: number
  accent: string
  topCaps: number
  isLeader: boolean
}) {
  const fill = topCaps > 0 ? (row.caps / topCaps) * 100 : 0

  return (
    <li
      className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 ${
        isLeader ? 'border-zinc-700/80' : 'border-zinc-800/80'
      }`}
      style={
        isLeader
          ? {
              background: `linear-gradient(90deg, ${hexToRgba(accent, 0.12)} 0%, rgba(0,0,0,0.2) 100%)`,
            }
          : { backgroundColor: 'rgba(0,0,0,0.2)' }
      }
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 opacity-[0.07]"
        style={{ width: `${fill}%`, backgroundColor: accent }}
        aria-hidden
      />
      <div className="relative flex items-center gap-3 text-sm">
        <RankBadge rank={rank} accent={accent} />
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">{row.display_name}</span>
        <span className="shrink-0 tabular-nums">
          <span className="font-semibold text-zinc-200">{row.caps}</span>
          <span className="ml-1 text-xs text-zinc-500">{row.caps === 1 ? 'cap' : 'caps'}</span>
        </span>
      </div>
    </li>
  )
}

function StreakRow({
  row,
  rank,
  accent,
  isLeader,
}: {
  row: StreakLeaderboardRow
  rank: number
  accent: string
  isLeader: boolean
}) {
  const weeks = row.current_streak_weeks

  return (
    <li
      className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 ${
        isLeader ? 'border-orange-500/25' : 'border-zinc-800/80'
      }`}
      style={
        isLeader
          ? {
              background:
                'linear-gradient(90deg, rgba(249, 115, 22, 0.1) 0%, rgba(0,0,0,0.2) 100%)',
            }
          : { backgroundColor: 'rgba(0,0,0,0.2)' }
      }
    >
      <div className="relative flex items-center gap-3 text-sm">
        <RankBadge rank={rank} accent={accent} />
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">{row.display_name}</span>
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-orange-200">
            {weeks > 0 ? <FlameIcon className="h-3.5 w-3.5 text-orange-400" /> : null}
            {weeks}w
          </span>
          <span className="block text-[11px] tabular-nums text-zinc-600">
            best {row.best_streak_weeks}w
          </span>
        </div>
      </div>
    </li>
  )
}

export function LeaderboardSummary({
  playerCount,
  topName,
  topCaps,
  accent,
}: {
  playerCount: number
  topName: string | null
  topCaps: number
  accent: string
}) {
  if (playerCount === 0) return null

  return (
    <div
      className="mt-6 overflow-hidden rounded-2xl border border-zinc-800/80 px-4 py-3.5"
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(accent, 0.14)} 0%, rgba(24, 24, 27, 0.6) 55%)`,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ranked</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-zinc-50">{playerCount}</p>
        </div>
        {topName && topCaps > 0 ? (
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Leading</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-zinc-100">{topName}</p>
            <p className="text-xs tabular-nums text-zinc-400">
              {topCaps} {topCaps === 1 ? 'cap' : 'caps'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function CapsLeaderboard({
  rows,
  accent,
}: {
  rows: CapsLeaderboardRow[]
  accent: string
}) {
  const ranks = denseRank(rows, (r) => r.caps)
  const topCaps = rows[0]?.caps ?? 0
  const podiumRows = rows.slice(0, 3)
  const restRows = rows.slice(3)

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6">
      <SectionHeader
        icon="trophy"
        iconClassName="bg-amber-500/10 text-amber-400"
        title="Caps"
        subtitle="Distinct sessions attended"
      />

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
          No sessions attended yet. Join a session to start climbing.
        </p>
      ) : rows.length === 1 ? (
        <ol className="mt-6 space-y-2">
          <CapsRow row={rows[0]} rank={1} accent={accent} topCaps={topCaps} isLeader />
        </ol>
      ) : (
        <>
          <CapsPodium rows={podiumRows} ranks={ranks.slice(0, 3)} accent={accent} />
          {restRows.length > 0 ? (
            <ol className="mt-5 space-y-2 border-t border-zinc-800/80 pt-5">
              {restRows.map((row, i) => (
                <CapsRow
                  key={row.participant_id}
                  row={row}
                  rank={ranks[i + 3]}
                  accent={accent}
                  topCaps={topCaps}
                  isLeader={row.caps > 0 && row.caps === topCaps}
                />
              ))}
            </ol>
          ) : null}
        </>
      )}
    </section>
  )
}

export function StreakLeaderboard({
  rows,
  accent,
}: {
  rows: StreakLeaderboardRow[]
  accent: string
}) {
  const ranks = denseRank(rows, (r) => r.current_streak_weeks)

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader
        icon="flame"
        iconClassName="bg-orange-500/10 text-orange-400"
        title="Weekly streaks"
        subtitle="Consecutive weeks with a session"
      />

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
          No active streaks this week. Show up two weeks in a row to get on the board.
        </p>
      ) : (
        <ol className="mt-6 space-y-2">
          {rows.map((row, idx) => (
            <StreakRow
              key={row.participant_id}
              row={row}
              rank={ranks[idx]}
              accent={accent}
              isLeader={idx === 0}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
