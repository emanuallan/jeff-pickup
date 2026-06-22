'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import type { SessionFormInitial } from '@/lib/session-form-values'
import { browserTimeZone } from '@/lib/datetime'
import { defaultOneOffStartsAtLocal } from '@/lib/one-off-datetime'
import { consoleInput, consoleLabel, btnSecondary } from '../_components/console-ui'

const DEFAULT_DURATION_MIN = 90
const MAX_DURATION_MIN = 480

export type { SessionFormInitial } from '@/lib/session-form-values'

type Props = {
  locations: Location[]
  onSubmit: (formData: FormData) => Promise<{ error?: string } | void | { ok?: true }>
  onSuccess?: () => void
  initial?: SessionFormInitial
  submitLabel?: string
  pendingLabel?: string
  /** When true (create flow), submit uses the browser timezone. Edit keeps the event timezone. */
  useBrowserTimezone?: boolean
}

export function SessionForm({
  locations,
  onSubmit,
  onSuccess,
  initial,
  submitLabel = 'Add session',
  pendingLabel = 'Adding…',
  useBrowserTimezone = true,
}: Props) {
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial?.timezone) {
      setTimezone(initial.timezone)
      return
    }
    setTimezone(browserTimeZone())
  }, [initial?.timezone])

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    formData.set('timezone', useBrowserTimezone ? browserTimeZone() : timezone)
    const result = await onSubmit(formData)
    setPending(false)
    if (result && 'error' in result && result.error) {
      setError(result.error)
      return
    }
    onSuccess?.()
  }

  if (locations.length === 0) {
    return <p className="text-sm text-zinc-500">Add a location first.</p>
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="timezone" value={timezone} />

      <label className="block">
        <span className={consoleLabel}>Session name</span>
        <input
          name="title"
          required
          placeholder="e.g. Saturday pickup"
          defaultValue={initial?.title}
          className={`mt-1 ${consoleInput}`}
        />
      </label>

      <label className="block">
        <span className={consoleLabel}>Location</span>
        <select
          name="location_id"
          required
          className={`mt-1 ${consoleInput}`}
          defaultValue={initial?.locationId ?? locations[0]?.id}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={consoleLabel}>Date &amp; time</span>
        <input
          name="starts_at"
          type="datetime-local"
          required
          defaultValue={initial?.startsAtLocal ?? defaultOneOffStartsAtLocal()}
          className={`mt-1 ${consoleInput}`}
        />
      </label>

      <label className="block">
        <span className={consoleLabel}>Duration (min)</span>
        <input
          name="duration_min"
          type="number"
          min={15}
          max={MAX_DURATION_MIN}
          defaultValue={initial?.durationMin ?? DEFAULT_DURATION_MIN}
          required
          className={`mt-1 ${consoleInput}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={consoleLabel}>Capacity (optional)</span>
          <input
            name="capacity"
            type="number"
            min={2}
            max={999}
            placeholder="No limit"
            defaultValue={initial?.capacity ?? undefined}
            className={`mt-1 ${consoleInput}`}
          />
        </label>
        <label className="block">
          <span className={consoleLabel}>Min participants (optional)</span>
          <input
            name="min_players"
            type="number"
            min={2}
            max={999}
            placeholder="No minimum"
            defaultValue={initial?.minPlayers ?? undefined}
            className={`mt-1 ${consoleInput}`}
          />
        </label>
      </div>

      <p className="text-xs text-zinc-500">Timezone: {timezone}</p>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={pending} className={`w-full sm:w-auto ${btnSecondary} disabled:opacity-50`}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  )
}
