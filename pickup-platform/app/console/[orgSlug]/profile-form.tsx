'use client'

import { useState } from 'react'
import { updateOrgProfile } from '../actions'
import { consoleInput, btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  name: string
  description: string
}

export function ProfileForm({ orgSlug, name, description }: Props) {
  const toast = useConsoleToast()
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    const result = await updateOrgProfile(orgSlug, formData)
    setPending(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Saved.')
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

      <ConsoleSubmitButton pending={pending} className={`w-full sm:w-auto ${btnSecondary}`}>
        Save
      </ConsoleSubmitButton>
    </form>
  )
}
