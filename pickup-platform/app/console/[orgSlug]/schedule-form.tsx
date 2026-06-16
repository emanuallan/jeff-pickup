'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { btnSecondary } from '../_components/console-ui'
import { ScheduleFormFields } from './schedule-form-fields'

type Props = {
  orgSlug: string
  locations: Location[]
  createSchedule: (
    orgSlug: string,
    formData: FormData,
  ) => Promise<{ error?: string; ok?: boolean }>
}

export function ScheduleForm({ orgSlug, locations, createSchedule }: Props) {
  const [timezone, setTimezone] = useState('UTC')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setError(null)
    formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    const result = await createSchedule(orgSlug, formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <ScheduleFormFields locations={locations} timezone={timezone} />

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" className={btnSecondary}>
        Add schedule
      </button>
    </form>
  )
}
