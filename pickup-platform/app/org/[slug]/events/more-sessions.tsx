'use client'

import { useState } from 'react'

type Props = {
  count: number
  accent: string
  children: React.ReactNode
}

export function MoreSessions({ count, accent, children }: Props) {
  const [open, setOpen] = useState(false)

  if (count <= 0) {
    return null
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          View {count} more {count === 1 ? 'session' : 'sessions'}
          <span aria-hidden style={{ color: accent }}>
            ↓
          </span>
        </button>
      ) : (
        <div>
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
          >
            Show less
            <span aria-hidden>↑</span>
          </button>
        </div>
      )}
    </div>
  )
}
