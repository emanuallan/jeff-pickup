import { describe, expect, it } from 'vitest'
import {
  clampGuestCount,
  guestCountOptionLabel,
  guestCountOptions,
  MAX_GUEST_COUNT,
  resolveGuestCount,
} from './guest-signups'

describe('guest-signups', () => {
  describe('clampGuestCount', () => {
    it('clamps to 0–5 range', () => {
      expect(clampGuestCount(-5)).toBe(0)
      expect(clampGuestCount(0)).toBe(0)
      expect(clampGuestCount(5)).toBe(5)
      expect(clampGuestCount(25)).toBe(5)
    })

    it('floors fractional values', () => {
      expect(clampGuestCount(3.9)).toBe(3)
    })

    it('returns 0 for non-finite input', () => {
      expect(clampGuestCount(Number.NaN)).toBe(0)
    })
  })

  describe('resolveGuestCount', () => {
    it('returns clamped count when guests enabled', () => {
      expect(resolveGuestCount(5, true)).toBe(5)
    })

    it('returns 0 when guests disabled', () => {
      expect(resolveGuestCount(5, false)).toBe(0)
    })
  })

  describe('guestCountOptions', () => {
    it('includes 0 through MAX_GUEST_COUNT', () => {
      const options = guestCountOptions()
      expect(options[0]).toBe(0)
      expect(options[options.length - 1]).toBe(MAX_GUEST_COUNT)
      expect(options.length).toBe(MAX_GUEST_COUNT + 1)
    })
  })

  describe('guestCountOptionLabel', () => {
    it('formats labels for common counts', () => {
      expect(guestCountOptionLabel(0)).toBe('Just me')
      expect(guestCountOptionLabel(1)).toBe('1 guest')
      expect(guestCountOptionLabel(3)).toBe('3 guests')
    })
  })
})
