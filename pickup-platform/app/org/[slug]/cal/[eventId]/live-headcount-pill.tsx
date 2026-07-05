'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hexToRgba } from '@/lib/colors'
import { showHeadcountChipOnCard } from '@/lib/headcount-display'

const POLL_MS = 20_000
const REFRESH_COOLDOWN_MS = 30_000

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
  const router = useRouter()
  const [headcount, setHeadcount] = useState(initialHeadcount)
  const [pulse, setPulse] = useState(false)
  const prevHeadcount = useRef(initialHeadcount)
  const lastRefreshAt = useRef(0)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHeadcount(initialHeadcount)
    prevHeadcount.current = initialHeadcount
  }, [initialHeadcount])

  useEffect(() => {
    if (!active) return

    let cancelled = false

    async function poll() {
      if (document.visibilityState !== 'visible') return

      try {
        const res = await fetch(`/api/org/${orgSlug}/cal/${eventRef}/headcount`)
        if (!res.ok || cancelled) return

        const data = (await res.json()) as { headcount?: number }
        const next = data.headcount
        if (typeof next !== 'number' || cancelled) return

        const prev = prevHeadcount.current
        if (next !== prev) {
          if (next > prev) {
            setPulse(true)
            if (pulseTimer.current) clearTimeout(pulseTimer.current)
            pulseTimer.current = setTimeout(() => setPulse(false), 650)
          }

          prevHeadcount.current = next
          setHeadcount(next)

          const now = Date.now()
          if (now - lastRefreshAt.current >= REFRESH_COOLDOWN_MS) {
            lastRefreshAt.current = now
            router.refresh()
          }
        }
      } catch {
        // Best-effort polling — ignore transient network errors.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void poll()
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), POLL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
    }
  }, [active, orgSlug, eventRef, router])

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
