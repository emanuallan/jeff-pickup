'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'

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
    const result = await createSchedule(orgSlug, formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
    >
      <p className="text-xs font-medium text-zinc-400">Add recurring schedule</p>
      <input type="hidden" name="timezone" value={timezone} />

      <input
        name="title"
        defaultValue="Weekly session"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        name="location_id"
        required
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        defaultValue={locations[0]?.id}
      >
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
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs has-checked:border-blue-500 has-checked:bg-blue-500/10"
            >
              <input
                type="checkbox"
                name="byweekday"
                value={d.value}
                className="accent-blue-500"
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
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">Capacity (optional)</span>
          <input
            name="capacity"
            type="number"
            min={2}
            max={999}
            placeholder="No limit"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Min players</span>
          <input
            name="min_players"
            type="number"
            min={2}
            max={999}
            defaultValue={10}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      <p className="text-xs text-zinc-500">Timezone: {timezone}</p>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add schedule
      </button>
    </form>
  )
}
