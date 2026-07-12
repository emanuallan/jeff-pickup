import { describe, expect, it } from 'vitest'
import {
  ALLOWED_FEED_REACTION_EMOJIS,
  isAllowedFeedReactionEmoji,
} from './org-session-feed-reactions'

describe('org-session-feed-reactions', () => {
  it('allows the configured emoji subset', () => {
    for (const emoji of ALLOWED_FEED_REACTION_EMOJIS) {
      expect(isAllowedFeedReactionEmoji(emoji)).toBe(true)
    }
  })

  it('rejects unknown emojis', () => {
    expect(isAllowedFeedReactionEmoji('🎉')).toBe(false)
    expect(isAllowedFeedReactionEmoji('')).toBe(false)
  })
})
