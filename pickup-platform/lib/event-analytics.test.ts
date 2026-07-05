import { describe, expect, it } from 'vitest'
import {
  buildRosterAnalytics,
  computeConversionRate,
  countUniquePageViewPeople,
} from './event-analytics'
import { makeRosterEntry } from '@/test/fixtures/events'

describe('event-analytics', () => {
  describe('computeConversionRate', () => {
    it('returns null when no visitors and no signups', () => {
      expect(computeConversionRate(0, 0)).toEqual({ rate: null, capped: false })
    })

    it('computes percentage from visitors', () => {
      expect(computeConversionRate(10, 3)).toEqual({ rate: 30, capped: false })
    })

    it('caps rate at 100 when signups exceed visitors', () => {
      expect(computeConversionRate(5, 8)).toEqual({ rate: 100, capped: true })
    })
  })

  describe('countUniquePageViewPeople', () => {
    it('deduplicates by participant when present', () => {
      const rows = [
        { viewer_key: 'v1', participant_id: 'p1' },
        { viewer_key: 'v2', participant_id: 'p1' },
        { viewer_key: 'v3', participant_id: null },
      ]
      expect(countUniquePageViewPeople(rows)).toBe(2)
    })

    it('counts anonymous viewers separately', () => {
      const rows = [
        { viewer_key: 'v1', participant_id: null },
        { viewer_key: 'v2', participant_id: null },
      ]
      expect(countUniquePageViewPeople(rows)).toBe(2)
    })
  })

  describe('buildRosterAnalytics', () => {
    it('aggregates roster metrics', () => {
      const roster = [
        makeRosterEntry({
          guest_count: 2,
          arrival_status: 'on_my_way',
          created_at: '2026-07-01T10:00:00.000Z',
        }),
        makeRosterEntry({
          guest_count: 0,
          arrival_status: 'confirmed',
          created_at: '2026-07-01T12:00:00.000Z',
        }),
      ]

      const analytics = buildRosterAnalytics(roster, 10, {
        pageViews: 50,
        uniqueVisitors: 20,
        uniqueSignups: 2,
        uniqueLeft: 1,
      })

      expect(analytics.headcount).toBe(4)
      expect(analytics.totalGuests).toBe(2)
      expect(analytics.currentSignups).toBe(2)
      expect(analytics.conversionRate).toBe(10)
      expect(analytics.capacityFill).toBe(40)
      expect(analytics.arrivalStatusCounts.on_my_way).toBe(1)
      expect(analytics.arrivalStatusCounts.confirmed).toBe(1)
      expect(analytics.firstSignupAt).toBe('2026-07-01T10:00:00.000Z')
      expect(analytics.lastSignupAt).toBe('2026-07-01T12:00:00.000Z')
    })
  })
})
