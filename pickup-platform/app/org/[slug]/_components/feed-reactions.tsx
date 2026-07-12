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
}

export function FeedReactions({ orgSlug, item, initialReactions, canReact, accent }: Props) {
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

  return (
    <div className="mt-4 border-t border-zinc-800/80 pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {activeReactions.map((reaction) => {
          const selected = reaction.reacted_by_me

          if (!canReact) {
            return (
              <span
                key={reaction.emoji}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/50 px-2.5 py-1 text-sm"
              >
                <span aria-hidden>{reaction.emoji}</span>
                <span className="text-xs font-medium tabular-nums text-zinc-400">{reaction.count}</span>
              </span>
            )
          }

          return (
            <button
              key={reaction.emoji}
              type="button"
              disabled={pending}
              onClick={() => handleToggle(reaction.emoji)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition disabled:opacity-60 ${
                selected
                  ? 'border-zinc-600 bg-zinc-800/80'
                  : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
              aria-pressed={selected}
              aria-label={`${selected ? 'Remove' : 'Add'} ${reaction.emoji} reaction`}
            >
              <span aria-hidden>{reaction.emoji}</span>
              <span className="text-xs font-medium tabular-nums text-zinc-300">{reaction.count}</span>
            </button>
          )
        })}

        {canReact ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setPickerOpen((open) => !open)}
            className="inline-flex items-center rounded-full border border-dashed border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-60"
            aria-expanded={pickerOpen}
          >
            React
          </button>
        ) : null}
      </div>

      {canReact && pickerOpen ? (
        <div
          className="mt-2 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg transition disabled:opacity-60 ${
                  selected
                    ? 'ring-2 ring-offset-1 ring-offset-zinc-900'
                    : 'hover:bg-zinc-800/80'
                }`}
                style={selected ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                aria-label={`React with ${emoji}`}
                aria-pressed={selected}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
