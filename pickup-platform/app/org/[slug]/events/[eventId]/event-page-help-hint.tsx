'use client'

import { useState } from 'react'

type Props = {
  message: string
}

/** Left-aligned Help control that reveals session context above the event card. */
export function EventPageHelpHint({ message }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-3 px-1">
      {open ? (
        <p className="text-xs text-zinc-500">{message}</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Help
        </button>
      )}
    </div>
  )
}
