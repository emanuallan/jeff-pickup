'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { hexToRgba } from '@/lib/colors'
import {
  sessionFeedbackCommentRequired,
  sessionFeedbackCommentVisible,
} from '@/lib/session-feedback'
import type { ParticipantNotificationPayload } from '@/lib/participant-notifications'
import {
  markSessionNoAttend,
  submitSessionFeedback,
} from '../participant-notification-actions'

function formatFeedbackWhen(startsAt: string): string {
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  eventId: string
  payload: ParticipantNotificationPayload
  accent: string
  onSubmitted?: () => void
}

function StarRating({
  value,
  onChange,
  accent,
}: {
  value: number | null
  onChange: (rating: number) => void
  accent: string
}) {
  return (
    <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = value != null && star <= value
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            onClick={() => onChange(star)}
            className="rounded-lg p-1 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              color: selected ? accent : 'rgb(113 113 122)',
              outlineColor: accent,
            }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export function SessionFeedbackSheet({
  open,
  onClose,
  orgSlug,
  eventId,
  payload,
  accent,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'submit' | 'no_attend' | null>(null)
  const [confirmNoAttend, setConfirmNoAttend] = useState(false)

  useEffect(() => {
    if (!open) {
      setRating(null)
      setComment('')
      setError(null)
      setLoading(null)
      setConfirmNoAttend(false)
    }
  }, [open])

  const commentVisible = sessionFeedbackCommentVisible(rating)
  const commentRequired = rating != null && sessionFeedbackCommentRequired(rating)
  const canSubmit =
    rating != null &&
    (!commentRequired || comment.trim().length > 0) &&
    loading === null

  const whenLine = formatFeedbackWhen(payload.event_starts_at)

  async function handleSubmit() {
    if (rating == null) return
    setLoading('submit')
    setError(null)
    const result = await submitSessionFeedback(orgSlug, eventId, rating, comment)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
      return
    }
    onSubmitted?.()
    onClose()
  }

  async function handleNoAttend() {
    setLoading('no_attend')
    setError(null)
    const result = await markSessionNoAttend(orgSlug, eventId)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
      return
    }
    onSubmitted?.()
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      dismissDisabled={loading !== null}
      ariaLabelledby="session-feedback-title"
      panelStyle={{
        boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
      }}
    >
      <h2 id="session-feedback-title" className="text-lg font-semibold tracking-tight text-zinc-50">
        How would you rate this session?
      </h2>

      <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-900/50 px-4 py-3">
        <p className="text-sm font-medium text-zinc-100">{payload.event_label}</p>
        <p className="mt-1 text-xs text-zinc-400">{whenLine}</p>
        {payload.location_label ? (
          <p className="mt-0.5 text-xs text-zinc-500">{payload.location_label}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <StarRating value={rating} onChange={setRating} accent={accent} />
      </div>

      {commentVisible ? (
        <div className="mt-5">
          <label htmlFor="session-feedback-comment" className="block text-xs font-medium text-zinc-400">
            Comments{commentRequired ? ' (required)' : ' (optional)'}
          </label>
          <textarea
            id="session-feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Tell us what could be better…"
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none"
          />
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
        className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: accent }}
      >
        {loading === 'submit' ? 'Submitting…' : 'Submit feedback'}
      </button>

      <div className="mt-4 border-t border-white/5 pt-4">
        {confirmNoAttend ? (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-zinc-400">
              Remove yourself from this session&apos;s roster? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => setConfirmNoAttend(false)}
                className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleNoAttend()}
                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
              >
                {loading === 'no_attend' ? 'Removing…' : 'I did not attend'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setConfirmNoAttend(true)}
            className="w-full text-center text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            I did not attend
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
