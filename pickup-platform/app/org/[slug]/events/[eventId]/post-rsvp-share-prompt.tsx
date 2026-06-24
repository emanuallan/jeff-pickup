'use client'

import { useEffect, useState } from 'react'
import { ResponsiveSheetDialog } from '@/app/_components/responsive-sheet-dialog'
import {
  dismissPostRsvpShare,
  isPostRsvpSharePending,
} from '@/lib/post-rsvp-share'

type Props = {
  eventId: string
  title: string
  text: string
  accent: string
  accentText: string
}

export function PostRsvpSharePrompt({
  eventId,
  title,
  text,
  accent,
  accentText,
}: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOpen(isPostRsvpSharePending(eventId))
  }, [eventId])

  function dismiss() {
    dismissPostRsvpShare(eventId)
    setOpen(false)
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

  return (
    <ResponsiveSheetDialog
      open={open}
      onClose={dismiss}
      titleId="post-rsvp-share-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="post-rsvp-share-title" className="text-lg font-semibold text-zinc-50">
            You&apos;re in!
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Know someone who&apos;d come? Share the link in your group chat.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 hidden shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-zinc-300 sm:block"
        >
          <svg
            className="h-5 w-5"
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
        className="mt-5 flex w-full min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90"
        style={{
          backgroundColor: accent,
          color: accentText,
          boxShadow: `0 10px 30px -12px ${accent}`,
        }}
      >
        {copied ? (
          <>
            <svg
              className="h-4 w-4"
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
              className="h-4 w-4"
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

      <button
        type="button"
        onClick={dismiss}
        className="mt-3 w-full py-2.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        Not now
      </button>
    </ResponsiveSheetDialog>
  )
}
