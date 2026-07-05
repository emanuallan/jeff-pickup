import { describe, expect, it } from 'vitest'
import {
  localDateTimeInZoneToUtcIso,
  utcIsoToLocalDateTimeInput,
} from './datetime'

describe('datetime', () => {
  describe('localDateTimeInZoneToUtcIso / utcIsoToLocalDateTimeInput', () => {
    it('round-trips a standard winter datetime in America/New_York', () => {
      const local = '2026-01-15T18:00'
      const zone = 'America/New_York'
      const utc = localDateTimeInZoneToUtcIso(local, zone)
      expect(utc).toBe('2026-01-15T23:00:00.000Z')
      expect(utcIsoToLocalDateTimeInput(utc, zone)).toBe(local)
    })

    it('round-trips a summer (EDT) datetime in America/New_York', () => {
      const local = '2026-07-15T18:00'
      const zone = 'America/New_York'
      const utc = localDateTimeInZoneToUtcIso(local, zone)
      expect(utc).toBe('2026-07-15T22:00:00.000Z')
      expect(utcIsoToLocalDateTimeInput(utc, zone)).toBe(local)
    })

    it('round-trips on spring-forward day using a valid local time', () => {
      const zone = 'America/New_York'
      const local = '2026-03-08T03:30'
      const utc = localDateTimeInZoneToUtcIso(local, zone)
      expect(utcIsoToLocalDateTimeInput(utc, zone)).toBe(local)
    })
  })
})
