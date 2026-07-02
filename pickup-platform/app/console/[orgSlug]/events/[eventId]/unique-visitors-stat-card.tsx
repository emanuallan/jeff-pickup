'use client'

import { useCallback, useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { BottomSheetLoading } from '../../../_components/bottom-sheet-loading'
import { ConsoleCard } from '../../../_components/console-ui'
import { useConsoleToast } from '../../../_components/console-toast'

type KnownVisitor = {
  participantId: string
  displayName: string
  firstName: string
  lastName: string
  phone: string
  viewCount: number
}

type GuestVisitors = {
  visitorCount: number
  viewCount: number
}

type VisitorsBreakdown = {
  known: KnownVisitor[]
  guests: GuestVisitors
}

type Props = {
  orgSlug: string
  eventId: string
  count: number
}

function viewLabel(count: number) {
  return `${count} view${count === 1 ? '' : 's'}`
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
      <div className="text-xs font-medium text-zinc-400">Unique visitors</div>
      <div className="text-[11px] text-zinc-600">
        {interactive ? 'Tap to see who viewed' : 'Distinct people or devices'}
      </div>
    </>
  )
}

export function UniqueVisitorsStatCard({ orgSlug, eventId, count }: Props) {
  const toast = useConsoleToast()
  const [open, setOpen] = useState(false)
  const [breakdown, setBreakdown] = useState<VisitorsBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const loadBreakdown = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setLoadFailed(false)

    try {
      const res = await fetch(`/api/console/${orgSlug}/events/${eventId}/visitors`, { signal })

      if (!res.ok) {
        throw new Error('Could not load visitor breakdown')
      }

      const data = (await res.json()) as VisitorsBreakdown
      setBreakdown(data)
    } catch (err) {
      if (signal.aborted) return
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
      setLoadFailed(true)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [orgSlug, eventId, toast])

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    void loadBreakdown(controller.signal)

    return () => controller.abort()
  }, [open, loadBreakdown])

  if (count === 0) {
    return (
      <ConsoleCard className="flex flex-col gap-1">
        <StatCardContent count={count} interactive={false} />
      </ConsoleCard>
    )
  }

  const hasContent =
    breakdown &&
    (breakdown.known.length > 0 || breakdown.guests.visitorCount > 0)

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
        onClose={() => setOpen(false)}
        ariaLabelledby="visitors-sheet-title"
      >
        <h2 id="visitors-sheet-title" className="text-lg font-semibold text-zinc-50">
          Unique visitors ({count})
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Known participants by name; everyone else is grouped as guests.
        </p>

        <div className="mt-4" aria-busy={loading}>
          {loading ? (
            <BottomSheetLoading label="Loading visitors…" rows={Math.min(count, 4)} />
          ) : loadFailed ? (
            <p className="text-sm text-zinc-500">Could not load visitor breakdown.</p>
          ) : !hasContent ? (
            <p className="text-sm text-zinc-500">No page views recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {breakdown?.known.map((visitor) => (
                <ConsoleCard key={visitor.participantId} className="min-w-0 text-sm">
                  <div className="break-words font-medium text-zinc-100">{visitor.displayName}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {visitor.firstName} {visitor.lastName} · {visitor.phone}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600">{viewLabel(visitor.viewCount)}</div>
                </ConsoleCard>
              ))}
              {breakdown && breakdown.guests.visitorCount > 0 ? (
                <ConsoleCard className="min-w-0 text-sm">
                  <div className="font-medium text-zinc-100">Guests</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {breakdown.guests.visitorCount} anonymous visitor
                    {breakdown.guests.visitorCount === 1 ? '' : 's'}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600">
                    {viewLabel(breakdown.guests.viewCount)}
                  </div>
                </ConsoleCard>
              ) : null}
            </ul>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
