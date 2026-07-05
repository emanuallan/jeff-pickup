'use client'

import { useState } from 'react'
import { AddLocationForm } from './add-location-form'
import { btnAccent } from '../_components/console-ui'
import { BottomSheet } from '@/app/_components/bottom-sheet'

export function AddLocationButton({
  addLocation,
}: {
  addLocation: (formData: FormData) => Promise<{ ok: true } | { error: string }>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnAccent}>
        Add location
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabelledby="add-location-title"
        panelClassName="max-w-md"
      >
        <h2 id="add-location-title" className="text-lg font-semibold text-zinc-50">
          Add location
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Where your sessions happen — in person or online.
        </p>
        <div className="mt-5">
          <AddLocationForm addLocation={addLocation} onSuccess={() => setOpen(false)} />
        </div>
      </BottomSheet>
    </>
  )
}
