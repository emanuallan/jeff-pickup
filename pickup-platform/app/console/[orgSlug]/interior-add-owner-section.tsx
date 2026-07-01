'use client'

import { useState, useTransition } from 'react'
import { interiorAddOrgOwner } from '../actions'
import { consoleInput, consoleLabel, btnPrimary } from '../_components/console-ui'

type Props = {
  orgSlug: string
}

export function InteriorAddOwnerSection({ orgSlug }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Email is required.')
      return
    }

    startTransition(async () => {
      const result = await interiorAddOrgOwner(orgSlug, trimmed)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(`${result.email ?? trimmed} is now an owner. You remain an owner.`)
      setEmail('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Grant co-ownership to someone who already has an organizer account (magic-link sign-up).
        This does not remove your owner access.
      </p>

      <label className="block">
        <span className={consoleLabel}>Organizer email</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
            setSuccess(null)
          }}
          autoComplete="email"
          placeholder="them@example.com"
          disabled={pending}
          className={`mt-1.5 ${consoleInput}`}
        />
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      <button type="submit" disabled={pending || !email.trim()} className={btnPrimary}>
        {pending ? 'Adding owner…' : 'Add co-owner'}
      </button>
    </form>
  )
}
