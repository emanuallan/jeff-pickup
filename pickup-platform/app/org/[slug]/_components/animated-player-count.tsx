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

/** Count-up stat with brand accent color on completion. */
export function AnimatedPlayerCount({ value, accent }: Props) {
  const [display, setDisplay] = useState(0)
  const [done, setDone] = useState(false)
  const accentColor = accentOnDark(accent)

  useEffect(() => {
    setDisplay(0)
    setDone(false)

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      setDone(true)
      return
    }

    const durationMs = Math.min(1400, Math.max(650, value * 28))
    const start = performance.now()
    let frame = 0

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = easeOutCubic(progress)
      setDisplay(progress >= 1 ? value : Math.round(eased * value))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setDone(true)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <p
      className={`mt-0.5 text-2xl font-bold tabular-nums transition-colors duration-500 ${
        done ? '' : 'text-zinc-50'
      }`}
      style={done ? { color: accentColor } : undefined}
    >
      {display}
    </p>
  )
}
