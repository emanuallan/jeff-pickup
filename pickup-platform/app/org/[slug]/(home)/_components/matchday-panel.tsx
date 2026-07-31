import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { isEventEnded } from '@/lib/events'
import {
  buildMatchdayChipDisplays,
  mergeMatchdayChipRail,
} from '@/lib/matchday-chip-display'
import { SessionPanel } from './session-panel'
import { SessionPanelSkeleton } from '../../_components/session-skeleton-ui'
import { MatchdayDateChips } from './matchday-date-chips'

type Props = {
  slug: string
  org: Org
  event: EventWithLocation
  eventId: string
  upcomingEvents: EventWithLocation[]
  chipPrefixEvents?: EventWithLocation[]
  /** Temporary trailing chips for deep-linked far-future sessions outside the rail. */
  chipSuffixEvents?: EventWithLocation[]
}

export function MatchdayPanel({
  slug,
  org,
  event,
  eventId,
  upcomingEvents,
  chipPrefixEvents = [],
  chipSuffixEvents = [],
}: Props) {
  const prefixIds = new Set(chipPrefixEvents.map((ev) => ev.short_id))
  const chipEvents = mergeMatchdayChipRail({
    prefix: chipPrefixEvents,
    upcoming: upcomingEvents,
    suffix: chipSuffixEvents,
    isEnded: isEventEnded,
  })
  const accent = org.branding.accent_color
  const chips = buildMatchdayChipDisplays(
    chipEvents.map((ev) => ({
      short_id: ev.short_id,
      starts_at: ev.starts_at,
      timezone: ev.timezone,
      status: ev.status,
      pastReference: prefixIds.has(ev.short_id) && ev.short_id !== event.short_id,
    })),
  )

  return (
    <>
      <MatchdayDateChips chips={chips} activeEventId={event.short_id} accent={accent} />
      <Suspense fallback={<SessionPanelSkeleton />} key={eventId}>
        <SessionPanel slug={slug} org={org} event={event} eventId={eventId} />
      </Suspense>
    </>
  )
}
