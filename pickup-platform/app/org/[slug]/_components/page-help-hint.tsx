'use client'

import { useState } from 'react'

type Props = {
  message: string
}

const hintClass =
  'm-0 block w-full px-1 text-left text-xs leading-4 text-zinc-500'

/**
 * Left-aligned Help control that reveals contextual copy.
 * Button and message share identical typography so toggling does not shift layout.
 */
export function PageHelpHint({ message }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-3">
      {open ? (
        <p className={hintClass}>{message}</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${hintClass} appearance-none cursor-pointer border-0 bg-transparent font-inherit transition-colors hover:text-zinc-300`}
        >
          Help
        </button>
      )}
    </div>
  )
}
