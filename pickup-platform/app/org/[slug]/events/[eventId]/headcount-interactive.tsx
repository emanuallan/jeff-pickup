'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventSecretStats } from '@/lib/event-stats'
import { fetchEventSecretStats } from './secret-stats-actions'

const TAP_GOAL = 5
const TAP_RESET_MS = 2000

type Props = {
  orgSlug: string
  eventRef: string
  headcount: number
  capacity: number | null
  minPlayers: number | null
  accent: string
}

export function HeadcountInteractive({
  orgSlug,
  eventRef,
  headcount,
  capacity,
  minPlayers,
  accent,
}: Props) {
  const [taps, setTaps] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<EventSecretStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearResetTimer = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current)
      resetTimer.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => () => clearResetTimer(), [clearResetTimer])

  async function revealStats() {
    setOpen(true)
    setLoading(true)
    setError(null)
    const result = await fetchEventSecretStats(orgSlug, eventRef)
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setStats(result)
  }

  function handleHeadcountTap() {
    if (open) return
    clearResetTimer()
    const next = taps + 1
    setTaps(next)
    if (next >= TAP_GOAL) {
      setTaps(0)
      void revealStats()
      return
    }
    resetTimer.current = setTimeout(() => setTaps(0), TAP_RESET_MS)
  }

  const wiggle = taps >= 3 && taps < TAP_GOAL

  return (
    <>
      <button
        type="button"
        onClick={handleHeadcountTap}
        title="Tap a few times…"
        className={`rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-300 transition-transform select-none ${
          wiggle ? 'animate-pulse' : 'hover:bg-zinc-800'
        }`}
        aria-label={`${headcount} coming. Tap repeatedly for hidden stats.`}
      >
        <span className="font-semibold text-zinc-100">{headcount}</span>
        {capacity != null ? ` / ${capacity}` : ''} coming
      </button>

      {minPlayers != null ? (
        <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-400">
          min {minPlayers} participants
        </span>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="secret-stats-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="border-b border-zinc-800 px-5 py-4">
              <p id="secret-stats-title" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Hidden stats
              </p>
              <p className="mt-1 text-sm text-zinc-400">You found the good stuff.</p>
            </div>

            <div className="space-y-4 px-5 py-4 text-sm">
              {loading ? (
                <p className="text-zinc-500">Digging through the archives…</p>
              ) : error ? (
                <p className="text-red-300">{error}</p>
              ) : stats ? (
                <>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Record turnout ({stats.peak.scopeLabel})
                    </p>
                    <p className="mt-1 text-lg font-semibold text-zinc-100">
                      {stats.peak.peak > 0 ? (
                        <>
                          {stats.peak.peak} people
                          {stats.peak.when ? (
                            <span className="ml-1 text-sm font-normal text-zinc-400">
                              · {stats.peak.when}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-base font-normal text-zinc-400">No record yet</span>
                      )}
                    </p>
                  </div>

                  {stats.regulars.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Regular crew
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {stats.regulars.map((r) => (
                          <li
                            key={r.display_name}
                            className="flex items-center justify-between text-zinc-200"
                          >
                            <span>{r.display_name}</span>
                            <span className="text-zinc-500">{r.caps} caps</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {stats.yours ? (
                    <div
                      className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3"
                      style={{ borderColor: `${accent}33` }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Your stats
                      </p>
                      <p className="mt-1 text-zinc-200">
                        {stats.yours.caps} caps
                        {stats.yours.streakWeeks > 0 ? (
                          <span className="text-zinc-400">
                            {' '}
                            · {stats.yours.streakWeeks}-week streak
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Sign up to track your caps and streak here.
                    </p>
                  )}
                </>
              ) : null}
            </div>

            <div className="border-t border-zinc-800 px-5 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-lg py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
