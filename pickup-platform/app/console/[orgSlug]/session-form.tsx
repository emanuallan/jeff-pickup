'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import type { SessionFormInitial } from '@/lib/session-form-values'
import { browserTimeZone } from '@/lib/datetime'
import {
  DEFAULT_EVENT_DURATION_MIN,
  MAX_EVENT_DURATION_MIN,
  MIN_EVENT_DURATION_MIN,
} from '@/lib/event-duration'
import {
  addMinutesToLocalDateTime,
  defaultOneOffStartsAtLocal,
  durationMinFromLocalRange,
} from '@/lib/one-off-datetime'
import { consoleInput, consoleLabel, btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'

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

function defaultFormTimes(timezone: string, initial?: SessionFormInitial) {
  const startsAtLocal = initial?.startsAtLocal ?? defaultOneOffStartsAtLocal()
  const endsAtLocal =
    initial?.endsAtLocal ??
    addMinutesToLocalDateTime(startsAtLocal, DEFAULT_EVENT_DURATION_MIN, timezone)
  return { startsAtLocal, endsAtLocal }
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
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    defaultFormTimes(initial?.timezone ?? browserTimeZone(), initial).startsAtLocal,
  )
  const [endsAtLocal, setEndsAtLocal] = useState(() =>
    defaultFormTimes(initial?.timezone ?? browserTimeZone(), initial).endsAtLocal,
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial?.timezone) {
      setTimezone(initial.timezone)
      setStartsAtLocal(initial.startsAtLocal)
      setEndsAtLocal(initial.endsAtLocal)
      return
    }
    const browserTz = browserTimeZone()
    setTimezone(browserTz)
    const defaults = defaultFormTimes(browserTz)
    setStartsAtLocal(defaults.startsAtLocal)
    setEndsAtLocal(defaults.endsAtLocal)
  }, [initial])

  function activeTimezone() {
    return useBrowserTimezone ? browserTimeZone() : timezone
  }

  function handleStartChange(nextStart: string) {
    setStartsAtLocal(nextStart)
    if (endsAtLocal <= nextStart) {
      setEndsAtLocal(
        addMinutesToLocalDateTime(nextStart, DEFAULT_EVENT_DURATION_MIN, activeTimezone()),
      )
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)

    const tz = activeTimezone()
    formData.set('timezone', tz)
    formData.set('starts_at', startsAtLocal)
    formData.set('ends_at', endsAtLocal)

    const durationMin = durationMinFromLocalRange(startsAtLocal, endsAtLocal, tz)
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      setPending(false)
      setError('End time must be after the start time.')
      return
    }
    if (durationMin < MIN_EVENT_DURATION_MIN || durationMin > MAX_EVENT_DURATION_MIN) {
      setPending(false)
      setError(
        `Session length must be between ${MIN_EVENT_DURATION_MIN} and ${MAX_EVENT_DURATION_MIN} minutes.`,
      )
      return
    }

    formData.set('duration_min', String(durationMin))

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={consoleLabel}>Starts</span>
          <input
            name="starts_at"
            type="datetime-local"
            required
            value={startsAtLocal}
            onChange={(event) => handleStartChange(event.target.value)}
            className={`mt-1 ${consoleInput}`}
          />
        </label>
        <label className="block">
          <span className={consoleLabel}>Ends</span>
          <input
            name="ends_at"
            type="datetime-local"
            required
            value={endsAtLocal}
            onChange={(event) => setEndsAtLocal(event.target.value)}
            className={`mt-1 ${consoleInput}`}
          />
        </label>
      </div>

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

      <p className="text-xs text-zinc-500">Timezone: {activeTimezone()}</p>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <ConsoleSubmitButton
        pending={pending}
        pendingLabel={pendingLabel}
        className={`w-full sm:w-auto ${btnSecondary}`}
      >
        {submitLabel}
      </ConsoleSubmitButton>
    </form>
  )
}
