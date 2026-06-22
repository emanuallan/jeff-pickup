import Link from 'next/link'
import {
  formatEventTime,
  eventDisplayName,
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
  return (
    <ConsoleCard className="min-w-0 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-100">{formatEventTime(event)}</div>
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
      <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-white/5 pt-2">
        {!past ? (
          <EditSessionButton
            orgSlug={orgSlug}
            event={event}
            locations={locations}
            updateSession={updateEvent}
          />
        ) : null}
        <Link
          href={`/console/${orgSlug}/events/${event.short_id}`}
          className={`${chipAction} text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200`}
        >
          View analytics {arrowRight}
        </Link>
        <DeleteEventButton
          orgSlug={orgSlug}
          eventId={event.short_id}
          eventLabel={formatEventTime(event)}
          recurring={!past && event.schedule_id != null}
        />
      </div>
    </ConsoleCard>
  )
}
