'use client'

import { useState } from 'react'
import { updateOrgProfile } from '../actions'

type Props = {
  orgSlug: string
  name: string
  activity: string
}

export function ProfileForm({ orgSlug, name, activity }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    setError(null)
    const result = await updateOrgProfile(orgSlug, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setMessage('Saved.')
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mt-3 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
    >
      <label className="block">
        <span className="text-xs text-zinc-500">Group name</span>
        <input
          name="name"
          required
          defaultValue={name}
          placeholder="Jeff Soccer"
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Description</span>
        <input
          name="activity"
          defaultValue={activity}
          placeholder="Pickup soccer, run club, board games…"
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Save
        </button>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </form>
  )
}
