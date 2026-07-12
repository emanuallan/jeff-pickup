'use client'

import { useState } from 'react'
import {
  sessionFeedbackCommentRequired,
  sessionFeedbackCommentsAvailable,
} from '@/lib/session-feedback'
import { markSessionNoAttend, submitSessionFeedback } from '../participant-notification-actions'

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

type Props = {
  orgSlug: string
  eventId: string
  accent: string
  disabled?: boolean
  showNoAttendOption?: boolean
  onComplete: (outcome: 'rated' | 'no_attend' | 'skipped') => void
  onBusyChange?: (busy: boolean) => void
}

export function SessionFeedbackStep({
  orgSlug,
  eventId,
  accent,
  disabled = false,
  showNoAttendOption = true,
  onComplete,
  onBusyChange,
}: Props) {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'submit' | 'no_attend' | null>(null)
  const [confirmNoAttend, setConfirmNoAttend] = useState(false)

  const commentsAvailable = sessionFeedbackCommentsAvailable(rating)
  const commentRequired = rating != null && sessionFeedbackCommentRequired(rating)
  const canSubmit =
    rating != null &&
    (!commentRequired || comment.trim().length > 0) &&
    loading === null &&
    !disabled

  async function handleSubmit() {
    if (rating == null) return
    setLoading('submit')
    onBusyChange?.(true)
    setError(null)
    const result = await submitSessionFeedback(orgSlug, eventId, rating, comment)
    setLoading(null)
    onBusyChange?.(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onComplete('rated')
  }

  async function handleNoAttend() {
    setLoading('no_attend')
    onBusyChange?.(true)
    setError(null)
    const result = await markSessionNoAttend(orgSlug, eventId)
    setLoading(null)
    onBusyChange?.(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onComplete('no_attend')
  }

  return (
    <div>
      <div className="mt-2">
        <StarRating value={rating} onChange={setRating} accent={accent} />
      </div>

      {commentsAvailable ? (
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
            disabled={disabled || loading !== null}
            placeholder={
              rating != null && rating >= 3
                ? 'Anything you’d like to share?'
                : 'Tell us what could be better…'
            }
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none disabled:opacity-50"
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

      {showNoAttendOption ? (
        <div className="mt-4 border-t border-white/5 pt-4">
          {confirmNoAttend ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-zinc-400">
                Please confirm you did not attend this session.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading !== null || disabled}
                  onClick={() => setConfirmNoAttend(false)}
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading !== null || disabled}
                  onClick={() => void handleNoAttend()}
                  className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
                >
                  {loading === 'no_attend' ? 'Confirming…' : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={loading !== null || disabled}
              onClick={() => setConfirmNoAttend(true)}
              className="w-full text-center text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              I did not attend
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
