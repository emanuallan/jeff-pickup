'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Location } from '@/lib/locations'
import { OneOffEventForm } from './one-off-event-form'
import {
  btnAccent,
  consoleModalBackdrop,
  consoleModalOverlay,
  consoleModalPanel,
} from '../_components/console-ui'

export function AddOneOffButton({
  locations,
  createOneOff,
  className = btnAccent,
}: {
  locations: Location[]
  createOneOff: (formData: FormData) => Promise<void>
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Add one-off session
      </button>

      {open ? (
        <div
          className={consoleModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="one-off-title"
        >
          <button
            type="button"
            className={consoleModalBackdrop}
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className={consoleModalPanel}>
            <h2 id="one-off-title" className="text-lg font-semibold text-zinc-50">
              Add one-off session
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              A single session outside your recurring schedule.
            </p>
            <div className="mt-5">
              <OneOffEventForm
                locations={locations}
                createOneOff={createOneOff}
                onSuccess={() => {
                  setOpen(false)
                  router.refresh()
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
