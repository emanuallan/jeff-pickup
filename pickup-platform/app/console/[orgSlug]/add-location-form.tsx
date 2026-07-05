'use client'

import { LocationForm } from './location-form'

type Props = {
  addLocation: (formData: FormData) => Promise<{ ok: true } | { error: string }>
  onSuccess?: () => void
}

export function AddLocationForm({ addLocation, onSuccess }: Props) {
  return (
    <LocationForm
      saveLocation={(formData) => addLocation(formData)}
      onSuccess={onSuccess}
    />
  )
}
