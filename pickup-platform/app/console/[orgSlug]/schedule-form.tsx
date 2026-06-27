'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { btnSecondary, ConsoleSubmitButton } from '../_components/console-ui'
import { ScheduleFormFields } from './schedule-form-fields'

type Props = {
  orgSlug: string
  locations: Location[]
  createSchedule: (
    orgSlug: string,
    formData: FormData,
  ) => Promise<{ error?: string; ok?: boolean }>
  onSuccess?: () => void
}

export function ScheduleForm({ orgSlug, locations, createSchedule, onSuccess }: Props) {
  const [timezone, setTimezone] = useState('UTC')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setError(null)
    setPending(true)
    formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    const result = await createSchedule(orgSlug, formData)
    setPending(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onSuccess?.()
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <ScheduleFormFields locations={locations} timezone={timezone} />

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <ConsoleSubmitButton
        pending={pending}
        pendingLabel="Adding…"
        className={`w-full sm:w-auto ${btnSecondary}`}
      >
        Add schedule
      </ConsoleSubmitButton>
    </form>
  )
}
