import { describe, expect, it } from 'vitest'
import {
  addMonthsToMonthKey,
  buildLeaderboardMonthKeys,
  buildLeaderboardPeriodChips,
  LEADERBOARD_PERIOD_ALL,
  monthKeyInZone,
  monthKeyToUtcRange,
  parseLeaderboardPeriodParam,
} from './leaderboard-period'

describe('monthKeyInZone', () => {
  it('returns YYYY-MM in the given timezone', () => {
    // 2026-07-01 05:00 UTC is still June 30 evening in America/Los_Angeles
    expect(monthKeyInZone('2026-07-01T05:00:00.000Z', 'America/Los_Angeles')).toBe('2026-06')
    expect(monthKeyInZone('2026-07-01T05:00:00.000Z', 'UTC')).toBe('2026-07')
  })
})

describe('buildLeaderboardMonthKeys', () => {
  it('fills contiguous months from earliest past session through now', () => {
    expect(
      buildLeaderboardMonthKeys(
        '2026-04-15T18:00:00.000Z',
        'UTC',
        new Date('2026-07-10T12:00:00.000Z'),
      ),
    ).toEqual(['2026-04', '2026-05', '2026-06', '2026-07'])
  })

  it('falls back to the current month when there is no past session', () => {
    expect(
      buildLeaderboardMonthKeys(null, 'UTC', new Date('2026-07-10T12:00:00.000Z')),
    ).toEqual(['2026-07'])
  })
})

describe('parseLeaderboardPeriodParam', () => {
  const months = ['2026-05', '2026-06', '2026-07']

  it('defaults to the current month when param is missing', () => {
    expect(parseLeaderboardPeriodParam(null, months, '2026-07')).toEqual({
      kind: 'month',
      monthKey: '2026-07',
    })
  })

  it('accepts all-time and valid month keys', () => {
    expect(parseLeaderboardPeriodParam('all', months, '2026-07')).toEqual({ kind: 'all' })
    expect(parseLeaderboardPeriodParam('2026-05', months, '2026-07')).toEqual({
      kind: 'month',
      monthKey: '2026-05',
    })
  })

  it('rejects unknown months and falls back to current', () => {
    expect(parseLeaderboardPeriodParam('2025-01', months, '2026-07')).toEqual({
      kind: 'month',
      monthKey: '2026-07',
    })
  })
})

describe('monthKeyToUtcRange', () => {
  it('returns a half-open UTC range for the local month', () => {
    const range = monthKeyToUtcRange('2026-07', 'UTC')
    expect(range.startIso).toBe('2026-07-01T00:00:00.000Z')
    expect(range.endIso).toBe('2026-08-01T00:00:00.000Z')
  })
})

describe('buildLeaderboardPeriodChips', () => {
  it('appends an all-time chip after months', () => {
    const chips = buildLeaderboardPeriodChips(['2026-06', '2026-07'])
    expect(chips.map((chip) => chip.id)).toEqual(['2026-06', '2026-07', LEADERBOARD_PERIOD_ALL])
    expect(chips[0]?.monthLabel).toBe('Jun')
    expect(chips[2]?.ariaLabel).toBe('All time')
  })
})

describe('addMonthsToMonthKey', () => {
  it('crosses year boundaries', () => {
    expect(addMonthsToMonthKey('2025-12', 1)).toBe('2026-01')
    expect(addMonthsToMonthKey('2026-01', -1)).toBe('2025-12')
  })
})
