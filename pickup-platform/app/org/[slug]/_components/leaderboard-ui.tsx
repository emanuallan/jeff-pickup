import type { CapsLeaderboardRow, StreakLeaderboardRow } from '@/lib/engagement'
import { hexToRgba, readableTextColor } from '@/lib/colors'

/** Dense rank: tied values share the same rank (1, 1, 1, 2, 2…). */
export function denseRank<T>(rows: T[], valueFn: (row: T) => number): number[] {
  let rank = 0
  let prevVal: number | null = null

  return rows.map((row, idx) => {
    const val = valueFn(row)
    if (idx === 0 || val !== prevVal) {
      rank++
      prevVal = val
    }
    return rank
  })
}

function rankOrdinal(rank: number): string {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `${rank}th`
}

function groupRowsByRank<T>(rows: T[], ranks: number[]): Array<{ rank: number; rows: T[] }> {
  const groups: Array<{ rank: number; rows: T[] }> = []

  rows.forEach((row, idx) => {
    const rank = ranks[idx]
    const last = groups[groups.length - 1]
    if (last?.rank === rank) {
      last.rows.push(row)
    } else {
      groups.push({ rank, rows: [row] })
    }
  })

  return groups
}

function RankBadge({
  rank,
  accent,
  tied,
}: {
  rank: number
  accent: string
  tied?: boolean
}) {
  const label = tied ? `T${rank}` : String(rank)

  if (rank === 1) {
    return (
      <span
        className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums shadow-sm"
        style={{ backgroundColor: accent, color: readableTextColor(accent) }}
        title={tied ? 'Tied for 1st' : '1st place'}
      >
        {label}
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
      className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums ${medal}`}
      title={tied ? `Tied for ${rankOrdinal(rank)}` : `${rankOrdinal(rank)} place`}
    >
      {label}
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

function formatWeeks(weeks: number): string {
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}

function SectionHeader({
  icon,
  iconClassName,
  title,
  subtitle,
}: {
  icon: 'trophy' | 'streak'
  iconClassName: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg ${iconClassName}`}
      >
        {icon === 'trophy' ? <TrophyIcon className="h-5 w-5" /> : <span aria-hidden>🔥</span>}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
  )
}

function RankGroupHeader({
  rank,
  count,
  value,
  valueLabel,
}: {
  rank: number
  count: number
  value: number
  valueLabel: string
}) {
  const tieNote = count > 1 ? ` · ${count} tied` : ''

  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
      {rankOrdinal(rank)} place · {value} {valueLabel}
      {tieNote}
    </p>
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
  isLeader,
  tied,
  grouped,
}: {
  row: CapsLeaderboardRow
  rank: number
  accent: string
  isLeader?: boolean
  tied?: boolean
  grouped?: boolean
}) {
  const content = (
    <div className="flex items-center gap-3 text-sm">
      <RankBadge rank={rank} accent={accent} tied={tied} />
      <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">{row.display_name}</span>
      <span className="shrink-0 tabular-nums">
        <span className="font-semibold text-zinc-200">{row.caps}</span>
        <span className="ml-1 text-xs text-zinc-500">{row.caps === 1 ? 'cap' : 'caps'}</span>
      </span>
    </div>
  )

  if (grouped) {
    return content
  }

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
      {content}
    </li>
  )
}

function CapsGroup({
  rank,
  rows,
  accent,
  tied,
  showHeader,
}: {
  rank: number
  rows: CapsLeaderboardRow[]
  accent: string
  tied: boolean
  showHeader: boolean
}) {
  const capLabel = rows[0].caps === 1 ? 'cap' : 'caps'
  const isLeader = rank === 1

  return (
    <div>
      {showHeader ? (
        <RankGroupHeader rank={rank} count={rows.length} value={rows[0].caps} valueLabel={capLabel} />
      ) : null}
      <div
        className={`overflow-hidden rounded-2xl border ${
          isLeader ? 'border-zinc-700/80' : 'border-zinc-800/80'
        }`}
        style={
          isLeader
            ? {
                background: `linear-gradient(180deg, ${hexToRgba(accent, 0.1)} 0%, rgba(0,0,0,0.24) 100%)`,
              }
            : { backgroundColor: 'rgba(0,0,0,0.2)' }
        }
      >
        {rows.map((row, index) => (
          <div
            key={row.participant_id}
            className={`px-3 py-2.5 ${index > 0 ? 'border-t border-zinc-800/70' : ''}`}
          >
            <CapsRow row={row} rank={rank} accent={accent} tied={tied} grouped />
          </div>
        ))}
      </div>
    </div>
  )
}

function StreakRow({
  row,
  rank,
  accent,
  isLeader,
  tied,
  grouped,
}: {
  row: StreakLeaderboardRow
  rank: number
  accent: string
  isLeader?: boolean
  tied?: boolean
  grouped?: boolean
}) {
  const weeks = row.current_streak_weeks

  const content = (
    <div className="flex items-center gap-3 text-sm">
      <RankBadge rank={rank} accent={accent} tied={tied} />
      <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">{row.display_name}</span>
      <div className="shrink-0 text-right">
        <span className="tabular-nums font-semibold text-orange-200">{formatWeeks(weeks)}</span>
        <span className="block text-[11px] tabular-nums text-zinc-600">
          Best: {formatWeeks(row.best_streak_weeks)}
        </span>
      </div>
    </div>
  )

  if (grouped) {
    return content
  }

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
      {content}
    </li>
  )
}

function StreakGroup({
  rank,
  rows,
  accent,
  tied,
  showHeader,
}: {
  rank: number
  rows: StreakLeaderboardRow[]
  accent: string
  tied: boolean
  showHeader: boolean
}) {
  const weeks = rows[0].current_streak_weeks
  const isLeader = rank === 1

  return (
    <div>
      {showHeader ? (
        <RankGroupHeader
          rank={rank}
          count={rows.length}
          value={weeks}
          valueLabel={weeks === 1 ? 'week' : 'weeks'}
        />
      ) : null}
      <div
        className={`overflow-hidden rounded-2xl border ${
          isLeader ? 'border-orange-500/25' : 'border-zinc-800/80'
        }`}
        style={
          isLeader
            ? {
                background:
                  'linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(0,0,0,0.24) 100%)',
              }
            : { backgroundColor: 'rgba(0,0,0,0.2)' }
        }
      >
        {rows.map((row, index) => (
          <div
            key={row.participant_id}
            className={`px-3 py-2.5 ${index > 0 ? 'border-t border-zinc-800/70' : ''}`}
          >
            <StreakRow row={row} rank={rank} accent={accent} tied={tied} grouped />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeaderboardSummary({
  playerCount,
  topName,
  topCaps,
  leadersCount = 1,
  accent,
}: {
  playerCount: number
  topName: string | null
  topCaps: number
  leadersCount?: number
  accent: string
}) {
  if (playerCount === 0) return null

  const tiedForFirst = leadersCount > 1

  return (
    <div
      className="mt-6 overflow-hidden rounded-2xl border border-zinc-800/80 px-4 py-3.5"
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(accent, 0.14)} 0%, rgba(24, 24, 27, 0.6) 55%)`,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Have attended</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-zinc-50">{playerCount}</p>
        </div>
        {topName && topCaps > 0 ? (
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Leading</p>
            {tiedForFirst ? (
              <>
                <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                  {leadersCount} tied for 1st
                </p>
                <p className="text-xs tabular-nums text-zinc-400">
                  {topCaps} {topCaps === 1 ? 'cap' : 'caps'} each
                </p>
              </>
            ) : (
              <>
                <p className="mt-0.5 truncate text-sm font-semibold text-zinc-100">{topName}</p>
                <p className="text-xs tabular-nums text-zinc-400">
                  {topCaps} {topCaps === 1 ? 'cap' : 'caps'}
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CapsRankedList({
  rows,
  ranks,
  accent,
  showGroupHeaders,
  className,
}: {
  rows: CapsLeaderboardRow[]
  ranks: number[]
  accent: string
  showGroupHeaders: boolean
  className?: string
}) {
  const groups = groupRowsByRank(rows, ranks)

  if (groups.length === 1 && groups[0].rows.length === 1) {
    return (
      <ol className={className}>
        <CapsRow
          row={groups[0].rows[0]}
          rank={groups[0].rank}
          accent={accent}
          isLeader={groups[0].rank === 1}
        />
      </ol>
    )
  }

  return (
    <div className={`flex flex-col gap-5 ${className ?? ''}`}>
      {groups.map((group) => (
        <CapsGroup
          key={group.rank}
          rank={group.rank}
          rows={group.rows}
          accent={accent}
          tied={group.rows.length > 1}
          showHeader={showGroupHeaders}
        />
      ))}
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
  const showPodium =
    rows.length >= 3 && ranks[0] === 1 && ranks[1] === 2 && ranks[2] === 3
  const listRows = showPodium ? rows.slice(3) : rows
  const listRanks = showPodium ? ranks.slice(3) : ranks
  const listGroups = groupRowsByRank(listRows, listRanks)
  const showGroupHeaders =
    listGroups.length > 1 || listGroups.some((group) => group.rows.length > 1)

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
      ) : (
        <>
          {showPodium ? (
            <CapsPodium rows={rows.slice(0, 3)} ranks={ranks.slice(0, 3)} accent={accent} />
          ) : null}
          <CapsRankedList
            rows={listRows}
            ranks={listRanks}
            accent={accent}
            showGroupHeaders={showGroupHeaders}
            className={showPodium ? 'mt-5 border-t border-zinc-800/80 pt-5' : 'mt-6'}
          />
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
  const groups = groupRowsByRank(rows, ranks)
  const showGroupHeaders = groups.length > 1 || groups.some((group) => group.rows.length > 1)

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
      <SectionHeader
        icon="streak"
        iconClassName="bg-orange-500/10"
        title="Weekly streaks"
        subtitle="2+ consecutive weeks with a session"
      />

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
          No one has a 2+ week streak right now. Play two weeks in a row to get on the board.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {groups.map((group) => (
            <StreakGroup
              key={group.rank}
              rank={group.rank}
              rows={group.rows}
              accent={accent}
              tied={group.rows.length > 1}
              showHeader={showGroupHeaders}
            />
          ))}
        </div>
      )}
    </section>
  )
}
