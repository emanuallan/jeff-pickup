'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { consoleInput, btnSecondary } from '../_components/console-ui'

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

type Props = {
  orgSlug: string
  locations: Location[]
  createSchedule: (
    orgSlug: string,
    formData: FormData,
  ) => Promise<{ error?: string; ok?: boolean }>
}

export function ScheduleForm({ orgSlug, locations, createSchedule }: Props) {
  const [timezone, setTimezone] = useState('UTC')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setError(null)
    formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    const result = await createSchedule(orgSlug, formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="timezone" value={timezone} />

      <input name="title" defaultValue="Weekly session" className={consoleInput} />

      <select name="location_id" required className={consoleInput} defaultValue={locations[0]?.id}>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.label}
          </option>
        ))}
      </select>

      <fieldset>
        <legend className="mb-2 text-xs text-zinc-500">Days</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <label
              key={d.value}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs transition has-checked:border-indigo-500 has-checked:bg-indigo-500/10"
            >
              <input
                type="checkbox"
                name="byweekday"
                value={d.value}
                className="accent-indigo-500"
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">Start time</span>
          <input
            name="start_time"
            type="time"
            defaultValue="18:00"
            required
            className={`mt-1 ${consoleInput}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Duration (min)</span>
          <input
            name="duration_min"
            type="number"
            min={15}
            max={480}
            defaultValue={90}
            className={`mt-1 ${consoleInput}`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-zinc-500">Frequency</span>
        <select name="interval_weeks" defaultValue="1" className={`mt-1 ${consoleInput}`}>
          <option value="1">Every week</option>
          <option value="2">Every 2 weeks</option>
          <option value="3">Every 3 weeks</option>
          <option value="4">Every 4 weeks</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">Capacity (optional)</span>
          <input
            name="capacity"
            type="number"
            min={2}
            max={999}
            placeholder="No limit"
            className={`mt-1 ${consoleInput}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Min participants (optional)</span>
          <input
            name="min_players"
            type="number"
            min={2}
            max={999}
            placeholder="No minimum"
            className={`mt-1 ${consoleInput}`}
          />
        </label>
      </div>

      <p className="text-xs text-zinc-500">Timezone: {timezone}</p>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" className={btnSecondary}>
        Add schedule
      </button>
    </form>
  )
}
