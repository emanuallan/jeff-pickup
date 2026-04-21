import { LOCATIONS } from '../../signups/locations'
import type { LocationId } from '../../signups/types'
import { t, type Lang } from '../../../lib/i18n'
import { useEffect, useMemo, useState } from 'react'
import { todayLocalISODate } from '../../../lib/date'
import {
  useActiveLocationQuery,
  useActiveTimeQuery,
  useAnnouncementQuery,
  useSetActiveLocationMutation,
  useSetActiveTimeMutation,
  useSetAnnouncementMutation,
} from '../../settings/queries'
import { supabase } from '../../../lib/supabase'

export function AdminModal(props: {
  open: boolean
  lang: Lang
  onClose: () => void
}) {
  if (!props.open) return null

  const supabaseConfigured = Boolean(supabase)
  const adminPinConfigured = Boolean(import.meta.env.VITE_ADMIN_PIN)
  const envAdminPin = String(import.meta.env.VITE_ADMIN_PIN ?? '')

  const [error, setError] = useState<string | null>(null)

  const announcementQuery = useAnnouncementQuery()
  const activeLocationQuery = useActiveLocationQuery()
  const activeTimeQuery = useActiveTimeQuery()

  const setAnnouncementMutation = useSetAnnouncementMutation()
  const setActiveLocationMutation = useSetActiveLocationMutation()
  const setActiveTimeMutation = useSetActiveTimeMutation()

  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'
  const activeTime: string = activeTimeQuery.data ?? '18:00'

  const [announcementText, setAnnouncementText] = useState('')
  const [activeTimeDraft, setActiveTimeDraft] = useState(activeTime)

  // Initialize drafts from server when modal opens / settings load.
  useEffect(() => {
    if (!props.open) return
    if (announcementQuery.data) setAnnouncementText(announcementQuery.data.text)
  }, [props.open, announcementQuery.data])

  useEffect(() => {
    if (!props.open) return
    setActiveTimeDraft(activeTime)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, activeTime])

  const savingAnnouncement = setAnnouncementMutation.isPending
  const savingActiveTime = setActiveTimeMutation.isPending
  const savingLocation = setActiveLocationMutation.isPending

  const requirePinIfConfigured = useMemo(() => {
    if (!adminPinConfigured) return async () => true
    return async () => {
      const pin = window.prompt(t(props.lang, 'adminPinPrompt'))
      if (!pin || pin !== envAdminPin) {
        setError(t(props.lang, 'incorrectPin'))
        return false
      }
      return true
    }
  }, [adminPinConfigured, envAdminPin, props.lang])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[#0b0b0e] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t(props.lang, 'admin')}</div>
            <div className="mt-0.5 text-xs text-[--muted]">{t(props.lang, 'adminSubtitle')}</div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
            onClick={() => {
              setError(null)
              props.onClose()
            }}
          >
            {t(props.lang, 'close')}
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-3">
            <div className="text-xs font-medium text-[--muted]">
              {t(props.lang, 'announcement')}
            </div>
            <textarea
              className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
              rows={3}
              placeholder={t(props.lang, 'announcementPlaceholder')}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />
            <button
              type="button"
              disabled={savingAnnouncement || !supabaseConfigured}
              className="mt-2 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
              onClick={async () => {
                if (!supabaseConfigured) return
                setError(null)
                try {
                  if (!(await requirePinIfConfigured())) return

                  const trimmed = announcementText.trim()
                  await setAnnouncementMutation.mutateAsync({
                    text: trimmed,
                    date: trimmed ? todayLocalISODate() : '',
                  })
                } catch {
                  setError(t(props.lang, 'couldNotUpdateAnnouncement'))
                }
              }}
            >
              {t(props.lang, 'saveAnnouncement')}
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-3">
            <div className="text-xs font-medium text-[--muted]">
              {t(props.lang, 'activeTime')}
            </div>
            <input
              type="time"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
              value={activeTimeDraft}
              onChange={(e) => setActiveTimeDraft(e.target.value)}
            />
            <button
              type="button"
              disabled={savingActiveTime || !supabaseConfigured}
              className="mt-2 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
              onClick={async () => {
                if (!supabaseConfigured) return
                setError(null)
                try {
                  if (!(await requirePinIfConfigured())) return
                  await setActiveTimeMutation.mutateAsync(activeTimeDraft)
                } catch {
                  setError(t(props.lang, 'couldNotUpdateTime'))
                }
              }}
            >
              {t(props.lang, 'saveTime')}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={savingLocation || !supabaseConfigured}
                className="rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 text-left text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  if (!supabaseConfigured) return
                  setError(null)
                  try {
                    if (!(await requirePinIfConfigured())) return
                    await setActiveLocationMutation.mutateAsync(l.id)
                    props.onClose()
                  } catch {
                    setError(t(props.lang, 'couldNotUpdateLocation'))
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{l.label}</span>
                  {l.id === activeLocation ? (
                    <span className="text-xs font-medium text-[var(--gold)]">
                      {t(props.lang, 'active')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-[--muted]">
                  {l.addressLines.join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

