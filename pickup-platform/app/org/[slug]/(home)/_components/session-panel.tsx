import { Suspense } from 'react'
import { after } from 'next/server'
import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { isEventInProgress, isEventEnded } from '@/lib/events'
import {
  lookupParticipantId,
  recordEventPageView,
  resolvePageViewTrackingKeys,
} from '@/lib/record-page-view'
import { WeatherPill } from '../../cal/[eventId]/weather-pill'
import { EventHeadcount, EventHeadcountFallback } from '../../cal/[eventId]/event-headcount'
import { EventParticipation } from '../../cal/[eventId]/event-participation'
import { ParticipationFallback } from '../../cal/[eventId]/participation-fallback'
import {
  StatusPill,
  EventDateTimeRow,
  EventLocationRow,
  EventTimingBadge,
  eventName,
  isEventCancelled,
  cancelledEventClasses,
} from '../../_components/event-ui'
import { EventAnnouncementBanner } from '../../_components/event-announcement-banner'
import { ORG_PUBLIC_DESKTOP_STICKY_CARD, ORG_PUBLIC_SESSION_PANEL_GRID } from '@/lib/org-public-layout'

type Props = {
  slug: string
  org: Org
  event: EventWithLocation
  eventId: string
}

export async function SessionPanel({ slug, org, event, eventId }: Props) {
  after(async () => {
    const { viewerKey, sessionToken } = await resolvePageViewTrackingKeys()
    if (!viewerKey) return

    const participantId = sessionToken
      ? await lookupParticipantId(org.id, sessionToken)
      : null
    await recordEventPageView(event.id, { viewerKey, participantId })
  })

  const isCancelled = isEventCancelled(event.status)
  const cancelledClasses = cancelledEventClasses(isCancelled)
  const isLive = isEventInProgress(event) && event.status === 'on'
  const isEnded = isEventEnded(event)
  const accent = org.branding.accent_color

  return (
    <>
      <EventAnnouncementBanner text={event.announcement} accent={accent} />

      <div className={ORG_PUBLIC_SESSION_PANEL_GRID}>
      <section className={ORG_PUBLIC_DESKTOP_STICKY_CARD}>
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6 md:p-7">
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

          {event.additional_information ? (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
              {event.additional_information}
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

      <div className="md:min-w-0">
        <Suspense fallback={<ParticipationFallback />}>
          <EventParticipation slug={slug} eventId={eventId} org={org} event={event} />
        </Suspense>
      </div>
      </div>
    </>
  )
}
