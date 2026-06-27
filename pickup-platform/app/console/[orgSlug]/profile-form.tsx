'use client'

import { useState } from 'react'
import { updateOrgProfile } from '../actions'
import { consoleInput, btnSecondary, ConsoleSubmitButton } from '../_components/console-ui'

type Props = {
  orgSlug: string
  name: string
  description: string
}

export function ProfileForm({ orgSlug, name, description }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    setError(null)
    setPending(true)
    const result = await updateOrgProfile(orgSlug, formData)
    setPending(false)
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
          name="description"
          defaultValue={description}
          placeholder="Weekly pickup soccer, Saturday morning run club…"
          className={`mt-1 ${consoleInput}`}
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <ConsoleSubmitButton pending={pending} className={`w-full sm:w-auto ${btnSecondary}`}>
          Save
        </ConsoleSubmitButton>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </form>
  )
}
