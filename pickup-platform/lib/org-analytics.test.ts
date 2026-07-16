import { describe, expect, it } from 'vitest'
import {
  formatPastSessionsTrend,
  formatWeekOverWeekTrend,
  parseOrgAnalyticsTrends,
} from './org-analytics'

describe('formatWeekOverWeekTrend', () => {
  it('hides when both periods are empty', () => {
    expect(formatWeekOverWeekTrend(0, 0)).toBeNull()
  })

  it('labels first-week activity without a percent', () => {
    expect(formatWeekOverWeekTrend(4, 0)).toEqual({
      label: '+4 this week',
      direction: 'new',
    })
    expect(formatWeekOverWeekTrend(1, 0, { unit: 'session' })).toEqual({
      label: '+1 session this week',
      direction: 'new',
    })
  })

  it('formats absolute and percent deltas', () => {
    expect(formatWeekOverWeekTrend(12, 10)).toEqual({
      label: '↑2 vs last week',
      direction: 'up',
    })
    expect(formatWeekOverWeekTrend(8, 10)).toEqual({
      label: '↓2 vs last week',
      direction: 'down',
    })
    expect(formatWeekOverWeekTrend(12, 10, { asPercent: true })).toEqual({
      label: '↑20% vs last week',
      direction: 'up',
    })
    expect(formatWeekOverWeekTrend(10, 10)).toEqual({
      label: 'Same as last week',
      direction: 'flat',
    })
  })

  it('keeps one decimal for fractional averages', () => {
    expect(formatWeekOverWeekTrend(14.5, 12, { unit: 'avg' })).toEqual({
      label: '↑2.5 avg vs last week',
      direction: 'up',
    })
  })
})

describe('formatPastSessionsTrend', () => {
  it('prefers attendance when both weeks have sessions', () => {
    expect(
      formatPastSessionsTrend(
        { current: 2, previous: 2 },
        { current: 14, previous: 12 },
      ),
    ).toEqual({
      label: '↑2 avg vs last week',
      direction: 'up',
    })
  })

  it('falls back to session counts', () => {
    expect(
      formatPastSessionsTrend(
        { current: 1, previous: 0 },
        { current: 10, previous: null },
      ),
    ).toEqual({
      label: '+1 this week',
      direction: 'new',
    })
  })
})

describe('parseOrgAnalyticsTrends', () => {
  it('returns null when trends are missing (pre-migration RPC)', () => {
    expect(parseOrgAnalyticsTrends(undefined)).toBeNull()
    expect(parseOrgAnalyticsTrends(null)).toBeNull()
  })

  it('parses nested trend counters', () => {
    expect(
      parseOrgAnalyticsTrends({
        page_views: { current: 10, previous: 8 },
        joins: { current: 3, previous: 1 },
        new_participants: { current: 2, previous: 0 },
        sessions: { current: 1, previous: 1 },
        avg_attendance: { current: 12.5, previous: null },
      }),
    ).toEqual({
      pageViews: { current: 10, previous: 8 },
      joins: { current: 3, previous: 1 },
      newParticipants: { current: 2, previous: 0 },
      sessions: { current: 1, previous: 1 },
      avgAttendance: { current: 12.5, previous: null },
    })
  })
})
