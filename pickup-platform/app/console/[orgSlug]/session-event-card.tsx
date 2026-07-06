import Link from 'next/link'
import {
  formatEventTime,
  eventDisplayName,
  isEventInProgress,
  type EventWithLocation,
} from '@/lib/events'
import type { Location } from '@/lib/locations'
import { arrowRight } from '@/lib/text-arrows'
import { ConsoleCard, chipAction } from '../_components/console-ui'
import { DeleteEventButton } from './delete-event-button'
import { EditSessionButton } from './edit-session-button'
import { EventStatusSelect } from './event-status-select'
import { EventAnnouncementEditor } from './event-announcement-editor'
import { updateEvent } from '../actions'

const sessionFallback = 'Session'

export function SessionEventCard({
  orgSlug,
  event,
  locations,
  past,
}: {
  orgSlug: string
  event: EventWithLocation
  locations: Location[]
  past?: boolean
}) {
  const isLive = !past && isEventInProgress(event) && event.status === 'on'

  return (
    <ConsoleCard className="min-w-0 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-zinc-100">
            {isLive ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/25"
                aria-hidden
              />
            ) : null}
            <span>{formatEventTime(event)}</span>
            {isLive ? <span className="sr-only"> — live</span> : null}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {eventDisplayName(event.title, sessionFallback)} · {event.location_label}
          </div>
        </div>
        <EventStatusSelect orgSlug={orgSlug} eventId={event.short_id} status={event.status} />
      </div>
      <EventAnnouncementEditor
        orgSlug={orgSlug}
        eventId={event.short_id}
        announcement={event.announcement}
      />
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
        <div className="flex flex-wrap items-center gap-1">
          {!past ? (
            <EditSessionButton
              orgSlug={orgSlug}
              event={event}
              locations={locations}
              updateSession={updateEvent}
            />
          ) : null}
          <DeleteEventButton
            orgSlug={orgSlug}
            eventId={event.short_id}
            eventLabel={formatEventTime(event)}
            recurring={!past && event.schedule_id != null}
          />
        </div>
        <Link
          href={`/console/${orgSlug}/sessions/${event.short_id}`}
          className={`${chipAction} shrink-0 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200`}
        >
          View more {arrowRight}
        </Link>
      </div>
    </ConsoleCard>
  )
}
