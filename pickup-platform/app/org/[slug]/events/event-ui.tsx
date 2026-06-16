import { statusLabel, type EventStatus, type EventWithLocation } from '@/lib/events'

/** Event display name: schedule title if present, otherwise a sensible fallback. */
export function eventName(event: Pick<EventWithLocation, 'title'>, fallback: string): string {
  return event.title?.trim() || fallback
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

export function PinIcon({ className = 'h-4 w-4 shrink-0 text-zinc-500' }: { className?: string }) {
  return (
    <svg
      className={className}
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
  className = 'h-4 w-4 shrink-0 text-zinc-500',
}: {
  className?: string
}) {
  return (
    <svg
      className={className}
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
