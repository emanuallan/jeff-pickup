'use client'

import { useEffect, useState } from 'react'
import { accentOnDark } from '@/lib/colors'

type Props = {
  value: number
  accent: string
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Count-up stat with a brief brand-color flash when the target is reached. */
export function AnimatedPlayerCount({ value, accent }: Props) {
  const [display, setDisplay] = useState(0)
  const [flash, setFlash] = useState(false)
  const accentColor = accentOnDark(accent)

  useEffect(() => {
    setDisplay(0)
    setFlash(false)

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    const durationMs = Math.min(3200, Math.max(1800, value * 80))
    const start = performance.now()
    let frame = 0
    let flashTimer: ReturnType<typeof setTimeout> | undefined

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = easeOutCubic(progress)
      setDisplay(progress >= 1 ? value : Math.round(eased * value))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setFlash(true)
        flashTimer = setTimeout(() => setFlash(false), 450)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      if (flashTimer) clearTimeout(flashTimer)
    }
  }, [value])

  return (
    <p
      className="mt-0.5 text-2xl font-bold tabular-nums transition-colors duration-500"
      style={{ color: flash ? accentColor : 'rgb(250 250 250)' }}
    >
      {display}
    </p>
  )
}
