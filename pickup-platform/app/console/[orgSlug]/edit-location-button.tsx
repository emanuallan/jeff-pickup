'use client'

import { useState } from 'react'
import type { Location } from '@/lib/locations'
import { LocationForm } from './location-form'
import { chipAction } from '../_components/console-ui'
import { BottomSheet } from '@/app/_components/bottom-sheet'

type Props = {
  orgSlug: string
  location: Location
  updateLocation: (
    orgSlug: string,
    locationId: string,
    formData: FormData,
  ) => Promise<{ ok: true } | { error: string }>
}

export function EditLocationButton({ orgSlug, location, updateLocation }: Props) {
  const [open, setOpen] = useState(false)
  const boundUpdate = updateLocation.bind(null, orgSlug, location.id)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${chipAction} text-zinc-400 hover:bg-white/5 hover:text-zinc-200`}
      >
        Edit
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabelledby="edit-location-title"
        panelClassName="max-w-md"
      >
        <h2 id="edit-location-title" className="text-lg font-semibold text-zinc-50">
          Edit location
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Updates apply to this location everywhere it&apos;s used.
        </p>
        <div className="mt-5">
          <LocationForm
            key={location.id}
            location={location}
            saveLocation={boundUpdate}
            onSuccess={() => setOpen(false)}
            submitLabel="Save changes"
            pendingLabel="Saving…"
          />
        </div>
      </BottomSheet>
    </>
  )
}
