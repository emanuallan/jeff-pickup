'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { browserTimeZone } from '@/lib/datetime'
import { btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { useConsoleToast } from '../_components/console-toast'
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
  const toast = useConsoleToast()
  const [timezone, setTimezone] = useState('UTC')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setTimezone(browserTimeZone())
  }, [])

  async function handleSubmit(formData: FormData) {
    setPending(true)
    formData.set('timezone', browserTimeZone())
    const result = await createSchedule(orgSlug, formData)
    setPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Schedule added.')
    onSuccess?.()
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <ScheduleFormFields locations={locations} timezone={timezone} />

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
