import Link from 'next/link'
import {
  statusLabel,
  eventDisplayName,
  formatEventDayLabel,
  formatEventTimeOnly,
  type EventStatus,
  type EventWithLocation,
} from '@/lib/events'
import { arrowNe } from '@/lib/text-arrows'
import { MapsLink } from './maps-link'

export type EventLocationFields = Pick<
  EventWithLocation,
  | 'location_label'
  | 'location_address'
  | 'location_maps_url'
  | 'location_is_online'
  | 'location_meeting_url'
>

/** Event display name: recurring schedule title when present. */
export function eventName(event: Pick<EventWithLocation, 'title'>): string {
  return eventDisplayName(event.title)
}

export function isEventCancelled(status: EventStatus): boolean {
  return status === 'cancelled'
}

export function cancelledEventClasses(cancelled: boolean) {
  return {
    titleLg: cancelled ? 'text-zinc-400 line-through' : 'text-zinc-50',
    titleSm: cancelled ? 'text-zinc-500 line-through' : 'text-zinc-100',
    day: cancelled ? 'text-zinc-500' : 'text-zinc-100',
    time: cancelled ? 'text-zinc-500' : 'text-zinc-300',
    datetimeRow: cancelled ? 'line-through' : '',
  }
}

export function StatusPill({ status, accent }: { status: EventStatus; accent: string }) {
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        {statusLabel(status)}
      </span>
    )
  }
  if (status === 'on') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        {statusLabel(status)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-400">
      {statusLabel(status)}
    </span>
  )
}

export function LiveDot({ accent }: { accent: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: accent }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: accent }}
      />
    </span>
  )
}

export function EventDateTimeRow({
  event,
  cancelled,
}: {
  event: Pick<EventWithLocation, 'starts_at' | 'timezone'>
  cancelled: boolean
}) {
  const classes = cancelledEventClasses(cancelled)
  return (
    <div className={`mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${classes.datetimeRow}`}>
      <span className={`text-lg font-medium ${classes.day}`}>{formatEventDayLabel(event)}</span>
      <span className="text-zinc-600">·</span>
      <span className={`text-lg ${classes.time}`}>{formatEventTimeOnly(event)}</span>
    </div>
  )
}

export function CancelledCallout({ hasSignup }: { hasSignup: boolean }) {
  return (
    <section className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
        Session cancelled
      </h2>
      <p className="mt-2 text-sm text-zinc-300">
        {hasSignup
          ? "This session has been cancelled, so it won't be happening. Keep an eye out for the next one."
          : "This session has been cancelled and is no longer taking sign-ups. Check the other upcoming sessions."}
      </p>
    </section>
  )
}

const mapsLinkClass = 'cursor-pointer transition-colors hover:text-zinc-200'

export function EventLocationRow({
  event,
  nestedInLink = false,
  compact = false,
  className,
}: {
  event: EventLocationFields
  nestedInLink?: boolean
  compact?: boolean
  className?: string
}) {
  const mapsUrl = event.location_maps_url.trim()
  const address = event.location_address.trim()
  const meetingUrl = event.location_meeting_url.trim()
  const hasMaps = Boolean(mapsUrl)
  const linkClass = nestedInLink ? `${mapsLinkClass} pointer-events-auto` : mapsLinkClass

  const rowClass =
    className ??
    (compact
      ? 'flex min-w-0 items-center gap-1.5 text-xs text-zinc-500'
      : 'mt-3 flex items-start gap-2 text-sm text-zinc-400')

  if (event.location_is_online) {
    return (
      <div className={rowClass}>
        {!compact ? <OnlineIcon /> : null}
        <div className="min-w-0">
          {meetingUrl ? (
            <MapsLink href={meetingUrl} nestedInLink={nestedInLink} className={`truncate ${linkClass}`}>
              {event.location_label} · Join online {arrowNe}
            </MapsLink>
          ) : (
            <span className="truncate">{event.location_label} · Online</span>
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={rowClass}>
        {hasMaps ? (
          <MapsLink href={mapsUrl} nestedInLink={nestedInLink} className={`truncate ${linkClass}`}>
            {event.location_label}
          </MapsLink>
        ) : (
          <span className="truncate">{event.location_label}</span>
        )}
        {address ? (
          <>
            <span className="shrink-0 text-zinc-600">·</span>
            {hasMaps ? (
              <MapsLink
                href={mapsUrl}
                nestedInLink={nestedInLink}
                className={`min-w-0 truncate ${linkClass}`}
              >
                {address}
              </MapsLink>
            ) : (
              <span className="min-w-0 truncate">{address}</span>
            )}
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className={rowClass}>
      <PinIcon className="mt-0.5" />
      <div className="min-w-0">
        {hasMaps ? (
          <MapsLink href={mapsUrl} nestedInLink={nestedInLink} className={`block truncate ${linkClass}`}>
            {event.location_label}
          </MapsLink>
        ) : (
          <span className="block truncate">{event.location_label}</span>
        )}
        {address ? (
          hasMaps ? (
            <MapsLink
              href={mapsUrl}
              nestedInLink={nestedInLink}
              className={`mt-0.5 block truncate text-xs text-zinc-500 ${linkClass}`}
            >
              {address}
            </MapsLink>
          ) : (
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{address}</span>
          )
        ) : null}
      </div>
    </div>
  )
}

/** Compact row used in the "more sessions" list. */
export function SessionRow({
  event,
  accent,
}: {
  event: EventWithLocation
  accent: string
}) {
  const cancelled = isEventCancelled(event.status)
  const classes = cancelledEventClasses(cancelled)

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700">
      <Link
        href={`/events/${event.short_id}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${eventName(event)} on ${formatEventDayLabel(event)}`}
      />
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm font-medium ${classes.titleSm}`}>
            {eventName(event)}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-zinc-400">{formatEventDayLabel(event)}</span>
            <span>·</span>
            <span>{formatEventTimeOnly(event)}</span>
          </div>
          <EventLocationRow event={event} nestedInLink compact className="mt-0.5" />
        </div>
      </div>
      {cancelled ? (
        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
          {statusLabel(event.status)}
        </span>
      ) : event.status === 'on' ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-label={statusLabel(event.status)}
        />
      ) : null}
    </div>
  )
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-zinc-500${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function OnlineIcon({
  className,
}: {
  className?: string
}) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-zinc-500${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12a10 10 0 0 1 20 0 10 10 0 0 1-20 0Z" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </svg>
  )
}
