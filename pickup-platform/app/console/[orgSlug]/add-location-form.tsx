'use client'

import { useState } from 'react'

type Props = {
  addLocation: (formData: FormData) => Promise<void>
}

const inputClass =
  'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500'

export function AddLocationForm({ addLocation }: Props) {
  const [isOnline, setIsOnline] = useState(false)

  return (
    <form action={addLocation} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs font-medium text-zinc-400">Add location</p>

      <div className="flex rounded-xl border border-zinc-700 p-1 text-xs">
        <button
          type="button"
          onClick={() => setIsOnline(false)}
          className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${
            !isOnline ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          In person
        </button>
        <button
          type="button"
          onClick={() => setIsOnline(true)}
          className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${
            isOnline ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
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
        className={inputClass}
      />

      {isOnline ? (
        <input
          name="meeting_url"
          type="url"
          placeholder="Meeting link (Zoom, Google Meet, …)"
          className={inputClass}
        />
      ) : (
        <>
          <input name="address" placeholder="Street address (optional)" className={inputClass} />
          <input name="maps_url" placeholder="Google Maps link (optional)" className={inputClass} />
        </>
      )}

      <button
        type="submit"
        className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add location
      </button>
    </form>
  )
}
