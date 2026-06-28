'use client'

import { useState } from 'react'

type Props = {
  count: number
  children: React.ReactNode
}

export function MoreSessions({ count, children }: Props) {
  const [open, setOpen] = useState(false)

  if (count <= 0) {
    return null
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-zinc-950/30 px-4 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/30 hover:text-zinc-400"
        >
          View {count} upcoming {count === 1 ? 'session' : 'sessions'}
          <span aria-hidden className="text-zinc-600">
            ↓
          </span>
        </button>
      ) : (
        <div>
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-transparent px-4 py-2 text-xs text-zinc-600 transition-colors hover:border-zinc-700/60 hover:text-zinc-500"
          >
            Show less
            <span aria-hidden>↑</span>
          </button>
        </div>
      )}
    </div>
  )
}
