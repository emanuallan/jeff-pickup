'use client'

import { memo, useCallback, useEffect, useRef, useState, useTransition, type Ref } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import type { MatchdayChipDisplay } from '@/lib/matchday-chip-display'

type Props = {
  chips: MatchdayChipDisplay[]
  activeEventId: string
  accent: string
}

type DateChipButtonProps = {
  chip: MatchdayChipDisplay
  active: boolean
  accent: string
  accentFg: string
  buttonRef?: Ref<HTMLButtonElement>
  onSelect: (shortId: string) => void
}

const DateChipButton = memo(function DateChipButton({
  chip,
  active,
  accent,
  accentFg,
  buttonRef,
  onSelect,
}: DateChipButtonProps) {
  const strike = chip.cancelled ? 'line-through decoration-zinc-500/80' : ''
  const dimmed = chip.cancelled || chip.pastReference

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onSelect(chip.shortId)}
      aria-current={active ? 'true' : undefined}
      aria-label={chip.ariaLabel}
      className={`flex shrink-0 touch-manipulation select-none flex-col items-center justify-center rounded-lg border py-1.5 transition-[border-color,color,opacity] duration-150 ${
        active
          ? chip.showTime
            ? 'w-[4.75rem] px-2'
            : 'w-[4.25rem] px-2'
          : chip.showTime
            ? 'w-16 px-1.5'
            : 'w-14 px-1.5'
      } ${
        active
          ? 'border-white/15 text-zinc-100'
          : 'border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
      } ${dimmed ? 'opacity-60' : ''} [-webkit-tap-highlight-color:transparent]`}
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
        {chip.month}
      </span>
      <span
        className={`font-semibold tabular-nums leading-tight ${
          active ? 'text-base' : 'text-sm'
        } ${strike}`}
      >
        {chip.day}
      </span>
      <span
        className={`text-[9px] font-medium tabular-nums ${active ? 'text-inherit opacity-80' : 'text-zinc-600'} ${strike}`}
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

    let cancelled = false

    const startTimer = setTimeout(async () => {
      if (cancelled || userInteractedRef.current) {
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
        {chips.map((chip) => {
          const active = chip.shortId === displayActiveId
          return (
            <DateChipButton
              key={chip.shortId}
              chip={chip}
              active={active}
              accent={accent}
              accentFg={accentFg}
              buttonRef={active ? activeRef : undefined}
              onSelect={selectEvent}
            />
          )
        })}
      </div>
    </div>
  )
}
