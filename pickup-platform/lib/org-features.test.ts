import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ORG_FEATURES,
  orgFeatures,
  orgSettings,
  parseOrgSettings,
  parseWaitlistSettings,
} from './org-features'

describe('org-features', () => {
  describe('parseOrgSettings opt-out semantics', () => {
    it('defaults most features to true when settings missing; group_rules stays off', () => {
      expect(parseOrgSettings(null)).toEqual({
        features: DEFAULT_ORG_FEATURES,
        waitlist: { promotion_mode: 'strict_fifo' },
        group_rules: null,
        sponsorships: null,
      })
      expect(parseOrgSettings(null).features.group_rules).toBe(false)
    })

    it('keeps features true when undefined in stored settings', () => {
      const settings = parseOrgSettings({ features: {} })
      expect(settings.features.public_roster).toBe(true)
      expect(settings.features.guest_signups).toBe(true)
    })

    it('disables features only when explicitly false', () => {
      const settings = parseOrgSettings({
        features: { public_roster: false, guest_signups: false, session_feedback: false },
      })
      expect(settings.features.public_roster).toBe(false)
      expect(settings.features.guest_signups).toBe(false)
      expect(settings.features.session_feedback).toBe(false)
      expect(settings.features.leaderboard).toBe(true)
      expect(settings.features.group_rules).toBe(false)
    })

    it('enables group_rules only when explicitly true', () => {
      const settings = parseOrgSettings({
        features: { group_rules: true },
      })
      expect(settings.features.group_rules).toBe(true)
    })
  })

  describe('parseWaitlistSettings', () => {
    it('defaults to strict_fifo', () => {
      expect(parseWaitlistSettings(null).promotion_mode).toBe('strict_fifo')
    })

    it('accepts skip_ahead mode', () => {
      expect(parseWaitlistSettings({ promotion_mode: 'skip_ahead' }).promotion_mode).toBe(
        'skip_ahead',
      )
    })
  })

  describe('orgSettings / orgFeatures accessors', () => {
    it('handles stale org rows without settings', () => {
      expect(orgFeatures({})).toEqual(DEFAULT_ORG_FEATURES)
      expect(orgSettings({ settings: undefined }).features).toEqual(DEFAULT_ORG_FEATURES)
    })
  })
})
