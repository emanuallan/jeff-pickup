'use client'

import type { ReactNode } from 'react'

type Props = {
  label: string
  children: ReactNode
}

/** Compact info icon with a hover/focus tooltip for console hints. */
export function InfoHint({ label, children }: Props) {
  const tooltip = typeof children === 'string' ? children : label

  return (
    <span className="group/hint relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        title={tooltip}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-zinc-300 opacity-0 shadow-lg transition-opacity group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {children}
      </span>
    </span>
  )
}
