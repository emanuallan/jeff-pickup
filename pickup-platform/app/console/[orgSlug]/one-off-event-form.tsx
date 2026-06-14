'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'

type Props = {
  locations: Location[]
  createOneOff: (formData: FormData) => Promise<void>
}

export function OneOffEventForm({ locations, createOneOff }: Props) {
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    await createOneOff(formData)
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs font-medium text-zinc-400">Add one-off session</p>
      <input type="hidden" name="timezone" value={timezone} />
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
      <input
        name="starts_at"
        type="datetime-local"
        required
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
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
      <button
        type="submit"
        className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add session
      </button>
    </form>
  )
}
