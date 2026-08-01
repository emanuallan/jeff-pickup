'use client'

import { useState, type ReactNode } from 'react'

/** Collapsible disclosure styled for the console. */
export function Disclosure({
  summary,
  children,
  className = '',
  defaultOpen = false,
}: {
  summary: string
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      className={`group rounded-lg border border-white/10 bg-zinc-950/40 ${className}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-medium text-zinc-300 transition-colors hover:text-zinc-100 sm:px-4">
        {summary}
        <span className="text-zinc-500 transition-transform group-open:rotate-180" aria-hidden>
          ⌄
        </span>
      </summary>
      <div className="border-t border-white/5 px-3 py-4 sm:px-4">{children}</div>
    </details>
  )
}
