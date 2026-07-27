import { localDateTimeInZoneToUtcIso } from '@/lib/datetime'

export const LEADERBOARD_PERIOD_ALL = 'all'

/** URL / chip id for a calendar month (`YYYY-MM`) or all-time. */
export type LeaderboardPeriodId = typeof LEADERBOARD_PERIOD_ALL | string

export type LeaderboardPeriod =
  | { kind: 'all' }
  | { kind: 'month'; monthKey: string }

export type LeaderboardMonthChip = {
  id: LeaderboardPeriodId
  monthLabel: string
  yearLabel: string
  ariaLabel: string
}

const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/

export function isLeaderboardMonthKey(value: string): boolean {
  const match = MONTH_KEY_RE.exec(value)
  if (!match) return false
  const month = Number(match[2])
  return month >= 1 && month <= 12
}

/** `YYYY-MM` for an instant in an IANA timezone. */
export function monthKeyInZone(isoOrDate: string | Date, timeZone: string): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

export function addMonthsToMonthKey(monthKey: string, delta: number): string {
  const match = MONTH_KEY_RE.exec(monthKey)
  if (!match) throw new Error(`Invalid month key: ${monthKey}`)

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1 + delta
  const next = new Date(Date.UTC(year, monthIndex, 1))
  const y = next.getUTCFullYear()
  const m = String(next.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Inclusive month keys from the earliest past session month through the current
 * month in the org timezone (contiguous, oldest → newest).
 */
export function buildLeaderboardMonthKeys(
  earliestPastStartsAt: string | null,
  timeZone: string,
  now = new Date(),
): string[] {
  const currentKey = monthKeyInZone(now, timeZone)
  if (!earliestPastStartsAt) return [currentKey]

  let cursor = monthKeyInZone(earliestPastStartsAt, timeZone)
  if (cursor > currentKey) return [currentKey]

  const keys: string[] = []
  while (cursor <= currentKey) {
    keys.push(cursor)
    cursor = addMonthsToMonthKey(cursor, 1)
  }
  return keys
}

export function parseLeaderboardPeriodParam(
  raw: string | null | undefined,
  availableMonthKeys: string[],
  currentMonthKey: string,
): LeaderboardPeriod {
  const months = new Set(availableMonthKeys)

  if (raw === LEADERBOARD_PERIOD_ALL) {
    return { kind: 'all' }
  }

  if (raw && isLeaderboardMonthKey(raw) && months.has(raw)) {
    return { kind: 'month', monthKey: raw }
  }

  if (months.has(currentMonthKey)) {
    return { kind: 'month', monthKey: currentMonthKey }
  }

  if (availableMonthKeys.length > 0) {
    return { kind: 'month', monthKey: availableMonthKeys[availableMonthKeys.length - 1] }
  }

  return { kind: 'all' }
}

export function leaderboardPeriodId(period: LeaderboardPeriod): LeaderboardPeriodId {
  return period.kind === 'all' ? LEADERBOARD_PERIOD_ALL : period.monthKey
}

/** Half-open UTC range `[start, end)` for a `YYYY-MM` in an IANA zone. */
export function monthKeyToUtcRange(
  monthKey: string,
  timeZone: string,
): { startIso: string; endIso: string } {
  if (!isLeaderboardMonthKey(monthKey)) {
    throw new Error(`Invalid month key: ${monthKey}`)
  }

  const nextKey = addMonthsToMonthKey(monthKey, 1)
  return {
    startIso: localDateTimeInZoneToUtcIso(`${monthKey}-01T00:00`, timeZone),
    endIso: localDateTimeInZoneToUtcIso(`${nextKey}-01T00:00`, timeZone),
  }
}

export function formatLeaderboardMonthChip(monthKey: string): Omit<LeaderboardMonthChip, 'id'> {
  if (!isLeaderboardMonthKey(monthKey)) {
    return { monthLabel: monthKey, yearLabel: '', ariaLabel: monthKey }
  }

  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  const monthLabel = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const yearLabel = String(year)

  return {
    monthLabel,
    yearLabel,
    ariaLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  }
}

export function buildLeaderboardPeriodChips(monthKeys: string[]): LeaderboardMonthChip[] {
  const monthChips = monthKeys.map((monthKey) => {
    const labels = formatLeaderboardMonthChip(monthKey)
    return { id: monthKey, ...labels }
  })

  return [
    ...monthChips,
    {
      id: LEADERBOARD_PERIOD_ALL,
      monthLabel: 'Time',
      yearLabel: 'Stats',
      ariaLabel: 'All time',
    },
  ]
}
