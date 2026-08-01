'use client'

import { useState } from 'react'
import { deleteLocation } from '../actions'
import { chipAction } from '../_components/console-ui'
import { ConfirmSheet } from '../_components/confirm-sheet'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  locationId: string
  locationLabel: string
}

export function DeleteLocationButton({ orgSlug, locationId, locationLabel }: Props) {
  const toast = useConsoleToast()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    setPending(true)
    const result = await deleteLocation(orgSlug, locationId)
    setPending(false)
    if (result && 'error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Location deleted.')
    setOpen(false)
  }

  return (
    <div className="shrink-0 self-end sm:self-auto">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={`${chipAction} text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50`}
      >
        Delete
      </button>
      <ConfirmSheet
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Delete location?"
        description={
          <>
            <span className="font-medium text-zinc-200">{locationLabel}</span> will be removed.
            This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete location"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
