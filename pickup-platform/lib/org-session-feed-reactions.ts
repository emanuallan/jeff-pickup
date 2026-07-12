export const ALLOWED_FEED_REACTION_EMOJIS = [
  '⚽',
  '🔥',
  '💪',
  '👏',
  '❤️',
  '😂',
  '👀',
  '🐐',
  '😭',
  '🥶',
  '🧢',
  '💀',
  '🧤',
] as const

export type FeedReactionEmoji = (typeof ALLOWED_FEED_REACTION_EMOJIS)[number]

export function isAllowedFeedReactionEmoji(emoji: string): emoji is FeedReactionEmoji {
  return (ALLOWED_FEED_REACTION_EMOJIS as readonly string[]).includes(emoji)
}
