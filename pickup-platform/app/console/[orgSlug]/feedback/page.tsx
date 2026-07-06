import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef } from '@/lib/events'
import { orgFeatures } from '@/lib/org-features'
import { getOrgSessionFeedback } from '@/lib/session-feedback.server'
import {
  buildSessionFeedbackSummary,
  formatAverageRating,
  formatStarRating,
} from '@/lib/session-feedback'
import {
  ConsolePage,
  ConsoleHeader,
  ConsoleSection,
  ConsoleCard,
} from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ event?: string }>
}

export default async function ConsoleFeedbackPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { event: eventRef } = await searchParams
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  if (!orgFeatures(org).session_feedback) {
    notFound()
  }

  let eventId: string | undefined
  if (eventRef) {
    const event = await getEventByRef(eventRef, org.id)
    if (!event) {
      notFound()
    }
    eventId = event.id
  }

  const rows = await getOrgSessionFeedback(org.id, { eventId, limit: 200 })
  const summary = buildSessionFeedbackSummary(rows)

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Session feedback"
        description="Ratings and comments from participants after sessions end."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <ConsoleCard className="text-sm">
          <div className="text-xs text-zinc-500">Average rating</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">
            {formatAverageRating(summary.averageRating)}
          </div>
        </ConsoleCard>
        <ConsoleCard className="text-sm">
          <div className="text-xs text-zinc-500">Rated sessions</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">{summary.ratedCount}</div>
        </ConsoleCard>
        <ConsoleCard className="text-sm">
          <div className="text-xs text-zinc-500">Did not attend</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">{summary.noAttendCount}</div>
        </ConsoleCard>
      </div>

      <div className="mt-8">
        <ConsoleSection
          title={eventRef ? 'Feedback for this session' : `All feedback (${rows.length})`}
          action={
            eventRef ? (
              <Link
                href={`/console/${orgSlug}/feedback`}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                View all feedback
              </Link>
            ) : undefined
          }
        >
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No feedback yet. Participants who signed up will be prompted after sessions end.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.id}>
                  <ConsoleCard className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
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
                        <div className="mt-1 text-xs text-zinc-500">{row.event_label}</div>
                        {row.comment ? (
                          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{row.comment}</p>
                        ) : null}
                      </div>
                      {row.event_short_id ? (
                        <Link
                          href={`/console/${orgSlug}/sessions/${row.event_short_id}`}
                          className="shrink-0 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                        >
                          Session
                        </Link>
                      ) : null}
                    </div>
                  </ConsoleCard>
                </li>
              ))}
            </ul>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
