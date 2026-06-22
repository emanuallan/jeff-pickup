'use client'

import { useEffect, useState } from 'react'
import { AddLocationForm } from './add-location-form'
import {
  btnOutline,
  consoleModalBackdrop,
  consoleModalOverlay,
  consoleModalPanel,
} from '../_components/console-ui'

export function AddLocationButton({
  addLocation,
}: {
  addLocation: (formData: FormData) => Promise<void>
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

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnOutline}>
        Add location
      </button>

      {open ? (
        <div
          className={consoleModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-location-title"
        >
          <button
            type="button"
            className={consoleModalBackdrop}
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className={`${consoleModalPanel} max-w-md`}>
            <h2 id="add-location-title" className="text-lg font-semibold text-zinc-50">
              Add location
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Where your sessions happen — in person or online.
            </p>
            <div className="mt-5">
              <AddLocationForm addLocation={addLocation} onSuccess={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
