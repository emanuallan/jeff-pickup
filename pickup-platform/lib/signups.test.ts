import { describe, expect, it } from 'vitest'
import { rosterHeadcount, splitRosterByStatus } from './signups'
import { makeRosterEntry } from '@/test/fixtures/events'

describe('signups', () => {
  describe('rosterHeadcount', () => {
    it('counts participants plus guests', () => {
      const entries = [
        makeRosterEntry({ guest_count: 0 }),
        makeRosterEntry({ guest_count: 2 }),
        makeRosterEntry({ guest_count: 1 }),
      ]
      expect(rosterHeadcount(entries)).toBe(6)
    })

    it('returns 0 for empty roster', () => {
      expect(rosterHeadcount([])).toBe(0)
    })
  })

  describe('splitRosterByStatus', () => {
    it('splits confirmed and waitlisted entries', () => {
      const confirmed = makeRosterEntry({ list_status: 'confirmed' })
      const waitlisted = makeRosterEntry({ list_status: 'waitlisted' })
      const defaultStatus = makeRosterEntry({ list_status: undefined })

      const result = splitRosterByStatus([confirmed, waitlisted, defaultStatus])

      expect(result.confirmed).toEqual([confirmed, defaultStatus])
      expect(result.waitlisted).toEqual([waitlisted])
    })
  })
})
