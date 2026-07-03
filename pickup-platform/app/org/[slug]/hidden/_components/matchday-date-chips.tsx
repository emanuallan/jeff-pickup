'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { accentOnDark, hexToRgba } from '@/lib/colors'

type ChipEvent = {
  short_id: string
  starts_at: string
  timezone: string
  status: string
  pastReference?: boolean
}

function dayKey(event: ChipEvent): string {
  return new Date(event.starts_at).toLocaleDateString('en-CA', {
    timeZone: event.timezone || 'UTC',
  })
}

function duplicateDayKeys(events: ChipEvent[]): Set<string> {
  const counts = new Map<string, number>()
  for (const event of events) {
    const key = dayKey(event)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  )
}

function chipParts(event: ChipEvent) {
  const zone = event.timezone || 'UTC'
  const d = new Date(event.starts_at)
  const time = d
    .toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: zone,
    })
    .replace(' AM', 'am')
    .replace(' PM', 'pm')
  return {
    month: d.toLocaleString('en-US', { month: 'short', timeZone: zone }),
    day: d.toLocaleString('en-US', { day: 'numeric', timeZone: zone }),
    weekday: d.toLocaleString('en-US', { weekday: 'short', timeZone: zone }),
    time,
  }
}

type Props = {
  events: ChipEvent[]
  activeEventId: string
  accent: string
}

function animateScrollLeft(
  container: HTMLElement,
  to: number,
  durationMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const from = container.scrollLeft
    const start = performance.now()

    function step(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - (-2 * progress + 2) ** 2 / 2
      container.scrollLeft = from + (to - from) * eased
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(step)
  })
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
    if (!container || events.length <= 1) {
      return
    }

    const firstEventId = events[0]?.short_id
    if (!firstEventId || activeEventId !== firstEventId) {
      return
    }

    const evParam = searchParams.get('ev')
    if (evParam && evParam !== firstEventId) {
      return
    }

    if (container.scrollWidth <= container.clientWidth + 4) {
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let cancelled = false

    const startTimer = setTimeout(async () => {
      if (cancelled) {
        return
      }

      const startLeft = container.scrollLeft
      const maxScroll = container.scrollWidth - container.clientWidth
      const peek = Math.min(44, maxScroll * 0.28)

      await animateScrollLeft(container, startLeft + peek, 620)
      if (cancelled) {
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 120))
      if (cancelled) {
        return
      }

      await animateScrollLeft(container, startLeft, 700)
    }, 700)

    return () => {
      cancelled = true
      clearTimeout(startTimer)
    }
  }, [events, activeEventId, searchParams])

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
  const sharedDays = duplicateDayKeys(events)

  function selectEvent(shortId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tab')
    params.set('ev', shortId)
    params.delete('past')
    params.delete('view')
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
          const cancelled = event.status === 'cancelled'
          const pastRef = event.pastReference === true
          const { month, day, weekday, time } = chipParts(event)
          const showTime = sharedDays.has(dayKey(event))
          const bottomLabel = showTime ? time : weekday
          const strike = cancelled ? 'line-through decoration-zinc-500/80' : ''

          return (
            <button
              key={event.short_id}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => selectEvent(event.short_id)}
              aria-current={active ? 'true' : undefined}
              aria-label={
                pastRef
                  ? `${month} ${day}${showTime ? `, ${time}` : ''}, past session`
                  : cancelled
                    ? `${month} ${day}${showTime ? `, ${time}` : ''}, cancelled session`
                    : `${month} ${day}, ${showTime ? time : weekday}`
              }
              className={`flex shrink-0 flex-col items-center justify-center rounded-lg border py-1.5 transition-all duration-200 ${
                active
                  ? showTime
                    ? 'w-[4.75rem] px-2'
                    : 'w-[4.25rem] px-2'
                  : showTime
                    ? 'w-16 px-1.5'
                    : 'w-14 px-1.5'
              } ${
                active
                  ? 'border-white/15 text-zinc-100'
                  : 'border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
              } ${cancelled || pastRef ? 'opacity-60' : ''}`}
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
                } ${strike}`}
              >
                {month}
              </span>
              <span
                className={`font-semibold tabular-nums leading-tight ${
                  active ? 'text-base' : 'text-sm'
                } ${strike}`}
              >
                {day}
              </span>
              <span
                className={`text-[9px] font-medium tabular-nums ${active ? 'text-inherit opacity-80' : 'text-zinc-600'} ${strike}`}
              >
                {bottomLabel}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
