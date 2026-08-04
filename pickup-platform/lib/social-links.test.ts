import { describe, expect, it } from 'vitest'
import { detectPlatform, normalizeLinkUrl } from '@/lib/social-links'

describe('social-links', () => {
  describe('detectPlatform', () => {
    it('detects telegram invite and profile hosts', () => {
      expect(detectPlatform('https://t.me/jeffpickup').id).toBe('telegram')
      expect(detectPlatform('https://t.me/+AbCdEfGhIj').label).toBe('Telegram')
      expect(detectPlatform('https://telegram.me/jeffpickup').id).toBe('telegram')
      expect(detectPlatform('https://www.telegram.org/').id).toBe('telegram')
    })

    it('detects facebook and whatsapp like other branded hosts', () => {
      expect(detectPlatform('https://facebook.com/groups/123').id).toBe('facebook')
      expect(detectPlatform('https://wa.me/15551234567').id).toBe('whatsapp')
    })
  })

  describe('normalizeLinkUrl', () => {
    it('normalizes bare telegram short links', () => {
      expect(normalizeLinkUrl('t.me/jeffpickup')).toBe('https://t.me/jeffpickup')
    })
  })
})
