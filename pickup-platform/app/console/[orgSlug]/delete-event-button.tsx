'use client'

import { useState } from 'react'
import { deleteEvent } from '../actions'
import { chipAction } from '../_components/console-ui'
import { ConfirmSheet } from '../_components/confirm-sheet'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  eventId: string
  eventLabel: string
  recurring?: boolean
}

export function DeleteEventButton({ orgSlug, eventId, eventLabel, recurring }: Props) {
  const toast = useConsoleToast()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    setPending(true)
    const result = await deleteEvent(orgSlug, eventId)
    setPending(false)
    if (result && 'error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Session deleted.')
    setOpen(false)
  }

  return (
    <>
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
        title="Delete session?"
        description={
          recurring ? (
            <>
              <span className="font-medium text-zinc-200">{eventLabel}</span> will be removed from
              your schedule permanently — it won&apos;t come back automatically.
            </>
          ) : (
            <>
              <span className="font-medium text-zinc-200">{eventLabel}</span> and its roster will be
              permanently removed. This can&apos;t be undone.
            </>
          )
        }
        confirmLabel="Delete session"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  )
}
