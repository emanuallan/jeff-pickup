import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import {
  getPublicOrgAndEvent,
  getPublicNextActiveUpcomingEvent,
} from '@/lib/public-data'
import {
  formatEventTime,
  formatEventWhenLine,
  isEventInProgress,
  isEventEnded,
} from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { buildEventJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import {
  lookupParticipantId,
  recordEventPageView,
  resolvePageViewTrackingKeys,
} from '@/lib/record-page-view'
import { WeatherPill } from './weather-pill'
import { EventHeadcount, EventHeadcountFallback } from './event-headcount'
import { EventParticipation } from './event-participation'
import { ParticipationFallback } from './participation-fallback'
import { LeaderboardLinkDeferred } from './leaderboard-link-deferred'
import { AllSessionsLinkDeferred } from './all-sessions-link-deferred'
import { ShareButton } from '../../share-button-lazy'
import { OrgHeader } from '../../_components/org-header'
import { OrgPageShell, OrgPageFooter } from '../../_components/org-page-shell'
import {
  StatusPill,
  EventDateTimeRow,
  EventLocationRow,
  EventTimingBadge,
  ViewNextSessionLink,
  eventName,
  isEventCancelled,
  cancelledEventClasses,
} from '../../_components/event-ui'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, eventId } = await params
  const result = await getPublicOrgAndEvent(slug, eventId)
  if (!result?.org || result.org.status !== 'active') {
    return {}
  }

  const { org, event } = result
  if (!event) {
    return {}
  }

  const when = formatEventTime(event)
  const title = `${when} · ${org.name}`
  const groupDescription = org.description || 'a session'
  const locationPreposition = event.location_is_online ? 'on' : 'at'
  const where = event.location_label ? ` ${locationPreposition} ${event.location_label}` : ''
  const description = `Join ${org.name} for ${groupDescription} on ${when}${where}. See who's coming and confirm you're in — it only takes a few seconds.`

  return buildOrgMetadata({
    slug,
    path: `/events/${eventId}`,
    imagePath: `/events/${eventId}/og-image`,
    title,
    description,
    siteName: org.name,
  })
}

export default async function EventPage({ params }: Props) {
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
  } else {
    console.error('recordEventPageView: missing viewer key (cookie and x-visitor-key header)')
  }

  const isCancelled = isEventCancelled(event.status)
  const cancelledClasses = cancelledEventClasses(isCancelled)
  const isLive = isEventInProgress(event) && event.status === 'on'
  const isEnded = isEventEnded(event)
  const nextActiveSession = isCancelled || isEnded ? nextSession : null
  const shareText = `${org.name}: ${formatEventTime(event)} ${event.location_is_online ? 'on' : 'at'} ${event.location_label}. Join us!`
  const accent = org.branding.accent_color

  return (
    <OrgPageShell>
      <JsonLd data={buildEventJsonLd(org, event, `/events/${eventId}`)} />
      <div className="flex items-center justify-end gap-3">
        <Suspense fallback={null}>
          <AllSessionsLinkDeferred orgId={org.id} />
        </Suspense>
        <ShareButton title={org.name} text={shareText} />
      </div>

      <OrgHeader
        org={org}
        eyebrow="Session"
        title={eventName(event)}
        subtitle={`${org.name} · ${formatEventWhenLine(event)}`}
        className="mt-4"
        logoPriority
      />

      {nextActiveSession ? (
        <ViewNextSessionLink
          href={`/events/${nextActiveSession.short_id}`}
          accent={accent}
          className="mt-6 mb-1"
        />
      ) : null}

      <section className={nextActiveSession ? 'mt-2' : 'mt-8'}>
        <p className="mb-3 px-1 text-xs text-zinc-500">
          {isCancelled
            ? 'Cancelled session — details for reference.'
            : isEnded
              ? 'Past session — see who came below.'
              : 'Sign up below to join the roster.'}
        </p>
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6">
          <div className="flex items-center justify-between gap-3">
            <EventTimingBadge event={event} accent={accent} cancelled={isCancelled} />
            <StatusPill status={event.status} accent={accent} live={isLive} ended={isEnded} />
          </div>

          <h2 className={`mt-4 text-2xl font-semibold tracking-tight ${cancelledClasses.titleLg}`}>
            {eventName(event)}
          </h2>

          <EventDateTimeRow event={event} cancelled={isCancelled} />

          <EventLocationRow event={event} className="mt-3 flex gap-2 text-sm text-zinc-400" />

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
              />
            </Suspense>
          </div>

          {event.announcement ? (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
              {event.announcement}
            </p>
          ) : null}
        </div>
      </section>

      <Suspense fallback={<ParticipationFallback />}>
        <EventParticipation slug={slug} eventId={eventId} org={org} event={event} />
      </Suspense>

      <OrgPageFooter
        slug={org.slug}
        links={org.branding.links}
        accent={accent}
        leaderboardSlot={
          <Suspense fallback={null}>
            <LeaderboardLinkDeferred orgId={org.id} accent={accent} />
          </Suspense>
        }
      />
    </OrgPageShell>
  )
}
