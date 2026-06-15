'use client'

import { useState, useTransition } from 'react'
import { deleteEvent } from '../actions'

type Props = {
  orgSlug: string
  eventId: string
  eventLabel: string
  recurring?: boolean
}

export function DeleteEventButton({ orgSlug, eventId, eventLabel, recurring }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    const warning = recurring
      ? `Delete "${eventLabel}"? This removes the session from your schedule permanently — it won't come back automatically.`
      : `Delete "${eventLabel}"? This permanently removes the session and its roster. This can't be undone.`
    if (!window.confirm(warning)) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteEvent(orgSlug, eventId)
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-xs text-zinc-500 hover:text-red-300 disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </>
  )
}
