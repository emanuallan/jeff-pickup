import { formatFriendlyDate, formatLocalTime } from '../../../lib/date'
import { t, type Lang } from '../../../lib/i18n'
import { LOCATIONS } from '../../signups/locations'
import type { LocationId } from '../../signups/types'
import { useActiveLocationQuery, useActiveTimeQuery } from '../queries'
import { useMemo } from 'react'

export function LocationAndTimeCard(props: {
  lang: Lang
  playDate: string
  onTapTitle: () => void
}) {
  const activeLocationQuery = useActiveLocationQuery()
  const activeTimeQuery = useActiveTimeQuery()

  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'
  const activeTime: string = activeTimeQuery.data ?? '18:00'

  const locationMeta = useMemo(
    () => LOCATIONS.find((l) => l.id === activeLocation) ?? LOCATIONS[0],
    [activeLocation],
  )

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-md"
            onClick={props.onTapTitle}
          >
            {t(props.lang, 'locationAndTime')}
          </button>
          <div className="mt-0.5 text-sm text-[--muted]">
            {formatFriendlyDate(props.playDate)} · {locationMeta.label} ·{' '}
            {formatLocalTime(activeTime)}
          </div>
          <div className="mt-1 text-xs text-[--muted]">
            {locationMeta.addressLines.join(' · ')}
          </div>
        </div>
        <div className="shrink-0">
          <a
            className="block rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            href={locationMeta.mapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t(props.lang, 'openInMaps')}
          </a>
        </div>
      </div>
    </section>
  )
}

