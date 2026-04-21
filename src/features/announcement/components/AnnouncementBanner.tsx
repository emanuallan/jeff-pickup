import { todayLocalISODate } from '../../../lib/date'
import { useAnnouncementQuery } from '../../settings/queries'

export function AnnouncementBanner() {
  const announcementQuery = useAnnouncementQuery()
  const text = announcementQuery.data?.text ?? ''
  const date = announcementQuery.data?.date ?? ''

  if (!text) return null
  if (date && date !== todayLocalISODate()) return null

  return (
    <section className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[var(--gold)]/20 p-2 text-[var(--gold-2)]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2v11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 18h.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M10.29 3.86 2.82 17.14A2 2 0 0 0 4.56 20h14.88a2 2 0 0 0 1.74-2.86L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--gold-2)]">
            {text}
          </div>
        </div>
      </div>
    </section>
  )
}

