'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { consoleInput, btnSecondary } from '../_components/console-ui'

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
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="timezone" value={timezone} />
      <select name="location_id" required className={consoleInput} defaultValue={locations[0]?.id}>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.label}
          </option>
        ))}
      </select>
      <input name="starts_at" type="datetime-local" required className={consoleInput} />
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
          <span className="text-xs text-zinc-500">Min players</span>
          <input
            name="min_players"
            type="number"
            min={2}
            max={999}
            defaultValue={10}
            className={`mt-1 ${consoleInput}`}
          />
        </label>
      </div>
      <p className="text-xs text-zinc-500">Timezone: {timezone}</p>
      <button type="submit" className={btnSecondary}>
        Add session
      </button>
    </form>
  )
}
