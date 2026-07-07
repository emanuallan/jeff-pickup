import { describe, expect, it } from 'vitest'
import {
  buildNextGroupRulesOnSave,
  formatGroupRulesEnforcedAt,
  groupRulesActive,
  parseOrgGroupRules,
  validateGroupRulesText,
} from './group-rules'

describe('group-rules', () => {
  describe('parseOrgGroupRules', () => {
    it('returns null for empty config', () => {
      expect(parseOrgGroupRules(null)).toBeNull()
      expect(parseOrgGroupRules({})).toBeNull()
    })

    it('parses stored rules', () => {
      expect(
        parseOrgGroupRules({
          text: 'Be kind.',
          version: 2,
          last_enforced_at: '2026-01-01T00:00:00.000Z',
        }),
      ).toEqual({
        text: 'Be kind.',
        version: 2,
        last_enforced_at: '2026-01-01T00:00:00.000Z',
      })
    })
  })

  describe('groupRulesActive', () => {
    it('requires feature, text, and version', () => {
      expect(groupRulesActive(true, { text: 'Rules', version: 1, last_enforced_at: null })).toBe(
        true,
      )
      expect(groupRulesActive(false, { text: 'Rules', version: 1, last_enforced_at: null })).toBe(
        false,
      )
      expect(groupRulesActive(true, { text: '', version: 1, last_enforced_at: null })).toBe(false)
      expect(groupRulesActive(true, { text: 'Rules', version: 0, last_enforced_at: null })).toBe(
        false,
      )
    })
  })

  describe('validateGroupRulesText', () => {
    it('enforces length bounds', () => {
      expect(validateGroupRulesText('short')).toMatch(/at least/)
      expect(validateGroupRulesText('a'.repeat(10_001))).toMatch(/at most/)
      expect(validateGroupRulesText('These are the group rules.')).toBeNull()
    })
  })

  describe('buildNextGroupRulesOnSave', () => {
    it('keeps version when text changes', () => {
      const next = buildNextGroupRulesOnSave(
        { text: 'Old rules', version: 2, last_enforced_at: '2026-01-01T00:00:00.000Z' },
        'New rules here',
      )
      expect(next.version).toBe(2)
      expect(next.text).toBe('New rules here')
      expect(next.last_enforced_at).toBe('2026-01-01T00:00:00.000Z')
    })

    it('keeps version when text is unchanged', () => {
      const next = buildNextGroupRulesOnSave(
        { text: 'Same rules', version: 2, last_enforced_at: '2026-01-01T00:00:00.000Z' },
        'Same rules',
      )
      expect(next.version).toBe(2)
      expect(next.last_enforced_at).toBe('2026-01-01T00:00:00.000Z')
    })

    it('publishes at version 1 on first save without setting last enforced', () => {
      const next = buildNextGroupRulesOnSave(null, 'These are the group rules.')
      expect(next.version).toBe(1)
      expect(next.last_enforced_at).toBeNull()
    })
  })

  describe('formatGroupRulesEnforcedAt', () => {
    it('returns Never for missing values', () => {
      expect(formatGroupRulesEnforcedAt(null)).toBe('Never')
      expect(formatGroupRulesEnforcedAt('')).toBe('Never')
    })
  })
})
