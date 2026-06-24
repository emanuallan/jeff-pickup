'use client'

import { useEffect, useState } from 'react'
import { hexToRgba } from '@/lib/colors'
import {
  dismissPostRsvpShare,
  isPostRsvpSharePending,
} from '@/lib/post-rsvp-share'

type Props = {
  eventId: string
  title: string
  text: string
  accent: string
}

export function PostRsvpSharePrompt({ eventId, title, text, accent }: Props) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setVisible(isPostRsvpSharePending(eventId))
  }, [eventId])

  function dismiss() {
    dismissPostRsvpShare(eventId)
    setVisible(false)
  }

  async function handleShare() {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        dismiss()
        return
      } catch {
        // cancelled or unsupported — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        dismiss()
      }, 1500)
    } catch {
      // ignore
    }
  }

  if (!visible) return null

  return (
    <div
      className="mb-4 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: hexToRgba(accent, 0.28),
        backgroundColor: hexToRgba(accent, 0.08),
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">You&apos;re in!</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Know someone who&apos;d come? Share the link in your group chat.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        onClick={handleShare}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 py-2 text-xs font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
      >
        {copied ? (
          <>
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </svg>
            Share the link
          </>
        )}
      </button>
    </div>
  )
}
