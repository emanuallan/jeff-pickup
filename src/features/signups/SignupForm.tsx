import { useMemo, useState } from 'react'
import { todayLocalISODate } from '../../lib/date'
export type SignupFormValue = {
  playDate: string
  playerName: string
}

export function SignupForm(props: {
  value: SignupFormValue
  onChange: (next: SignupFormValue) => void
  onSubmit: () => void
  disabled?: boolean
  error?: string
}) {
  const [touched, setTouched] = useState(false)

  const nameError = useMemo(() => {
    const name = props.value.playerName.trim()
    if (!touched) return null
    if (!name) return 'Please enter your name.'
    if (name.length > 40) return 'Please keep it under 40 characters.'
    return null
  }, [props.value.playerName, touched])

  const canSubmit = !props.disabled && !nameError

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">Join the list</div>
      <div className="mt-3 space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-[--muted]">Date</div>
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
            type="date"
            value={props.value.playDate}
            onChange={(e) =>
              props.onChange({ ...props.value, playDate: e.target.value })
            }
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-[--muted]">Your name</div>
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--gold)]"
            placeholder="e.g. Alex"
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

        {props.error ? (
          <div className="rounded-xl border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {props.error}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-1 w-full rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
          disabled={!canSubmit}
          onClick={() => {
            setTouched(true)
            if (!canSubmit) return
            props.onSubmit()
          }}
        >
          {props.value.playDate === todayLocalISODate()
            ? 'Join today’s list'
            : 'Join the list'}
        </button>
      </div>
    </section>
  )
}

