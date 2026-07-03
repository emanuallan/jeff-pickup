import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { isEventCancelled } from '@/lib/events'
import { SessionPanel } from './session-panel'
import { MatchdayDateChips } from './matchday-date-chips'

type Props = {
  slug: string
  org: Org
  event: EventWithLocation
  eventId: string
  upcomingEvents: EventWithLocation[]
}

export function MatchdayPanel({
  slug,
  org,
  event,
  eventId,
  upcomingEvents,
}: Props) {
  const futureEvents = upcomingEvents.filter((ev) => !isEventCancelled(ev.status))
  const accent = org.branding.accent_color

  return (
    <>
      <Suspense fallback={null}>
        <MatchdayDateChips
          events={futureEvents}
          activeEventId={event.short_id}
          accent={accent}
        />
      </Suspense>
      <SessionPanel slug={slug} org={org} event={event} eventId={eventId} />
    </>
  )
}
