import { LOCATIONS } from '../../signups/locations'
import type { LocationId } from '../../signups/types'

export function AdminModal(props: {
  open: boolean
  title: string
  subtitle: string
  close: string
  announcementLabel: string
  announcementPlaceholder: string
  saveAnnouncement: string
  activeTimeLabel: string
  saveTime: string
  activeLabel: string
  adminPinPrompt: string
  incorrectPin: string
  couldNotUpdateAnnouncement: string
  couldNotUpdateTime: string
  couldNotUpdateLocation: string
  supabaseConfigured: boolean
  adminPinConfigured: boolean
  envAdminPin?: string

  error: string | null
  setError: (e: string | null) => void

  announcementText: string
  onAnnouncementTextChange: (text: string) => void
  onSaveAnnouncement: () => Promise<void>
  savingAnnouncement: boolean

  activeTimeDraft: string
  onActiveTimeDraftChange: (time: string) => void
  onSaveActiveTime: () => Promise<void>
  savingActiveTime: boolean

  activeLocation: LocationId
  onPickLocation: (id: LocationId) => Promise<void>
  savingLocation: boolean

  onClose: () => void
}) {
  if (!props.open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[#0b0b0e] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{props.title}</div>
            <div className="mt-0.5 text-xs text-[--muted]">{props.subtitle}</div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
            onClick={() => {
              props.setError(null)
              props.onClose()
            }}
          >
            {props.close}
          </button>
        </div>

        {props.error ? (
          <div className="mt-3 rounded-xl border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {props.error}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-3">
            <div className="text-xs font-medium text-[--muted]">
              {props.announcementLabel}
            </div>
            <textarea
              className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
              rows={3}
              placeholder={props.announcementPlaceholder}
              value={props.announcementText}
              onChange={(e) => props.onAnnouncementTextChange(e.target.value)}
            />
            <button
              type="button"
              disabled={props.savingAnnouncement || !props.supabaseConfigured}
              className="mt-2 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
              onClick={async () => {
                if (!props.supabaseConfigured) return
                props.setError(null)
                try {
                  if (props.adminPinConfigured) {
                    const pin = window.prompt(props.adminPinPrompt)
                    if (!pin || pin !== String(props.envAdminPin)) {
                      props.setError(props.incorrectPin)
                      return
                    }
                  }
                  await props.onSaveAnnouncement()
                } catch {
                  props.setError(props.couldNotUpdateAnnouncement)
                }
              }}
            >
              {props.saveAnnouncement}
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-3">
            <div className="text-xs font-medium text-[--muted]">
              {props.activeTimeLabel}
            </div>
            <input
              type="time"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
              value={props.activeTimeDraft}
              onChange={(e) => props.onActiveTimeDraftChange(e.target.value)}
            />
            <button
              type="button"
              disabled={props.savingActiveTime || !props.supabaseConfigured}
              className="mt-2 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
              onClick={async () => {
                if (!props.supabaseConfigured) return
                props.setError(null)
                try {
                  if (props.adminPinConfigured) {
                    const pin = window.prompt(props.adminPinPrompt)
                    if (!pin || pin !== String(props.envAdminPin)) {
                      props.setError(props.incorrectPin)
                      return
                    }
                  }
                  await props.onSaveActiveTime()
                } catch {
                  props.setError(props.couldNotUpdateTime)
                }
              }}
            >
              {props.saveTime}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={props.savingLocation || !props.supabaseConfigured}
                className="rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 text-left text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  if (!props.supabaseConfigured) return
                  props.setError(null)
                  try {
                    if (props.adminPinConfigured) {
                      const pin = window.prompt(props.adminPinPrompt)
                      if (!pin || pin !== String(props.envAdminPin)) {
                        props.setError(props.incorrectPin)
                        return
                      }
                    }
                    await props.onPickLocation(l.id)
                    props.onClose()
                  } catch {
                    props.setError(props.couldNotUpdateLocation)
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{l.label}</span>
                  {l.id === props.activeLocation ? (
                    <span className="text-xs font-medium text-[var(--gold)]">
                      {props.activeLabel}
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

