import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ORG_FEATURES,
  ORG_FEATURE_DEFINITIONS,
  ORG_FEATURE_GROUPS,
  orgFeatureChildren,
  orgFeatures,
  orgSettings,
  parseOrgSettings,
  parseWaitlistSettings,
} from './org-features'

describe('org-features', () => {
  describe('parseOrgSettings opt-out semantics', () => {
    it('defaults most features to true when settings missing; opt-in features stay off', () => {
      expect(parseOrgSettings(null)).toEqual({
        features: DEFAULT_ORG_FEATURES,
        waitlist: { promotion_mode: 'strict_fifo' },
        group_rules: null,
        sponsorships: null,
      })
      expect(parseOrgSettings(null).features.group_rules).toBe(false)
      expect(parseOrgSettings(null).features.session_mvp_voting).toBe(false)
      expect(parseOrgSettings(null).features.session_player_stats).toBe(false)
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

    it('enables opt-in features only when explicitly true', () => {
      const settings = parseOrgSettings({
        features: { group_rules: true, session_mvp_voting: true, session_player_stats: true },
      })
      expect(settings.features.group_rules).toBe(true)
      expect(settings.features.session_mvp_voting).toBe(true)
      expect(settings.features.session_player_stats).toBe(true)
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

  describe('ORG_FEATURE_GROUPS settings layout', () => {
    it('nests dependents under their parents', () => {
      expect(orgFeatureChildren('session_feedback').map((f) => f.key)).toEqual([
        'session_mvp_voting',
        'session_player_stats',
      ])
      expect(orgFeatureChildren('public_roster').map((f) => f.key)).toEqual(['user_badges'])
      expect(orgFeatureChildren('leaderboard')).toEqual([])
    })

    it('lists every settings-managed feature exactly once across groups and dependents', () => {
      const managedElsewhere = new Set(['group_rules', 'group_sponsorships'])
      const listed = new Set<string>()

      for (const group of ORG_FEATURE_GROUPS) {
        for (const key of group.features) {
          expect(listed.has(key), `duplicate top-level ${key}`).toBe(false)
          listed.add(key)
          for (const child of orgFeatureChildren(key)) {
            expect(listed.has(child.key), `duplicate nested ${child.key}`).toBe(false)
            listed.add(child.key)
          }
        }
      }

      for (const feature of ORG_FEATURE_DEFINITIONS) {
        if (managedElsewhere.has(feature.key)) {
          expect(listed.has(feature.key)).toBe(false)
          continue
        }
        expect(listed.has(feature.key), `missing ${feature.key}`).toBe(true)
      }
    })

    it('only nests features that declare dependsOn', () => {
      for (const feature of ORG_FEATURE_DEFINITIONS) {
        if (!feature.dependsOn) continue
        expect(orgFeatureChildren(feature.dependsOn).some((child) => child.key === feature.key)).toBe(
          true,
        )
      }
    })
  })
})
