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
    <div className="border-t border-white/5 bg-zinc-950/30 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {activeReactions.map((reaction) => {
          const selected = reaction.reacted_by_me

          if (!canReact) {
            return (
              <span
                key={reaction.emoji}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1 text-sm"
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition disabled:opacity-60 ${
                selected
                  ? 'border-zinc-600 bg-zinc-800/90'
                  : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
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
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-zinc-400 transition disabled:opacity-60 ${
              pickerOpen
                ? 'border-zinc-600 bg-zinc-800/80 text-zinc-200'
                : 'border-zinc-700 bg-transparent hover:border-zinc-600 hover:bg-zinc-900/80 hover:text-zinc-200'
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
          className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  selected ? 'bg-zinc-800/90' : 'hover:bg-zinc-800/70'
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
