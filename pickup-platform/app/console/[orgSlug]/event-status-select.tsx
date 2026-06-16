'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { EventStatus } from '@/lib/events'
import { updateEventStatus } from '../actions'

const STATUS_OPTIONS: EventStatus[] = ['tentative', 'on', 'cancelled']

function statusLabel(status: EventStatus): string {
  if (status === 'on') return 'On'
  if (status === 'cancelled') return 'Cancelled'
  return 'Tentative'
}

const statusSelectClass: Record<EventStatus, string> = {
  cancelled: 'border-red-500/30 text-red-400',
  on: 'border-emerald-500/30 text-emerald-400',
  tentative: 'border-white/10 text-zinc-400',
}

type Props = {
  orgSlug: string
  eventId: string
  status: EventStatus
}

export function EventStatusSelect({ orgSlug, eventId, status: initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pending, startTransition] = useTransition()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  function handleChange(next: EventStatus) {
    if (next === status || pending) return

    const previous = status
    setError(null)
    setStatus(next)

    startTransition(async () => {
      const result = await updateEventStatus(orgSlug, eventId, next)
      if (result && 'error' in result) {
        setStatus(previous)
        setError(result.error)
        return
      }

      setSavedFlash(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSavedFlash(false), 2000)
    })
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {savedFlash ? (
          <span className="text-[11px] font-medium text-emerald-400" aria-live="polite">
            Saved
          </span>
        ) : null}
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value as EventStatus)}
          disabled={pending}
          aria-label="Session status"
          className={`rounded-lg border bg-zinc-950/60 py-1 pl-2 pr-7 text-xs font-medium outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50 ${statusSelectClass[status]}`}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-zinc-900 text-zinc-100">
              {statusLabel(option)}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  )
}
