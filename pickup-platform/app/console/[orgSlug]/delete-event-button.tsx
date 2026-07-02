'use client'

import { useTransition } from 'react'
import { deleteEvent } from '../actions'
import { chipAction } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  eventId: string
  eventLabel: string
  recurring?: boolean
}

export function DeleteEventButton({ orgSlug, eventId, eventLabel, recurring }: Props) {
  const toast = useConsoleToast()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    const warning = recurring
      ? `Delete "${eventLabel}"? This removes the session from your schedule permanently — it won't come back automatically.`
      : `Delete "${eventLabel}"? This permanently removes the session and its roster. This can't be undone.`
    if (!window.confirm(warning)) {
      return
    }
    startTransition(async () => {
      const result = await deleteEvent(orgSlug, eventId)
      if (result && 'error' in result) {
        toast.error(result.error)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className={`${chipAction} text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50`}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
