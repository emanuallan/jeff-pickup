'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Location } from '@/lib/locations'
import { SessionForm } from './session-form'
import { btnAccent } from '../_components/console-ui'
import { BottomSheet } from '@/app/_components/bottom-sheet'

export function AddOneOffButton({
  locations,
  createOneOff,
  className = btnAccent,
}: {
  locations: Location[]
  createOneOff: (formData: FormData) => Promise<{ ok: true } | { error: string }>
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Add one-off session
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabelledby="one-off-title">
        <h2 id="one-off-title" className="text-lg font-semibold text-zinc-50">
          Add one-off session
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          A single session outside your recurring schedule.
        </p>
        <div className="mt-5">
          <SessionForm
            locations={locations}
            onSubmit={createOneOff}
            onSuccess={() => {
              setOpen(false)
              router.refresh()
            }}
            useBrowserTimezone
          />
        </div>
      </BottomSheet>
    </>
  )
}
