'use client'

import { useMemo, useState, useTransition } from 'react'
import { interiorSetOrgTimezone } from '../actions'
import { browserTimeZone } from '@/lib/datetime'
import { formatTimezoneLabel, orgTimezoneOptions } from '@/lib/timezones'
import { consoleInput, consoleLabel, btnSecondary } from '../_components/console-ui'

type Props = {
  orgSlug: string
  currentOrgTimezone: string | null
}

export function InteriorSetTimezoneSection({ orgSlug, currentOrgTimezone }: Props) {
  const timezoneOptions = useMemo(() => orgTimezoneOptions(), [])
  const [timezone, setTimezone] = useState(currentOrgTimezone ?? browserTimeZone())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const unchanged = currentOrgTimezone != null && timezone === currentOrgTimezone

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await interiorSetOrgTimezone(orgSlug, timezone)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(
        `Group timezone set to ${formatTimezoneLabel(result.timezone ?? timezone)}. Schedules and sessions were updated.`,
      )
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Shift every recurring schedule and session to another IANA timezone. Local times stay the
        same (e.g. 6:00 PM remains 6:00 PM) in the new zone. Future recurring sessions are
        regenerated — do this before signups when possible.
      </p>

      {currentOrgTimezone ? (
        <p className="text-xs text-zinc-500">
          Current group timezone: {formatTimezoneLabel(currentOrgTimezone)}
        </p>
      ) : null}

      <label className="block">
        <span className={consoleLabel}>New group timezone</span>
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
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      <button
        type="submit"
        disabled={pending || unchanged}
        className={btnSecondary}
      >
        {pending ? 'Saving…' : 'Set group timezone'}
      </button>
    </form>
  )
}
