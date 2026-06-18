'use client'

import { useState, useTransition } from 'react'
import { deleteLocation } from '../actions'
import { chipAction } from '../_components/console-ui'

type Props = {
  orgSlug: string
  locationId: string
  locationLabel: string
}

export function DeleteLocationButton({ orgSlug, locationId, locationLabel }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm(`Delete "${locationLabel}"? This can't be undone.`)) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteLocation(orgSlug, locationId)
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="shrink-0 self-end sm:self-auto">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`${chipAction} text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50`}
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error ? <p className="mt-1 max-w-48 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
