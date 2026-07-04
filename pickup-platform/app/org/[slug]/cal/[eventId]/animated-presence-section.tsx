'use client'

import { useEffect, useState, type ReactNode } from 'react'

const FADE_MS = 200
const COLLAPSE_MS = 240

type Props = {
  show: boolean
  closing?: boolean
  /** Fade is subtler; collapse animates height for leave flows. */
  mode?: 'fade' | 'collapse'
  className?: string
  innerClassName?: string
  children: ReactNode
}

/** Mount/unmount a block with a short fade or collapse transition. */
export function AnimatedPresenceSection({
  show,
  closing = false,
  mode = 'fade',
  className = '',
  innerClassName = '',
  children,
}: Props) {
  const durationMs = mode === 'fade' ? FADE_MS : COLLAPSE_MS
  const [mounted, setMounted] = useState(show)
  const [open, setOpen] = useState(show && !closing)

  useEffect(() => {
    if (show && !closing) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setOpen(true))
      return () => cancelAnimationFrame(frame)
    }

    setOpen(false)
    const timer = window.setTimeout(() => setMounted(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [show, closing, durationMs])

  if (!mounted) {
    return null
  }

  const modeClass = mode === 'fade' ? 'participation-fade' : 'participation-section'

  return (
    <div
      className={`${modeClass} ${open ? `${modeClass}-open` : ''} ${className}`.trim()}
    >
      {mode === 'fade' ? (
        children
      ) : (
        <div className={`participation-section-inner ${innerClassName}`.trim()}>{children}</div>
      )}
    </div>
  )
}
