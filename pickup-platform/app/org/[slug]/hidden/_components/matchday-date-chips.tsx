'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { EventWithLocation } from '@/lib/events'
import { accentOnDark, hexToRgba } from '@/lib/colors'

type ChipEvent = Pick<EventWithLocation, 'short_id' | 'starts_at' | 'timezone'>

function chipParts(event: ChipEvent) {
  const zone = event.timezone || 'UTC'
  const d = new Date(event.starts_at)
  return {
    month: d.toLocaleString('en-US', { month: 'short', timeZone: zone }),
    day: d.toLocaleString('en-US', { day: 'numeric', timeZone: zone }),
    weekday: d.toLocaleString('en-US', { weekday: 'short', timeZone: zone }),
  }
}

type Props = {
  events: ChipEvent[]
  activeEventId: string
  accent: string
}

export function MatchdayDateChips({ events, activeEventId, accent }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  useEffect(() => {
    const container = scrollRef.current
    const active = activeRef.current
    if (!container || !active) {
      return
    }

    const targetLeft =
      active.offsetLeft - container.clientWidth / 2 + active.offsetWidth / 2
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [activeEventId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const updateFades = () => {
      const { scrollLeft, clientWidth, scrollWidth } = container
      setFadeLeft(scrollLeft > 4)
      setFadeRight(scrollLeft + clientWidth < scrollWidth - 4)
    }

    updateFades()
    container.addEventListener('scroll', updateFades, { passive: true })
    const observer = new ResizeObserver(updateFades)
    observer.observe(container)

    return () => {
      container.removeEventListener('scroll', updateFades)
      observer.disconnect()
    }
  }, [events])

  if (events.length <= 1) {
    return null
  }

  const accentFg = accentOnDark(accent)

  function selectEvent(shortId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tab')
    params.set('ev', shortId)
    const query = params.toString()
    router.replace(query ? `/hidden?${query}` : '/hidden', { scroll: false })
  }

  return (
    <div className="relative -mx-5 mb-4 sm:-mx-6">
      {fadeLeft ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black to-transparent"
        />
      ) : null}
      {fadeRight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black to-transparent"
        />
      ) : null}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-5 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Upcoming matchdays"
      >
        {events.map((event) => {
          const active = event.short_id === activeEventId
          const { month, day, weekday } = chipParts(event)

          return (
            <button
              key={event.short_id}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => selectEvent(event.short_id)}
              aria-current={active ? 'true' : undefined}
              className={`flex shrink-0 flex-col items-center justify-center rounded-lg border py-1.5 transition-all duration-200 ${
                active ? 'w-[4.25rem] px-2' : 'w-14 px-1.5'
              } ${
                active
                  ? 'border-white/15 text-zinc-100'
                  : 'border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
              }`}
              style={{
                backgroundImage: active
                  ? `linear-gradient(180deg, ${hexToRgba(accent, 0.22)} 0%, ${hexToRgba(accent, 0.08)} 100%)`
                  : `linear-gradient(180deg, ${hexToRgba(accent, 0.08)} 0%, ${hexToRgba(accent, 0.02)} 100%)`,
                borderColor: active ? hexToRgba(accent, 0.35) : hexToRgba(accent, 0.1),
                color: active ? accentFg : undefined,
              }}
            >
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  active ? 'text-inherit' : 'text-zinc-600'
                }`}
              >
                {month}
              </span>
              <span
                className={`font-semibold tabular-nums leading-tight ${
                  active ? 'text-base' : 'text-sm'
                }`}
              >
                {day}
              </span>
              <span
                className={`text-[9px] font-medium ${active ? 'text-inherit opacity-80' : 'text-zinc-600'}`}
              >
                {weekday}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
