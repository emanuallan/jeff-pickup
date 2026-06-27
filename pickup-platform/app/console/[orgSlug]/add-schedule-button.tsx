'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Location } from '@/lib/locations'
import { ScheduleForm } from './schedule-form'
import { btnAccent } from '../_components/console-ui'
import { BottomSheet } from '@/app/_components/bottom-sheet'

export function AddScheduleButton({
  orgSlug,
  locations,
  createSchedule,
}: {
  orgSlug: string
  locations: Location[]
  createSchedule: (
    orgSlug: string,
    formData: FormData,
  ) => Promise<{ error?: string; ok?: boolean }>
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (locations.length === 0) {
    return null
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnAccent}>
        Add schedule
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabelledby="add-schedule-title"
      >
        <h2 id="add-schedule-title" className="text-lg font-semibold text-zinc-50">
          Add recurring schedule
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Pick the days and time — upcoming sessions are created automatically.
        </p>
        <div className="mt-5">
          <ScheduleForm
            orgSlug={orgSlug}
            locations={locations}
            createSchedule={createSchedule}
            onSuccess={() => {
              setOpen(false)
              router.refresh()
            }}
          />
        </div>
      </BottomSheet>
    </>
  )
}
