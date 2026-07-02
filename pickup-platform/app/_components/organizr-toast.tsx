'use client'

import { useEffect, useState } from 'react'

export type OrganizrToastVariant = 'error' | 'success' | 'warning'

type Props = {
  message: string
  variant?: OrganizrToastVariant
  onClose: () => void
  durationMs?: number
}

const VARIANT_STYLES: Record<
  OrganizrToastVariant,
  { border: string; icon: string; text: string; glyph: string }
> = {
  error: {
    border: 'border-red-500/25',
    icon: 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30',
    text: 'text-red-100',
    glyph: '!',
  },
  success: {
    border: 'border-emerald-500/30',
    icon: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
    text: 'text-emerald-100',
    glyph: '✓',
  },
  warning: {
    border: 'border-amber-500/30',
    icon: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
    text: 'text-amber-100',
    glyph: '!',
  },
}

export function OrganizrToast({
  message,
  variant = 'error',
  onClose,
  durationMs = 6000,
}: Props) {
  const [visible, setVisible] = useState(false)
  const styles = VARIANT_STYLES[variant]

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

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border bg-zinc-950/90 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-300 ${styles.border} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles.icon}`}
        >
          {styles.glyph}
        </span>
        <p className={`min-w-0 flex-1 text-sm leading-relaxed ${styles.text}`}>{message}</p>
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
