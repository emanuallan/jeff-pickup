import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  statusLabel,
  eventDisplayName,
  formatEventDayLabel,
  formatEventTimeOnly,
  formatEventWhenLine,
  formatEventHappening,
  isEventCancelled,
  isEventEnded,
  isEventInProgress,
  type EventStatus,
  type EventWithLocation,
} from '@/lib/events'
import { arrowNe, arrowRight } from '@/lib/text-arrows'
import { accentOnDark, hexToRgba } from '@/lib/colors'

export { isEventCancelled }

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

export function cancelledEventClasses(cancelled: boolean) {
  return {
    titleLg: cancelled ? 'text-zinc-400 line-through' : 'text-zinc-50',
    titleSm: cancelled ? 'text-zinc-500 line-through' : 'text-zinc-100',
    day: cancelled ? 'text-zinc-500' : 'text-zinc-100',
    time: cancelled ? 'text-zinc-500' : 'text-zinc-300',
    datetimeRow: cancelled ? 'line-through' : '',
  }
}

export function StatusPill({
  status,
  accent,
  live = false,
  ended = false,
  compact = false,
}: {
  status: EventStatus
  accent: string
  live?: boolean
  ended?: boolean
  compact?: boolean
}) {
  const pill = compact
    ? 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium'
    : 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium'
  const dot = compact ? 'h-1 w-1 rounded-full' : 'h-1.5 w-1.5 rounded-full'

  if (status === 'cancelled') {
    return (
      <span className={`${pill} bg-red-500/15 text-red-400`}>
        <span className={`${dot} bg-red-400`} />
        {statusLabel(status)}
      </span>
    )
  }
  if (status === 'on' && live) {
    return (
      <span className={`${pill} bg-red-500/15 text-red-400`}>
        <span className={`${dot} bg-red-400`} />
        Live
      </span>
    )
  }
  if (status === 'on' && ended) {
    return (
      <span className={`${pill} bg-zinc-800/80 text-zinc-500`}>
        <span className={`${dot} bg-zinc-500`} />
        Ended
      </span>
    )
  }
  if (status === 'on') {
    return (
      <span className={`${pill} bg-emerald-500/15 text-emerald-400`}>
        <span className={`${dot} bg-emerald-400`} />
        {statusLabel(status)}
      </span>
    )
  }
  return (
    <span className={`${pill} bg-zinc-800/60 text-zinc-500`}>
      {statusLabel(status)}
    </span>
  )
}

export function LiveDot({ accent, live = false }: { accent: string; live?: boolean }) {
  const color = live ? '#f87171' : accentOnDark(accent)
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

type EventTimingFields = Pick<EventWithLocation, 'starts_at' | 'duration_min' | 'timezone' | 'status'>

/** Left-side timing label for event cards (pulse, happening now, already happened). */
export function EventTimingBadge({
  event,
  accent,
  cancelled,
  upcomingLabel,
}: {
  event: EventTimingFields
  accent: string
  cancelled: boolean
  /** Label when the session hasn't started yet — defaults to "Happening {when}". */
  upcomingLabel?: string
}) {
  if (cancelled) {
    return (
      <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
        Not happening
      </span>
    )
  }

  const ended = isEventEnded(event)
  const inProgress = isEventInProgress(event)

  if (ended) {
    return (
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Already happened
      </span>
    )
  }

  const label = inProgress
    ? 'Happening now'
    : (upcomingLabel ?? `Happening ${formatEventHappening(event)}`)
  const labelColor = inProgress ? '#f87171' : accentOnDark(accent)

  return (
    <span className="flex items-center gap-2">
      <LiveDot accent={accent} live={inProgress} />
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: labelColor }}
      >
        {label}
      </span>
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
      <span className={`text-lg font-medium ${classes.day}`}>{formatEventWhenLine(event)}</span>
    </div>
  )
}

export function CancelledSessionNotice({
  href,
  className = 'mt-2',
}: {
  href: string
  className?: string
}) {
  return (
    <div className={`flex justify-end ${className}`}>
      <Link
        href={href}
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        A previously scheduled session was cancelled.
      </Link>
    </div>
  )
}

export function ViewNextSessionLink({
  href,
  accent,
  className = 'mt-6',
}: {
  href: string
  accent: string
  className?: string
}) {
  return (
    <div className={`flex justify-end ${className}`}>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
        style={{ color: accentOnDark(accent) }}
      >
        View next session {arrowRight}
      </Link>
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

function ExternalLocationLink({
  href,
  className,
  nestedInLink,
  children,
}: {
  href: string
  className?: string
  nestedInLink?: boolean
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className ?? ''}${nestedInLink ? ' pointer-events-auto' : ''}`}
    >
      {children}
    </a>
  )
}

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
  const linkClass = mapsLinkClass

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
            <ExternalLocationLink
              href={meetingUrl}
              nestedInLink={nestedInLink}
              className={`truncate ${linkClass}`}
            >
              {event.location_label} · Join online {arrowNe}
            </ExternalLocationLink>
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
          <ExternalLocationLink
            href={mapsUrl}
            nestedInLink={nestedInLink}
            className={`truncate ${linkClass}`}
          >
            {event.location_label}
          </ExternalLocationLink>
        ) : (
          <span className="truncate">{event.location_label}</span>
        )}
      </div>
    )
  }

  return (
    <div className={rowClass}>
      <PinIcon className="mt-0.5" />
      <div className="min-w-0">
        {hasMaps ? (
          <ExternalLocationLink
            href={mapsUrl}
            nestedInLink={nestedInLink}
            className={`block truncate ${linkClass}`}
          >
            {event.location_label}
          </ExternalLocationLink>
        ) : (
          <span className="block truncate">{event.location_label}</span>
        )}
        {address ? (
          hasMaps ? (
            <ExternalLocationLink
              href={mapsUrl}
              nestedInLink={nestedInLink}
              className={`mt-0.5 block truncate text-xs text-zinc-500 ${linkClass}`}
            >
              {address}
            </ExternalLocationLink>
          ) : (
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{address}</span>
          )
        ) : null}
      </div>
    </div>
  )
}

/** Prominent but compact row for the next session on the schedule page. */
export function FeaturedSessionRow({
  event,
  accent,
  headcount,
}: {
  event: EventWithLocation
  accent: string
  headcount: ReactNode
}) {
  const cancelled = isEventCancelled(event.status)
  const inProgress = isEventInProgress(event)
  const ended = isEventEnded(event)
  const live = inProgress && event.status === 'on'
  const classes = cancelledEventClasses(cancelled)
  const { month, day, weekday } = sessionDateChip(event)

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-zinc-950/50 transition-colors hover:bg-zinc-900/40"
      style={{ borderColor: hexToRgba(accent, 0.35) }}
    >
      <Link
        href={`/events/${event.short_id}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`View ${eventName(event)} on ${formatEventDayLabel(event)}`}
      />
      <div className="relative z-10 p-4 pointer-events-none">
        <div className="flex items-center justify-between gap-3">
          <EventTimingBadge
            event={event}
            accent={accent}
            cancelled={cancelled}
            upcomingLabel="Next up"
          />
          <StatusPill status={event.status} accent={accent} live={live} ended={ended} compact />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-white/5 bg-black/25 px-1 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              {month}
            </span>
            <span className="text-sm font-semibold tabular-nums leading-tight text-zinc-300">
              {day}
            </span>
            <span className="text-[9px] font-medium text-zinc-600">{weekday}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={`truncate text-lg font-semibold tracking-tight ${classes.titleSm}`}>
              {eventName(event)}
            </h2>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
              <span className="shrink-0 tabular-nums">{formatEventTimeOnly(event)}</span>
              <span className="shrink-0 text-zinc-700">·</span>
              <EventLocationRow
                event={event}
                nestedInLink
                compact
                className="min-w-0 text-zinc-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
          <span className="text-sm text-zinc-400">{headcount}</span>
          <span
            className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
            style={{ color: accentOnDark(accent) }}
          >
            View session {arrowRight}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Compact row used in the "more sessions" list. */
function sessionDateChip(event: Pick<EventWithLocation, 'starts_at' | 'timezone'>) {
  const zone = event.timezone || 'UTC'
  const d = new Date(event.starts_at)
  return {
    month: d.toLocaleString('en-US', { month: 'short', timeZone: zone }),
    day: d.toLocaleString('en-US', { day: 'numeric', timeZone: zone }),
    weekday: d.toLocaleString('en-US', { weekday: 'short', timeZone: zone }),
  }
}

export function SessionRow({
  event,
  accent,
}: {
  event: EventWithLocation
  accent: string
}) {
  const cancelled = isEventCancelled(event.status)
  const inProgress = isEventInProgress(event)
  const ended = isEventEnded(event)
  const live = inProgress && event.status === 'on'
  const classes = cancelledEventClasses(cancelled)
  const { month, day, weekday } = sessionDateChip(event)

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/40">
      <Link
        href={`/events/${event.short_id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`${eventName(event)} on ${formatEventDayLabel(event)}`}
      />
      <div className="relative z-10 flex w-12 shrink-0 flex-col items-center rounded-lg border border-white/5 bg-black/25 px-1 py-1.5 pointer-events-none">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
          {month}
        </span>
        <span className="text-sm font-semibold tabular-nums leading-tight text-zinc-400">
          {day}
        </span>
        <span className="text-[9px] font-medium text-zinc-600">{weekday}</span>
      </div>
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm font-medium ${classes.titleSm}`}>
            {eventName(event)}
          </span>
          <StatusPill
            status={event.status}
            accent={accent}
            live={live}
            ended={ended}
            compact
          />
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-zinc-600">
          <span className="shrink-0 tabular-nums">{formatEventTimeOnly(event)}</span>
          <span className="shrink-0 text-zinc-700">·</span>
          <EventLocationRow
            event={event}
            nestedInLink
            compact
            className="min-w-0 text-zinc-600"
          />
        </div>
      </div>
      <span
        className="relative z-10 shrink-0 text-sm text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-500 pointer-events-none"
        aria-hidden
      >
        {arrowRight}
      </span>
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
