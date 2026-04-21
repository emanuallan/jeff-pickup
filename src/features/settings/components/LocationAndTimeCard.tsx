import { formatFriendlyDate, formatLocalTime } from '../../../lib/date'
import type { LocationOption } from '../../signups/locations'

export function LocationAndTimeCard(props: {
  title: string
  openInMaps: string
  playDate: string
  location: LocationOption
  activeTime: string
  onTapTitle: () => void
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-md"
            onClick={props.onTapTitle}
          >
            {props.title}
          </button>
          <div className="mt-0.5 text-sm text-[--muted]">
            {formatFriendlyDate(props.playDate)} · {props.location.label} ·{' '}
            {formatLocalTime(props.activeTime)}
          </div>
          <div className="mt-1 text-xs text-[--muted]">
            {props.location.addressLines.join(' · ')}
          </div>
        </div>
        <div className="shrink-0">
          <a
            className="block rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            href={props.location.mapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {props.openInMaps}
          </a>
        </div>
      </div>
    </section>
  )
}

