import { formatFriendlyDate, formatLocalTime } from '../../../lib/date'
import { t, type Lang } from '../../../lib/i18n'
import { LOCATIONS } from '../../signups/locations'
import type { LocationId } from '../../signups/types'
import { useActiveLocationQuery, useActiveTimeQuery } from '../queries'
import { useMemo } from 'react'

export function LocationAndTimeCard(props: {
  lang: Lang
  playDate: string
  dateModalOpen: boolean
  dateDraft: string
  onOpenDateModal: () => void
  onCloseDateModal: () => void
  onDateDraftChange: (next: string) => void
  onSaveDate: () => void
  onTapAdminUnlock: () => void
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
    <section className="relative rounded-2xl border border-(--border) bg-(--surface) p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
            onClick={props.onTapAdminUnlock}
          >
            {t(props.lang, 'locationAndTime')}
          </button>
          <button
            type="button"
            className="mt-0.5 block max-w-full rounded-md text-left text-sm font-normal text-(--gold) hover:text-(--gold-2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
            onClick={props.onOpenDateModal}
          >
            {formatFriendlyDate(props.playDate)} · {locationMeta.label} ·{' '}
            {formatLocalTime(activeTime)}
          </button>
          <div className="mt-1 text-xs text-[--muted]">
            {locationMeta.addressLines.join(' · ')}
          </div>
        </div>
        <div className="shrink-0">
          <a
            className="block rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-xs font-medium hover:bg-(--surface-2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
            href={locationMeta.mapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t(props.lang, 'openInMaps')}
          </a>
        </div>
      </div>

      {props.dateModalOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) props.onCloseDateModal()
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-(--border) bg-[#0b0b0e] p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{t(props.lang, 'changeDate')}</div>
                <div className="mt-0.5 text-xs text-[--muted]">{t(props.lang, 'date')}</div>
              </div>
              <button
                type="button"
                className="rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
                onClick={props.onCloseDateModal}
              >
                {t(props.lang, 'close')}
              </button>
            </div>

            <label className="mt-3 block">
              <input
                className="mt-1 w-full rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-sm text-(--text) outline-none focus:ring-2 focus:ring-(--gold)"
                type="date"
                value={props.dateDraft}
                onChange={(e) => props.onDateDraftChange(e.target.value)}
              />
            </label>

            <button
              type="button"
              className="mt-3 w-full rounded-2xl bg-(--gold) px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-(--gold-2)"
              onClick={props.onSaveDate}
            >
              {t(props.lang, 'saveDate')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

