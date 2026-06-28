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
  inline = false,
}: {
  href: string
  accent: string
  className?: string
  /** When true, omit the right-align wrapper (for use in a shared toolbar row). */
  inline?: boolean
}) {
  const link = (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
      style={{ color: accentOnDark(accent) }}
    >
      View next session {arrowRight}
    </Link>
  )

  if (inline) {
    return <div className={className}>{link}</div>
  }

  return (
    <div className={`flex justify-end ${className}`}>
      {link}
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
          {meetingUrl && !compact ? (
            <ExternalLocationLink
              href={meetingUrl}
              nestedInLink={nestedInLink}
              className={`truncate ${linkClass}`}
            >
              {event.location_label} · Join online {arrowNe}
            </ExternalLocationLink>
          ) : (
            <span className="truncate">
              {event.location_label}
              {meetingUrl ? ` · Join online ${arrowNe}` : ' · Online'}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={rowClass}>
        <span className="truncate">{event.location_label}</span>
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

function SessionDateChip({
  event,
  size = 'compact',
}: {
  event: Pick<EventWithLocation, 'starts_at' | 'timezone'>
  size?: 'compact' | 'featured'
}) {
  const { month, day, weekday } = sessionDateChip(event)
  const featured = size === 'featured'

  return (
    <div
      className={
        featured
          ? 'flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl border border-white/10 bg-black/30 px-2 py-2.5 sm:w-20 sm:py-3'
          : 'flex w-12 shrink-0 flex-col items-center rounded-lg border border-white/5 bg-black/25 px-1 py-1.5'
      }
    >
      <span
        className={
          featured
            ? 'text-[11px] font-medium uppercase tracking-wide text-zinc-500'
            : 'text-[10px] font-medium uppercase tracking-wide text-zinc-600'
        }
      >
        {month}
      </span>
      <span
        className={
          featured
            ? 'text-[1.65rem] font-semibold tabular-nums leading-tight text-zinc-200 sm:text-[1.75rem]'
            : 'text-sm font-semibold tabular-nums leading-tight text-zinc-400'
        }
      >
        {day}
      </span>
      <span
        className={
          featured
            ? 'text-[10px] font-medium text-zinc-500'
            : 'text-[9px] font-medium text-zinc-600'
        }
      >
        {weekday}
      </span>
    </div>
  )
}

/** Calendar hero — enlarged session row with accent stripe; distinct from the detail-page card. */
export function FeaturedSessionRow({
  event,
  accent,
  footer,
}: {
  event: EventWithLocation
  accent: string
  footer?: ReactNode
}) {
  const cancelled = isEventCancelled(event.status)
  const inProgress = isEventInProgress(event)
  const ended = isEventEnded(event)
  const live = inProgress && event.status === 'on'
  const classes = cancelledEventClasses(cancelled)
  const accentFg = accentOnDark(accent)
  const address = event.location_address.trim()

  return (
    <div
      className="group relative flex items-stretch gap-3 overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50 p-3.5 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/45 sm:gap-4 sm:p-4"
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: accentFg,
        backgroundImage: `linear-gradient(105deg, ${hexToRgba(accent, 0.1)} 0%, transparent 52%)`,
      }}
    >
      <Link
        href={`/cal/${event.short_id}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${eventName(event)} on ${formatEventDayLabel(event)}`}
      />
      <div className="relative z-10 pointer-events-none">
        <SessionDateChip event={event} size="featured" />
      </div>
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <EventTimingBadge event={event} accent={accent} cancelled={cancelled} />

        <div className="mt-2 flex items-start justify-between gap-3">
          <h2 className={`min-w-0 text-base font-semibold leading-snug sm:text-lg ${classes.titleSm}`}>
            {eventName(event)}
          </h2>
          <StatusPill status={event.status} accent={accent} live={live} ended={ended} />
        </div>

        <div
          className={`mt-1 flex min-w-0 flex-wrap items-center gap-x-2 text-sm ${classes.datetimeRow}`}
        >
          <span className="shrink-0 tabular-nums font-medium text-zinc-300">
            {formatEventTimeOnly(event)}
          </span>
          <span className="shrink-0 text-zinc-700">·</span>
          <EventLocationRow
            event={event}
            compact
            nestedInLink
            className="min-w-0 text-zinc-500"
          />
        </div>

        {!event.location_is_online && address ? (
          <p className="mt-1 truncate text-xs text-zinc-600">{address}</p>
        ) : null}

        {event.announcement ? (
          <p className="mt-3 rounded-lg border border-white/5 bg-black/25 px-3 py-2 text-sm leading-snug text-zinc-400">
            {event.announcement}
          </p>
        ) : null}

        {footer ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <div className="text-sm text-zinc-500">{footer}</div>
            <span
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-all group-hover:translate-x-0.5"
              style={{ color: accentFg }}
            >
              View session {arrowRight}
            </span>
          </div>
        ) : null}
      </div>
      <span
        className="relative z-10 hidden shrink-0 self-center text-base text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-500 sm:flex pointer-events-none"
        aria-hidden
      >
        {arrowRight}
      </span>
    </div>
  )
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

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/40">
      <Link
        href={`/cal/${event.short_id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`${eventName(event)} on ${formatEventDayLabel(event)}`}
      />
      <div className="relative z-10 pointer-events-none">
        <SessionDateChip event={event} size="compact" />
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
