'use client'

import { memo, useCallback, useEffect, useRef, useState, useTransition, type Ref } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { accentOnDark } from '@/lib/colors'
import {
  LEADERBOARD_PERIOD_ALL,
  type LeaderboardMonthChip,
  type LeaderboardPeriodId,
} from '@/lib/leaderboard-period'

type Props = {
  chips: LeaderboardMonthChip[]
  activePeriodId: LeaderboardPeriodId
  accent: string
}

type MonthChipButtonProps = {
  chip: LeaderboardMonthChip
  active: boolean
  accentFg: string
  buttonRef?: Ref<HTMLButtonElement>
  onSelect: (id: LeaderboardPeriodId) => void
}

const MonthChipButton = memo(function MonthChipButton({
  chip,
  active,
  accentFg,
  buttonRef,
  onSelect,
}: MonthChipButtonProps) {
  const isAllTime = chip.id === LEADERBOARD_PERIOD_ALL

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onSelect(chip.id)}
      aria-current={active ? 'true' : undefined}
      aria-label={chip.ariaLabel}
      className={`flex w-[4.25rem] shrink-0 touch-manipulation select-none flex-col items-center justify-center rounded-xl border px-2 py-2 transition-[border-color,background-color,box-shadow,color] duration-200 ${
        active
          ? 'border-zinc-700 bg-zinc-900 shadow-sm ring-1 ring-white/10'
          : 'border-zinc-800/90 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/65'
      } [-webkit-tap-highlight-color:transparent]`}
    >
      <span
        className={`text-[10px] font-medium uppercase tracking-wide ${
          active ? 'text-zinc-500' : 'text-zinc-600'
        }`}
      >
        {isAllTime ? 'All' : chip.yearLabel.slice(2)}
      </span>
      <span
        className={`font-semibold leading-tight ${
          active ? 'text-lg' : 'text-sm text-zinc-300'
        }`}
        style={active ? { color: accentFg } : undefined}
      >
        {isAllTime ? 'time' : chip.monthLabel}
      </span>
    </button>
  )
})

export function LeaderboardMonthChips({ chips, activePeriodId, accent }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const fadeFrameRef = useRef<number | null>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)
  const [selectedId, setSelectedId] = useState(activePeriodId)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setSelectedId(activePeriodId)
  }, [activePeriodId])

  const displayActiveId = selectedId

  useEffect(() => {
    const container = scrollRef.current
    const active = activeRef.current
    if (!container || !active) return

    const targetLeft =
      active.offsetLeft - container.clientWidth / 2 + active.offsetWidth / 2
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [displayActiveId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateFades = () => {
      if (fadeFrameRef.current != null) return
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

  const selectPeriod = useCallback(
    (periodId: LeaderboardPeriodId) => {
      if (periodId === displayActiveId) return

      setSelectedId(periodId)

      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'leaderboard')
      params.set('lb', periodId)
      params.delete('cal')
      params.delete('ev')
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
    <div className="relative -mx-5 mb-1 sm:-mx-6 md:mx-0">
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
        aria-label="Leaderboard period"
      >
        {chips.map((chip) => {
          const active = chip.id === displayActiveId
          return (
            <MonthChipButton
              key={chip.id}
              chip={chip}
              active={active}
              accentFg={accentFg}
              buttonRef={active ? activeRef : undefined}
              onSelect={selectPeriod}
            />
          )
        })}
      </div>
    </div>
  )
}
