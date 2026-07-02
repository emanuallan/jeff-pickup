'use client'

import { useEffect, useState, useTransition } from 'react'
import type { EventStatus } from '@/lib/events'
import { updateEventStatus } from '../actions'
import { useConsoleToast } from '../_components/console-toast'

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
  const toast = useConsoleToast()
  const [status, setStatus] = useState(initialStatus)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  function handleChange(next: EventStatus) {
    if (next === status || pending) return

    const previous = status
    setStatus(next)

    startTransition(async () => {
      const result = await updateEventStatus(orgSlug, eventId, next)
      if (result && 'error' in result) {
        setStatus(previous)
        toast.error(result.error)
        return
      }

      toast.success('Saved')
    })
  }

  return (
    <div className="w-full shrink-0 sm:w-auto">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as EventStatus)}
        disabled={pending}
        aria-label="Session status"
        className={`min-h-11 w-full rounded-lg border bg-zinc-950/60 py-2 pl-3 pr-8 text-base font-medium outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50 sm:w-auto sm:py-1 sm:pl-2 sm:pr-7 sm:text-xs ${statusSelectClass[status]}`}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option} className="bg-zinc-900 text-zinc-100">
            {statusLabel(option)}
          </option>
        ))}
      </select>
    </div>
  )
}
