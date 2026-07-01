'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { interiorAddOrgOwner } from '../actions'
import { browserTimeZone } from '@/lib/datetime'
import { formatTimezoneLabel, orgTimezoneOptions } from '@/lib/timezones'
import { consoleInput, consoleLabel, btnPrimary } from '../_components/console-ui'

type Props = {
  orgSlug: string
}

export function InteriorAddOwnerSection({ orgSlug }: Props) {
  const defaultTimezone = useMemo(() => browserTimeZone(), [])
  const timezoneOptions = useMemo(() => orgTimezoneOptions(), [])

  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState(defaultTimezone)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setTimezone(defaultTimezone)
  }, [defaultTimezone])

  const timezoneChanged = timezone !== defaultTimezone

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
      const result = await interiorAddOrgOwner(
        orgSlug,
        trimmed,
        timezoneChanged ? timezone : null,
      )
      if (result.error) {
        setError(result.error)
        return
      }

      const parts = [`${result.email ?? trimmed} is now an owner. You remain an owner.`]
      if (result.timezoneApplied) {
        parts.push(`Group timezone set to ${formatTimezoneLabel(result.timezoneApplied)}.`)
      }
      setSuccess(parts.join(' '))
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

      <label className="block">
        <span className={consoleLabel}>Group timezone (optional)</span>
        <select
          name="timezone"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value)
            setError(null)
            setSuccess(null)
          }}
          disabled={pending}
          className={`mt-1.5 ${consoleInput}`}
        >
          {timezoneOptions.map((zone) => (
            <option key={zone} value={zone}>
              {formatTimezoneLabel(zone)}
              {zone === defaultTimezone ? ' (yours)' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-zinc-500">
          Defaults to your timezone. Change this to theirs before handoff — schedules and sessions
          keep the same local times (e.g. 6:00 PM) but shift to the selected zone.
          {timezoneChanged ? (
            <span className="mt-1 block text-amber-200/90">
              Will update all recurring schedules and sessions when you add the co-owner.
            </span>
          ) : null}
        </p>
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      <button type="submit" disabled={pending || !email.trim()} className={btnPrimary}>
        {pending ? 'Adding owner…' : 'Add co-owner'}
      </button>
    </form>
  )
}
