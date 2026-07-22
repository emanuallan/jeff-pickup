'use client'

import { memo, useCallback, useEffect, useRef, useState, useTransition, type Ref } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { accentOnDark } from '@/lib/colors'
import type { MatchdayChipDisplay } from '@/lib/matchday-chip-display'

type Props = {
  chips: MatchdayChipDisplay[]
  activeEventId: string
  accent: string
}

type DateChipButtonProps = {
  chip: MatchdayChipDisplay
  active: boolean
  accentFg: string
  chipWidthClass: string
  buttonRef?: Ref<HTMLButtonElement>
  onSelect: (shortId: string) => void
}

const DateChipButton = memo(function DateChipButton({
  chip,
  active,
  accentFg,
  chipWidthClass,
  buttonRef,
  onSelect,
}: DateChipButtonProps) {
  const strike = chip.cancelled ? 'line-through decoration-zinc-500/80' : ''
  const isPast = chip.pastReference
  const dimmed = chip.cancelled || isPast

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onSelect(chip.shortId)}
      aria-current={active ? 'true' : undefined}
      aria-label={chip.ariaLabel}
      className={`flex shrink-0 touch-manipulation select-none flex-col items-center justify-center rounded-xl border px-2 py-2 transition-[border-color,background-color,box-shadow,color,opacity,transform] duration-200 ${
        isPast && !active ? 'w-[3.6rem] scale-[0.92] py-1.5' : chipWidthClass
      } ${
        active
          ? 'border-zinc-700 bg-zinc-900 shadow-sm ring-1 ring-white/10'
          : isPast
            ? 'border-zinc-800/70 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50'
            : 'border-zinc-800/90 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/65'
      } ${dimmed && !active ? 'opacity-60' : dimmed ? 'opacity-70' : ''} [-webkit-tap-highlight-color:transparent]`}
    >
      <span
        className={`text-[10px] font-medium uppercase tracking-wide ${
          active ? 'text-zinc-500' : isPast ? 'text-zinc-600' : 'text-zinc-600'
        } ${strike}`}
      >
        {chip.month}
      </span>
      <span
        className={`font-semibold tabular-nums leading-tight ${
          active ? 'text-lg' : isPast ? 'text-xs text-zinc-500' : 'text-sm text-zinc-300'
        } ${strike}`}
        style={active ? { color: accentFg } : undefined}
      >
        {chip.day}
      </span>
      <span
        className={`text-[9px] font-medium tabular-nums ${
          active ? 'text-zinc-500' : isPast ? 'text-zinc-600' : 'text-zinc-600'
        } ${strike}`}
      >
        {chip.bottomLabel}
      </span>
    </button>
  )
})

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

const MATCHDAY_SCROLL_HINT_KEY = 'organizr:matchday-scroll-hint-seen'

function hasSeenMatchdayScrollHint() {
  try {
    return localStorage.getItem(MATCHDAY_SCROLL_HINT_KEY) === '1'
  } catch {
    return false
  }
}

function markMatchdayScrollHintSeen() {
  try {
    localStorage.setItem(MATCHDAY_SCROLL_HINT_KEY, '1')
  } catch {
    // ignore quota / private mode
  }
}

export function MatchdayDateChips({ chips, activeEventId, accent }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const fadeFrameRef = useRef<number | null>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)
  const [selectedId, setSelectedId] = useState(activeEventId)
  const [isPending, startTransition] = useTransition()
  const userInteractedRef = useRef(false)

  useEffect(() => {
    setSelectedId(activeEventId)
  }, [activeEventId])

  const displayActiveId = selectedId

  useEffect(() => {
    const container = scrollRef.current
    const active = activeRef.current
    if (!container || !active) {
      return
    }

    const targetLeft =
      active.offsetLeft - container.clientWidth / 2 + active.offsetWidth / 2
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [displayActiveId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || chips.length <= 1 || isPending || userInteractedRef.current) {
      return
    }

    const firstEventId = chips[0]?.shortId
    if (!firstEventId || displayActiveId !== firstEventId) {
      return
    }

    const calParam = searchParams.get('cal') ?? searchParams.get('ev')
    if (calParam && calParam !== firstEventId) {
      return
    }

    if (container.scrollWidth <= container.clientWidth + 4) {
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    if (hasSeenMatchdayScrollHint()) {
      return
    }

    let cancelled = false

    const startTimer = setTimeout(async () => {
      if (cancelled || userInteractedRef.current) {
        return
      }

      markMatchdayScrollHintSeen()

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
  }, [chips, displayActiveId, searchParams, isPending])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const updateFades = () => {
      if (fadeFrameRef.current != null) {
        return
      }
      fadeFrameRef.current = requestAnimationFrame(() => {
        fadeFrameRef.current = null
        const { scrollLeft, clientWidth, scrollWidth } = container
        setFadeLeft(scrollLeft > 4)
        setFadeRight(scrollLeft + clientWidth < scrollWidth - 4)
      })
    }

    updateFades()
    container.addEventListener('scroll', updateFades, { passive: true })
    const observer = new ResizeObserver(updateFades)
    observer.observe(container)

    return () => {
      container.removeEventListener('scroll', updateFades)
      observer.disconnect()
      if (fadeFrameRef.current != null) {
        cancelAnimationFrame(fadeFrameRef.current)
      }
    }
  }, [chips.length])

  const selectEvent = useCallback(
    (shortId: string) => {
      if (shortId === displayActiveId) {
        return
      }

      userInteractedRef.current = true
      setSelectedId(shortId)

      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      params.delete('ev')
      params.set('cal', shortId)
      params.delete('past')
      params.delete('view')
      const query = params.toString()

      startTransition(() => {
        router.replace(query ? `/?${query}` : '/', { scroll: false })
      })
    },
    [displayActiveId, router, searchParams],
  )

  if (chips.length <= 1) {
    return null
  }

  const accentFg = accentOnDark(accent)
  const usesTimedLayout = chips.some((chip) => chip.showTime)
  const chipWidthClass = usesTimedLayout ? 'w-[4.75rem]' : 'w-[4.25rem]'

  return (
    <div className="relative -mx-5 mb-4 sm:-mx-6 md:mx-0 md:mb-6">
      {fadeLeft ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-zinc-950 to-transparent"
        />
      ) : null}
      {fadeRight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-zinc-950 to-transparent"
        />
      ) : null}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-5 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Sessions"
      >
        {chips.map((chip) => {
          const active = chip.shortId === displayActiveId
          return (
            <DateChipButton
              key={chip.shortId}
              chip={chip}
              active={active}
              accentFg={accentFg}
              chipWidthClass={chipWidthClass}
              buttonRef={active ? activeRef : undefined}
              onSelect={selectEvent}
            />
          )
        })}
      </div>
    </div>
  )
}
