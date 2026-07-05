'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { PARTICIPATION_SECTION_MS } from './participation-motion-tokens'

type Props = {
  show: boolean
  closing?: boolean
  className?: string
  innerClassName?: string
  children: ReactNode
}

/** Collapse / reveal a block with a short height + opacity transition. */
export function AnimatedPresenceSection({
  show,
  closing = false,
  className = '',
  innerClassName = '',
  children,
}: Props) {
  const [mounted, setMounted] = useState(show)
  const [open, setOpen] = useState(show && !closing)

  useEffect(() => {
    if (show && !closing) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setOpen(true))
      return () => cancelAnimationFrame(frame)
    }

    setOpen(false)
    const timer = window.setTimeout(() => setMounted(false), PARTICIPATION_SECTION_MS)
    return () => window.clearTimeout(timer)
  }, [show, closing])

  if (!mounted) {
    return null
  }

  return (
    <div
      className={[
        'participation-section',
        open ? 'participation-section-open' : '',
        closing && !open ? 'participation-section-closing' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={`participation-section-inner ${innerClassName}`.trim()}>{children}</div>
    </div>
  )
}
