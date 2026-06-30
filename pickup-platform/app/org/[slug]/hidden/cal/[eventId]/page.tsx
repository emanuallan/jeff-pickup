import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import {
  getPublicOrgAndEvent,
  getPublicNextActiveUpcomingEvent,
} from '@/lib/public-data'
import { isEventInProgress, isEventEnded } from '@/lib/events'
import { HIDDEN_SESSION_BASE } from '@/lib/org-public-nav'
import { buildEventJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import {
  lookupParticipantId,
  recordEventPageView,
  resolvePageViewTrackingKeys,
} from '@/lib/record-page-view'
import {
  buildEventShareText,
  buildEventShareTitle,
} from '@/lib/public-share-text'
import { WeatherPill } from '../../../cal/[eventId]/weather-pill'
import { EventHeadcount, EventHeadcountFallback } from '../../../cal/[eventId]/event-headcount'
import { EventParticipation } from '../../../cal/[eventId]/event-participation'
import { PageHelpHint } from '../../../_components/page-help-hint'
import { ParticipationFallback } from '../../../cal/[eventId]/participation-fallback'
import { ShareButton } from '../../../share-button-lazy'
import {
  StatusPill,
  EventDateTimeRow,
  EventLocationRow,
  EventTimingBadge,
  ViewNextSessionLink,
  eventName,
  isEventCancelled,
  cancelledEventClasses,
} from '../../../_components/event-ui'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export default async function HiddenEventPage({ params }: Props) {
  const { slug, eventId } = await params

  const result = await getPublicOrgAndEvent(slug, eventId)
  if (!result?.org || result.org.status !== 'active' || !result.event) {
    notFound()
  }

  const { org, event } = result

  const [tracking, nextSession] = await Promise.all([
    resolvePageViewTrackingKeys(),
    getPublicNextActiveUpcomingEvent(org.id),
  ])

  const { viewerKey, sessionToken } = tracking
  if (viewerKey) {
    after(async () => {
      const participantId = sessionToken
        ? await lookupParticipantId(org.id, sessionToken)
        : null
      await recordEventPageView(event.id, { viewerKey, participantId })
    })
  }

  const isCancelled = isEventCancelled(event.status)
  const cancelledClasses = cancelledEventClasses(isCancelled)
  const isLive = isEventInProgress(event) && event.status === 'on'
  const isEnded = isEventEnded(event)
  const nextActiveSession = isCancelled || isEnded ? nextSession : null
  const shareText = buildEventShareText(org.name, event)
  const shareTitle = buildEventShareTitle(org.name, event)
  const accent = org.branding.accent_color

  const helpMessage = isCancelled
    ? 'Cancelled session — details for reference.'
    : isEnded
      ? 'Past session — see who came below.'
      : 'Sign up below to join the roster.'

  return (
    <>
      <JsonLd data={buildEventJsonLd(org, event, `/cal/${eventId}`)} />

      <nav className="mb-6 flex min-h-9 items-center justify-end gap-3">
        <ShareButton
          title={shareTitle}
          text={shareText}
          imagePath={`/cal/${eventId}/share-image`}
          accent={accent}
        />
      </nav>

      <section className={nextActiveSession ? 'mt-0' : 'mt-0'}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <PageHelpHint message={helpMessage} fullWidth={false} className="min-w-0" />
          {nextActiveSession ? (
            <ViewNextSessionLink
              href={`${HIDDEN_SESSION_BASE}/${nextActiveSession.short_id}`}
              accent={accent}
              inline
              className="shrink-0"
            />
          ) : null}
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6">
          <div className="flex items-center justify-between gap-3">
            <EventTimingBadge event={event} accent={accent} cancelled={isCancelled} />
            <StatusPill
              status={event.status}
              accent={accent}
              live={isLive}
              ended={isEnded}
            />
          </div>

          <h2
            className={`mt-4 text-2xl font-semibold tracking-tight ${cancelledClasses.titleLg}`}
          >
            {eventName(event)}
          </h2>

          <EventDateTimeRow event={event} cancelled={isCancelled} />

          <EventLocationRow
            event={event}
            className="mt-3 flex gap-2 text-sm text-zinc-400"
          />

          {event.announcement ? (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
              {event.announcement}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4 text-sm">
            <Suspense
              fallback={
                <EventHeadcountFallback
                  capacity={event.capacity}
                  minPlayers={event.min_players}
                  ended={isEnded}
                />
              }
            >
              <EventHeadcount
                orgSlug={slug}
                eventRef={eventId}
                eventId={event.id}
                capacity={event.capacity}
                minPlayers={event.min_players}
                accent={accent}
                pollActive={!isCancelled && !isEnded}
                ended={isEnded}
              />
            </Suspense>
            <Suspense fallback={null}>
              <WeatherPill
                lat={event.location_lat}
                lon={event.location_lon}
                startsAt={event.starts_at}
                timeZone={event.timezone}
              />
            </Suspense>
          </div>
        </div>
      </section>

      <Suspense fallback={<ParticipationFallback />}>
        <EventParticipation slug={slug} eventId={eventId} org={org} event={event} />
      </Suspense>
    </>
  )
}
