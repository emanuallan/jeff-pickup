'use client'

import { useState, useTransition } from 'react'
import { interiorAddOrgOwner } from '../actions'
import { consoleInput, consoleLabel, btnPrimary } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
}

export function InteriorAddOwnerSection({ orgSlug }: Props) {
  const toast = useConsoleToast()
  const [email, setEmail] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Email is required.')
      return
    }

    startTransition(async () => {
      const result = await interiorAddOrgOwner(orgSlug, trimmed)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.email ?? trimmed} is now an owner. You remain an owner.`)
      setEmail('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Grant co-ownership to someone who already has an organizer account.
        This does not remove your owner access.
      </p>

      <label className="block">
        <span className={consoleLabel}>Organizer email</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="them@example.com"
          disabled={pending}
          className={`mt-1.5 ${consoleInput}`}
        />
      </label>

      <button type="submit" disabled={pending || !email.trim()} className={btnPrimary}>
        {pending ? 'Adding owner…' : 'Add co-owner'}
      </button>
    </form>
  )
}
