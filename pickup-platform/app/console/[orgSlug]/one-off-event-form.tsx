'use client'

import type { Location } from '@/lib/locations'
import { SessionForm } from './session-form'

type Props = {
  locations: Location[]
  createOneOff: (formData: FormData) => Promise<void>
  onSuccess?: () => void
}

export function OneOffEventForm({ locations, createOneOff, onSuccess }: Props) {
  return (
    <SessionForm
      locations={locations}
      onSubmit={createOneOff}
      onSuccess={onSuccess}
      useBrowserTimezone
    />
  )
}
