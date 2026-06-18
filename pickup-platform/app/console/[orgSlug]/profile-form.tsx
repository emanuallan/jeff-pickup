'use client'

import { useState } from 'react'
import { updateOrgProfile } from '../actions'
import { consoleInput, btnSecondary } from '../_components/console-ui'

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
    <form action={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs text-zinc-500">Group name</span>
        <input
          name="name"
          required
          defaultValue={name}
          placeholder="Jeff Soccer"
          className={`mt-1 ${consoleInput}`}
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Description</span>
        <input
          name="activity"
          defaultValue={activity}
          placeholder="Pickup soccer, run club, board games…"
          className={`mt-1 ${consoleInput}`}
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button type="submit" className={`w-full sm:w-auto ${btnSecondary}`}>
          Save
        </button>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </form>
  )
}
