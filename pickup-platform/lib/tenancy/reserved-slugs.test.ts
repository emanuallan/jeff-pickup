import { describe, expect, it } from 'vitest'
import { isValidSlug, normalizeSlug, RESERVED_SLUGS } from './reserved-slugs'

describe('reserved-slugs', () => {
  describe('normalizeSlug', () => {
    it('lowercases and replaces spaces with hyphens', () => {
      expect(normalizeSlug('  Jeff Soccer  ')).toBe('jeff-soccer')
    })
  })

  describe('isValidSlug', () => {
    it('accepts valid slugs', () => {
      expect(isValidSlug('jeffsoccer')).toBe(true)
      expect(isValidSlug('my-club')).toBe(true)
    })

    it('rejects too-short slugs', () => {
      expect(isValidSlug('ab')).toBe(false)
    })

    it('rejects invalid characters', () => {
      expect(isValidSlug('jeff_soccer')).toBe(false)
      expect(isValidSlug('JeffSoccer')).toBe(false)
    })

    it('rejects reserved slugs', () => {
      for (const slug of RESERVED_SLUGS) {
        expect(isValidSlug(slug)).toBe(false)
      }
    })
  })
})
