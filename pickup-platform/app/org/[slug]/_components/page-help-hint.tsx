'use client'

import { useState } from 'react'

type Props = {
  message: string
  /** When false, the control sizes to its label (for use in a horizontal toolbar row). */
  fullWidth?: boolean
  className?: string
}

const hintBaseClass = 'm-0 block px-1 text-left text-xs leading-4 text-zinc-500'

/**
 * Left-aligned Help control that reveals contextual copy.
 * Button and message share identical typography so toggling does not shift layout.
 */
export function PageHelpHint({ message, fullWidth = true, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const hintClass = fullWidth ? `${hintBaseClass} w-full` : hintBaseClass

  return (
    <div className={className}>
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
