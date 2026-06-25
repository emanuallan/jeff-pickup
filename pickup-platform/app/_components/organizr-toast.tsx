'use client'

import { useEffect, useState } from 'react'

type Props = {
  message: string
  variant?: 'error' | 'success'
  onClose: () => void
  durationMs?: number
}

export function OrganizrToast({
  message,
  variant = 'error',
  onClose,
  durationMs = 6000,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      window.setTimeout(onClose, 300)
    }, durationMs)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [durationMs, message, onClose])

  function dismiss() {
    setVisible(false)
    window.setTimeout(onClose, 300)
  }

  const isError = variant === 'error'

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border bg-zinc-950/90 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-300 ${
        isError ? 'border-red-500/25' : 'border-emerald-500/30'
      } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isError ? 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30' : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
          }`}
        >
          {isError ? '!' : '✓'}
        </span>
        <p className={`min-w-0 flex-1 text-sm leading-relaxed ${isError ? 'text-red-100' : 'text-emerald-100'}`}>
          {message}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
        >
          <span aria-hidden className="text-sm leading-none">
            ×
          </span>
        </button>
      </div>
    </div>
  )
}
