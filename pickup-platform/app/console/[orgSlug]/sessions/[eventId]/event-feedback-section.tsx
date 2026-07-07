import Link from 'next/link'
import { getOrgSessionFeedback } from '@/lib/session-feedback.server'
import {
  buildSessionFeedbackSummary,
  formatAverageRating,
  formatStarRating,
} from '@/lib/session-feedback'
import { ConsoleSection, ConsoleCard } from '../../../_components/console-ui'

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
}

export async function EventFeedbackSection({ orgSlug, orgId, eventId }: Props) {
  const rows = await getOrgSessionFeedback(orgId, { eventId, limit: 50 })
  const summary = buildSessionFeedbackSummary(rows)

  if (rows.length === 0) {
    return (
      <ConsoleSection
        title="Feedback"
        description="Participants can rate this session after it ends."
      >
        <p className="text-sm text-zinc-500">No feedback yet for this session.</p>
      </ConsoleSection>
    )
  }

  return (
    <ConsoleSection
      title={`Feedback (${rows.length})`}
      description={`Average rating ${formatAverageRating(summary.averageRating)}`}
      action={
        <Link
          href={`/console/${orgSlug}/feedback?event=${rows[0]?.event_short_id ?? ''}`}
          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
        >
          View more
        </Link>
      }
    >
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <ConsoleCard className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-100">{row.participant_display_name}</span>
                {row.outcome === 'no_attend' ? (
                  <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Did not attend
                  </span>
                ) : (
                  <span className="text-amber-300" aria-label={`${row.rating} stars`}>
                    {formatStarRating(row.rating ?? 0)}
                  </span>
                )}
              </div>
              {row.comment ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{row.comment}</p>
              ) : null}
            </ConsoleCard>
          </li>
        ))}
      </ul>
    </ConsoleSection>
  )
}
