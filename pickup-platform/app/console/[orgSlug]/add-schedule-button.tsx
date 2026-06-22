'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/locations'
import { ScheduleForm } from './schedule-form'
import {
  btnAccent,
  consoleModalBackdrop,
  consoleModalOverlay,
  consoleModalPanel,
} from '../_components/console-ui'

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

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (locations.length === 0) {
    return null
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnAccent}>
        Add schedule
      </button>

      {open ? (
        <div
          className={consoleModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-schedule-title"
        >
          <button
            type="button"
            className={consoleModalBackdrop}
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className={consoleModalPanel}>
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
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
