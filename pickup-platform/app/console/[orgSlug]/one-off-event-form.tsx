'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { defaultOneOffStartsAtLocal } from '@/lib/one-off-datetime'
import { consoleInput, btnSecondary } from '../_components/console-ui'

type Props = {
  locations: Location[]
  createOneOff: (formData: FormData) => Promise<void>
  onSuccess?: () => void
}

export function OneOffEventForm({ locations, createOneOff, onSuccess }: Props) {
  const [timezone, setTimezone] = useState('UTC')
  const [startsAt] = useState(defaultOneOffStartsAtLocal)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setPending(true)
    formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    await createOneOff(formData)
    setPending(false)
    onSuccess?.()
  }

  if (locations.length === 0) {
    return <p className="text-sm text-zinc-500">Add a location first.</p>
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="timezone" value={timezone} />
      <label className="block">
        <span className="text-xs text-zinc-500">Location</span>
        <select name="location_id" required className={`mt-1 ${consoleInput}`} defaultValue={locations[0]?.id}>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-zinc-500">Date &amp; time</span>
        <input
          name="starts_at"
          type="datetime-local"
          required
          defaultValue={startsAt}
          className={`mt-1 ${consoleInput}`}
        />
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
      <button type="submit" disabled={pending} className={`${btnSecondary} disabled:opacity-50`}>
        {pending ? 'Adding…' : 'Add session'}
      </button>
    </form>
  )
}
