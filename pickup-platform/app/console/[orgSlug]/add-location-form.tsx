'use client'

import { LocationForm } from './location-form'

type Props = {
  addLocation: (formData: FormData) => Promise<void>
  onSuccess?: () => void
}

export function AddLocationForm({ addLocation, onSuccess }: Props) {
  return (
    <LocationForm
      saveLocation={async (formData) => {
        await addLocation(formData)
      }}
      onSuccess={onSuccess}
    />
  )
}
