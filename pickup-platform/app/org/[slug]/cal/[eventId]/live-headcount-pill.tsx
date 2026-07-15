'use client'

import { useEffect, useRef, useState } from 'react'
import { hexToRgba } from '@/lib/colors'
import { showHeadcountChipOnCard } from '@/lib/headcount-display'
import { subscribeLiveSessionPoll } from '@/lib/live-session-poll'

type Props = {
  orgSlug: string
  eventRef: string
  initialHeadcount: number
  capacity: number | null
  accent: string
  /** Stop polling when the session ended or was cancelled. */
  active: boolean
  /** Past session — show "came" instead of "coming". */
  ended?: boolean
  /** Cancelled sessions hide the headcount chip entirely. */
  cancelled?: boolean
}

export function LiveHeadcountPill({
  orgSlug,
  eventRef,
  initialHeadcount,
  capacity,
  accent,
  active,
  ended = false,
  cancelled = false,
}: Props) {
  const [headcount, setHeadcount] = useState(initialHeadcount)
  const [pulse, setPulse] = useState(false)
  const prevHeadcount = useRef(initialHeadcount)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHeadcount(initialHeadcount)
    prevHeadcount.current = initialHeadcount
  }, [initialHeadcount])

  useEffect(() => {
    if (!active) return

    return subscribeLiveSessionPoll(orgSlug, eventRef, (payload) => {
      const next = payload.headcount
      const prev = prevHeadcount.current
      if (next === prev) return

      if (next > prev) {
        setPulse(true)
        if (pulseTimer.current) clearTimeout(pulseTimer.current)
        pulseTimer.current = setTimeout(() => setPulse(false), 650)
      }

      prevHeadcount.current = next
      setHeadcount(next)
    })
  }, [active, orgSlug, eventRef])

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
    }
  }, [])

  if (!showHeadcountChipOnCard(headcount, { cancelled })) {
    return null
  }

  return (
    <span
      className={`rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-300 transition-shadow duration-300 ${
        pulse ? 'headcount-pulse' : ''
      }`}
      style={
        pulse
          ? {
              boxShadow: `0 0 0 2px ${hexToRgba(accent, 0.45)}, 0 0 14px ${hexToRgba(accent, 0.25)}`,
            }
          : undefined
      }
    >
      <span key={headcount} className="font-semibold text-zinc-100 tabular-nums">
        {headcount}
      </span>
      {capacity != null ? ` / ${capacity}` : ''} {ended ? 'came' : 'coming'}
    </span>
  )
}
