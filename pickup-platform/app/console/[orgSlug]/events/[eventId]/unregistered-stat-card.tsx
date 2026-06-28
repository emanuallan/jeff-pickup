'use client'

import { useCallback, useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { BottomSheetLoading } from '../../../_components/bottom-sheet-loading'
import { ConsoleCard } from '../../../_components/console-ui'

type UnregisteredPerson = {
  participantId: string
  displayName: string
  firstName: string
  lastName: string
  phone: string
  leftAt: string
}

type Props = {
  orgSlug: string
  eventId: string
  count: number
  timezone: string
}

function formatLeftAt(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'UTC',
  })
}

function StatCardContent({
  count,
  interactive,
}: {
  count: number
  interactive: boolean
}) {
  return (
    <>
      <div className="tabular-nums text-2xl font-semibold text-zinc-50">{count}</div>
      <div className="text-xs font-medium text-zinc-400">Unregistered</div>
      <div className="text-[11px] text-zinc-600">
        {interactive ? 'Tap to see who left' : "People who left and didn't return"}
      </div>
    </>
  )
}

export function UnregisteredStatCard({ orgSlug, eventId, count, timezone }: Props) {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<UnregisteredPerson[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPeople = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/console/${orgSlug}/events/${eventId}/unregistered`,
        { signal },
      )

      if (!res.ok) {
        throw new Error('Could not load unregistered people')
      }

      const data = (await res.json()) as { people: UnregisteredPerson[] }
      setPeople(data.people)
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [orgSlug, eventId])

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    void loadPeople(controller.signal)

    return () => controller.abort()
  }, [open, loadPeople])

  const handleClose = () => {
    setOpen(false)
  }

  if (count === 0) {
    return (
      <ConsoleCard className="flex flex-col gap-1">
        <StatCardContent count={count} interactive={false} />
      </ConsoleCard>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left transition hover:border-white/20 hover:bg-zinc-900/60 active:bg-zinc-900/80"
      >
        <ConsoleCard className="flex flex-col gap-1">
          <StatCardContent count={count} interactive />
        </ConsoleCard>
      </button>

      <BottomSheet
        open={open}
        onClose={handleClose}
        ariaLabelledby="unregistered-sheet-title"
      >
        <h2 id="unregistered-sheet-title" className="text-lg font-semibold text-zinc-50">
          Unregistered ({count})
        </h2>
        <p className="mt-1 text-sm text-zinc-400">People who left and didn&apos;t come back.</p>

        <div className="mt-4" aria-busy={loading}>
          {loading ? (
            <BottomSheetLoading label="Loading unregistered people…" />
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : people && people.length === 0 ? (
            <p className="text-sm text-zinc-500">No one has unregistered yet.</p>
          ) : (
            <ul className="space-y-2">
              {people?.map((person) => (
                <ConsoleCard key={person.participantId} className="min-w-0 text-sm">
                  <div className="break-words font-medium text-zinc-100">{person.displayName}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {person.firstName} {person.lastName} · {person.phone}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600">
                    Left {formatLeftAt(person.leftAt, timezone)}
                  </div>
                </ConsoleCard>
              ))}
            </ul>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
