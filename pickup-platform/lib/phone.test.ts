import { describe, expect, it } from 'vitest'
import {
  formatPhoneDisplay,
  isValidPhoneDigits,
  normalizePhoneDigits,
} from './phone'

describe('phone', () => {
  describe('normalizePhoneDigits', () => {
    it('strips non-digits', () => {
      expect(normalizePhoneDigits('(555) 123-4567')).toBe('5551234567')
    })

    it('drops leading US country code', () => {
      expect(normalizePhoneDigits('1-555-123-4567')).toBe('5551234567')
    })

    it('caps at 10 digits', () => {
      expect(normalizePhoneDigits('5551234567890')).toBe('5551234567')
    })
  })

  describe('formatPhoneDisplay', () => {
    it('formats partial and full numbers', () => {
      expect(formatPhoneDisplay('555')).toBe('(555')
      expect(formatPhoneDisplay('5551234')).toBe('(555) 123-4')
      expect(formatPhoneDisplay('5551234567')).toBe('(555) 123-4567')
    })

    it('returns empty string for empty input', () => {
      expect(formatPhoneDisplay('')).toBe('')
    })
  })

  describe('isValidPhoneDigits', () => {
    it('requires exactly 10 digits', () => {
      expect(isValidPhoneDigits('5551234567')).toBe(true)
      expect(isValidPhoneDigits('555123456')).toBe(false)
      expect(isValidPhoneDigits('55512345678')).toBe(false)
    })
  })
})
