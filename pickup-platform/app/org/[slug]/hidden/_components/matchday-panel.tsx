import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { isEventEnded } from '@/lib/events'
import { SessionPanel } from './session-panel'
import { MatchdayDateChips } from './matchday-date-chips'

type Props = {
  slug: string
  org: Org
  event: EventWithLocation
  eventId: string
  upcomingEvents: EventWithLocation[]
  chipPrefixEvents?: EventWithLocation[]
}

export function MatchdayPanel({
  slug,
  org,
  event,
  eventId,
  upcomingEvents,
  chipPrefixEvents = [],
}: Props) {
  const prefixIds = new Set(chipPrefixEvents.map((ev) => ev.short_id))
  const chipEvents = [
    ...chipPrefixEvents,
    ...upcomingEvents.filter((ev) => !isEventEnded(ev) && !prefixIds.has(ev.short_id)),
  ]
  const accent = org.branding.accent_color

  return (
    <>
      <Suspense fallback={null}>
        <MatchdayDateChips
          events={chipEvents.map((ev) => ({
            short_id: ev.short_id,
            starts_at: ev.starts_at,
            timezone: ev.timezone,
            status: ev.status,
            pastReference: prefixIds.has(ev.short_id),
          }))}
          activeEventId={event.short_id}
          accent={accent}
        />
      </Suspense>
      <SessionPanel slug={slug} org={org} event={event} eventId={eventId} />
    </>
  )
}
