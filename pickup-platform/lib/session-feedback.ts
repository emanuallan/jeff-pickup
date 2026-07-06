export type SessionFeedbackOutcome = 'rated' | 'no_attend'

export type SessionFeedbackInput = {
  rating: number
  comment: string
}

export type SessionFeedbackRow = {
  id: string
  org_id: string
  event_id: string
  participant_id: string
  outcome: SessionFeedbackOutcome
  rating: number | null
  comment: string | null
  created_at: string
  participant_display_name: string
  event_starts_at: string
  event_label: string
  event_short_id: string
}

export type SessionFeedbackSummary = {
  ratedCount: number
  noAttendCount: number
  averageRating: number | null
}

export function validateSessionFeedbackInput(
  rating: number,
  comment: string,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Choose a rating between 1 and 5 stars.' }
  }

  const trimmed = comment.trim()
  if (rating <= 2 && trimmed.length === 0) {
    return { ok: false, error: 'Please share a short comment for ratings of 2 or lower.' }
  }

  if (trimmed.length > 2000) {
    return { ok: false, error: 'Comment is too long (max 2000 characters).' }
  }

  return { ok: true }
}

export function sessionFeedbackCommentRequired(rating: number): boolean {
  return rating <= 2
}

/** Comments are available once a rating is chosen. */
export function sessionFeedbackCommentsAvailable(rating: number | null): boolean {
  return rating != null
}

export function buildSessionFeedbackSummary(
  rows: Pick<SessionFeedbackRow, 'outcome' | 'rating'>[],
): SessionFeedbackSummary {
  const rated = rows.filter((row) => row.outcome === 'rated' && row.rating != null)
  const noAttendCount = rows.filter((row) => row.outcome === 'no_attend').length
  const ratedCount = rated.length
  const averageRating =
    ratedCount > 0
      ? rated.reduce((sum, row) => sum + (row.rating ?? 0), 0) / ratedCount
      : null

  return { ratedCount, noAttendCount, averageRating }
}

export function formatStarRating(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export function formatAverageRating(value: number | null): string {
  if (value == null) return '—'
  return value.toFixed(1)
}
