'use client'

import { useCallback, useState, useTransition } from 'react'
import { toggleOrgSessionFeedReaction } from '../feed-actions'
import { ALLOWED_FEED_REACTION_EMOJIS } from '@/lib/org-session-feed-reactions'
import {
  type OrgSessionFeedItem,
  type OrgSessionFeedReaction,
} from '@/lib/org-session-feed'

type Props = {
  orgSlug: string
  item: OrgSessionFeedItem
  initialReactions: OrgSessionFeedReaction[]
  canReact: boolean
  accent: string
  compact?: boolean
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FeedReactions({
  orgSlug,
  item,
  initialReactions,
  canReact,
  accent,
  compact = false,
}: Props) {
  const [reactions, setReactions] = useState(initialReactions)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const activeReactions = reactions.filter((reaction) => reaction.count > 0)

  const handleToggle = useCallback(
    (emoji: string) => {
      if (!canReact || pending) return

      setError(null)
      startTransition(async () => {
        const result = await toggleOrgSessionFeedReaction(orgSlug, item, emoji)
        if ('error' in result) {
          setError(result.error)
          return
        }

        setReactions(result.reactions)
        setPickerOpen(false)
      })
    },
    [canReact, item, orgSlug, pending],
  )

  if (!canReact && activeReactions.length === 0) {
    return null
  }

  const shellClass = compact
    ? `border-t border-white/[0.04] px-3 py-1.5 ${pickerOpen ? 'relative z-10' : ''}`
    : `border-t border-white/5 bg-zinc-950/30 px-4 py-3 ${pickerOpen ? 'relative z-10' : ''}`
  const reactionClass = compact
    ? 'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs'
    : 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm'
  const addButtonClass = compact ? 'h-6 w-6' : 'h-8 w-8'
  const pickerEmojiClass = compact ? 'h-7 w-7 text-base' : 'h-9 w-9 text-lg'
  const pickerGapClass = compact ? 'mt-1.5 gap-0.5' : 'mt-2.5 gap-1'

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-center gap-1">
        {activeReactions.map((reaction) => {
          const selected = reaction.reacted_by_me

          if (!canReact) {
            return (
              <span
                key={reaction.emoji}
                className={`${reactionClass} border-zinc-800/80 bg-zinc-900/50`}
              >
                <span aria-hidden>{reaction.emoji}</span>
                <span className="text-[10px] font-medium tabular-nums text-zinc-400">
                  {reaction.count}
                </span>
              </span>
            )
          }

          return (
            <button
              key={reaction.emoji}
              type="button"
              disabled={pending}
              onClick={() => handleToggle(reaction.emoji)}
              className={`${reactionClass} transition disabled:opacity-60 ${
                selected
                  ? 'border-zinc-600 bg-zinc-800/90'
                  : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
              aria-pressed={selected}
              aria-label={`${selected ? 'Remove' : 'Add'} ${reaction.emoji} reaction`}
            >
              <span aria-hidden>{reaction.emoji}</span>
              <span
                className={`font-medium tabular-nums ${compact ? 'text-[10px] text-zinc-300' : 'text-xs text-zinc-300'}`}
              >
                {reaction.count}
              </span>
            </button>
          )
        })}

        {canReact ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setPickerOpen((open) => !open)}
            className={`inline-flex ${addButtonClass} items-center justify-center rounded-full border text-zinc-500 transition disabled:opacity-60 ${
              pickerOpen
                ? 'border-zinc-600 bg-zinc-800/80 text-zinc-200'
                : 'border-zinc-800/80 bg-transparent hover:border-zinc-700 hover:bg-zinc-900/80 hover:text-zinc-300'
            }`}
            aria-expanded={pickerOpen}
            aria-label={pickerOpen ? 'Close reaction picker' : 'Add reaction'}
          >
            <PlusIcon />
          </button>
        ) : null}
      </div>

      {canReact && pickerOpen ? (
        <div
          className={`flex items-center overflow-x-auto py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${pickerGapClass}`}
          role="toolbar"
          aria-label="Choose a reaction"
        >
          {ALLOWED_FEED_REACTION_EMOJIS.map((emoji) => {
            const selected = reactions.some(
              (reaction) => reaction.reacted_by_me && reaction.emoji === emoji,
            )

            return (
              <button
                key={emoji}
                type="button"
                disabled={pending}
                onClick={() => handleToggle(emoji)}
                className={`flex shrink-0 items-center justify-center rounded-full transition disabled:opacity-60 ${pickerEmojiClass} ${
                  selected ? 'bg-zinc-800/90' : 'hover:bg-zinc-800/70'
                }`}
                style={selected ? { boxShadow: `inset 0 0 0 2px ${accent}` } : undefined}
                aria-label={`React with ${emoji}`}
                aria-pressed={selected}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      ) : null}

      {error ? <p className={`text-xs text-red-400 ${compact ? 'mt-1' : 'mt-2'}`}>{error}</p> : null}
    </div>
  )
}
