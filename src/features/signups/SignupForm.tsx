import { useMemo, useState } from 'react'
import { todayLocalISODate } from '../../lib/date'
export type SignupFormValue = {
  playDate: string
  playerName: string
  guestCount: string
}

export function SignupForm(props: {
  labels: {
    joinTheList: string
    yourName: string
    namePlaceholder: string
    enterName: string
    keepUnder40: string
    bringingGuests: string
    bringingGuestsPlaceholder: string
    invalidGuests: string
    joinTodaysList: string
    joinList: string
    youAreIn: string
  }
  value: SignupFormValue
  onChange: (next: SignupFormValue) => void
  onSubmit: () => void
  disabled?: boolean
  error?: string
  joined?: boolean
}) {
  const [touched, setTouched] = useState(false)

  const nameError = useMemo(() => {
    const name = props.value.playerName.trim()
    if (!touched) return null
    if (!name) return props.labels.enterName
    if (name.length > 40) return props.labels.keepUnder40
    return null
  }, [props.labels, props.value.playerName, touched])

  const guestsError = useMemo(() => {
    if (!touched) return null
    const raw = props.value.guestCount.trim()
    if (!raw) return null
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 0 || n > 20) return props.labels.invalidGuests
    return null
  }, [props.labels.invalidGuests, props.value.guestCount, touched])

  const canSubmit = !props.disabled && !nameError && !guestsError

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">{props.labels.joinTheList}</div>
      <div className="mt-3 space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-[--muted]">
            {props.labels.yourName}
          </div>
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
            placeholder={props.labels.namePlaceholder}
            autoComplete="name"
            value={props.value.playerName}
            onBlur={() => setTouched(true)}
            onChange={(e) =>
              props.onChange({ ...props.value, playerName: e.target.value })
            }
          />
          {nameError ? (
            <div className="mt-1 text-xs text-red-200">{nameError}</div>
          ) : null}
        </label>

        <label className="block">
          <div className="text-xs font-medium text-[--muted]">{props.labels.bringingGuests}</div>
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
            inputMode="numeric"
            placeholder={props.labels.bringingGuestsPlaceholder}
            value={props.value.guestCount}
            onBlur={() => setTouched(true)}
            onChange={(e) =>
              props.onChange({ ...props.value, guestCount: e.target.value })
            }
          />
          {guestsError ? (
            <div className="mt-1 text-xs text-red-200">{guestsError}</div>
          ) : null}
        </label>

        {props.error ? (
          <div className="rounded-xl border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {props.error}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-1 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
          disabled={!canSubmit || props.joined}
          onClick={() => {
            setTouched(true)
            if (!canSubmit) return
            props.onSubmit()
          }}
        >
          {props.joined
            ? props.labels.youAreIn
            : props.value.playDate === todayLocalISODate()
              ? props.labels.joinTodaysList
              : props.labels.joinList}
        </button>
      </div>
    </section>
  )
}

