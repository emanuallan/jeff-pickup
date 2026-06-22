'use client'

import { useState } from 'react'
import { consoleInput, btnSecondary } from '../_components/console-ui'

type Props = {
  addLocation: (formData: FormData) => Promise<void>
  onSuccess?: () => void
}

export function AddLocationForm({ addLocation, onSuccess }: Props) {
  const [isOnline, setIsOnline] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    await addLocation(formData)
    setPending(false)
    onSuccess?.()
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="flex rounded-lg border border-white/10 p-1 text-xs">
        <button
          type="button"
          onClick={() => setIsOnline(false)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-2 font-medium transition ${
            !isOnline ? 'bg-indigo-500/20 text-indigo-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          In person
        </button>
        <button
          type="button"
          onClick={() => setIsOnline(true)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-2 font-medium transition ${
            isOnline ? 'bg-indigo-500/20 text-indigo-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Online
        </button>
      </div>
      <input type="hidden" name="is_online" value={isOnline ? 'true' : 'false'} />

      <input
        name="label"
        required
        placeholder={isOnline ? 'Name (e.g. Zoom room)' : 'Park name'}
        className={consoleInput}
      />

      {isOnline ? (
        <input
          name="meeting_url"
          type="url"
          placeholder="Meeting link (Zoom, Google Meet, …)"
          className={consoleInput}
        />
      ) : (
        <>
          <input name="address" placeholder="Street address (optional)" className={consoleInput} />
          <input name="maps_url" placeholder="Google Maps link (optional)" className={consoleInput} />
        </>
      )}

      <button type="submit" disabled={pending} className={`w-full sm:w-auto ${btnSecondary}`}>
        {pending ? 'Adding…' : 'Add location'}
      </button>
    </form>
  )
}
