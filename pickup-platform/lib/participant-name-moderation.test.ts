import { describe, expect, it } from 'vitest'
import {
  DEMO_NAME_MODERATION_ERROR,
  isDemoOrgSlug,
  validateDemoParticipantNames,
} from './participant-name-moderation'

describe('participant-name-moderation', () => {
  describe('isDemoOrgSlug', () => {
    it('matches demo org only', () => {
      expect(isDemoOrgSlug('demo')).toBe(true)
      expect(isDemoOrgSlug('jeffsoccer')).toBe(false)
    })
  })

  describe('validateDemoParticipantNames', () => {
    it('skips moderation for non-demo orgs', () => {
      expect(
        validateDemoParticipantNames('jeffsoccer', {
          firstName: 'Anything',
          lastName: 'Goes',
        }),
      ).toBeNull()
    })

    it('allows clean names on demo org', () => {
      expect(
        validateDemoParticipantNames('demo', {
          firstName: 'Alex',
          lastName: 'Smith',
        }),
      ).toBeNull()
    })

    it('blocks offensive names on demo org', () => {
      expect(
        validateDemoParticipantNames('demo', {
          firstName: 'shit',
          lastName: 'head',
        }),
      ).toBe(DEMO_NAME_MODERATION_ERROR)
    })

    it('blocks leetspeak variants on demo org', () => {
      expect(
        validateDemoParticipantNames('demo', {
          firstName: 'sh1t',
          lastName: 'Test',
        }),
      ).toBe(DEMO_NAME_MODERATION_ERROR)
    })
  })
})
