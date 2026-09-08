import { describe, expect, it } from 'vitest'
import {
  parseOptionalInt,
  parseOptionalMinParticipants,
  parseOptionalPriceCents,
  validateCapacityVsMin,
} from './form-fields'

describe('console form-fields', () => {
  describe('parseOptionalInt', () => {
    it('returns null for blank input', () => {
      expect(parseOptionalInt(null)).toBeNull()
      expect(parseOptionalInt('')).toBeNull()
    })

    it('parses valid integers', () => {
      expect(parseOptionalInt('20')).toBe(20)
    })

    it('returns null for non-numeric input', () => {
      expect(parseOptionalInt('abc')).toBeNull()
    })
  })

  describe('parseOptionalMinParticipants', () => {
    it('allows empty min participants', () => {
      expect(parseOptionalMinParticipants(null)).toEqual({ value: null })
    })

    it('rejects values outside 2–999', () => {
      expect(parseOptionalMinParticipants('1').error).toBeTruthy()
      expect(parseOptionalMinParticipants('1000').error).toBeTruthy()
    })

    it('accepts valid minimums', () => {
      expect(parseOptionalMinParticipants('8')).toEqual({ value: 8 })
    })
  })

  describe('validateCapacityVsMin', () => {
    it('returns null when min is within capacity', () => {
      expect(validateCapacityVsMin(20, 8)).toBeNull()
    })

    it('returns error when min exceeds capacity', () => {
      expect(validateCapacityVsMin(10, 12)).toBe(
        'Min participants cannot exceed capacity.',
      )
    })

    it('allows open-ended capacity or min', () => {
      expect(validateCapacityVsMin(null, 8)).toBeNull()
      expect(validateCapacityVsMin(20, null)).toBeNull()
    })
  })

  describe('parseOptionalPriceCents', () => {
    it('returns null for blank input', () => {
      expect(parseOptionalPriceCents(null)).toEqual({ value: null })
      expect(parseOptionalPriceCents('')).toEqual({ value: null })
    })

    it('parses dollars into cents', () => {
      expect(parseOptionalPriceCents('12.50')).toEqual({ value: 1250 })
    })

    it('treats zero as free', () => {
      expect(parseOptionalPriceCents('0')).toEqual({ value: null })
    })

    it('rejects negative amounts', () => {
      expect(parseOptionalPriceCents('-1')).toEqual({
        value: null,
        error: 'Session price must be a valid amount (0 or more).',
      })
    })
  })
})
