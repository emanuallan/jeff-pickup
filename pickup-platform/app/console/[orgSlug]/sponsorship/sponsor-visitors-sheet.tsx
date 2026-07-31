'use client'

import { useCallback, useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { BottomSheetLoading } from '../../_components/bottom-sheet-loading'
import { ConsoleCard, btnOutline } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import type { SponsorLinkVisitorsBreakdown } from '@/lib/sponsor-link-clicks'

function visitLabel(count: number) {
  return `${count} visit${count === 1 ? '' : 's'}`
}

export function SponsorVisitorsSheet({
  orgSlug,
  sponsorshipId,
  sponsorName,
  archiveId = null,
  open,
  onClose,
}: {
  orgSlug: string
  sponsorshipId: string
  sponsorName: string
  archiveId?: string | null
  open: boolean
  onClose: () => void
}) {
  const toast = useConsoleToast()
  const [breakdown, setBreakdown] = useState<SponsorLinkVisitorsBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const csvHref = (() => {
    const params = new URLSearchParams({ format: 'csv' })
    if (archiveId) params.set('archiveId', archiveId)
    return `/api/console/${orgSlug}/sponsorship/${sponsorshipId}/visitors?${params}`
  })()

  const loadBreakdown = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setLoadFailed(false)
      try {
        const params = new URLSearchParams()
        if (archiveId) params.set('archiveId', archiveId)
        const qs = params.toString()
        const res = await fetch(
          `/api/console/${orgSlug}/sponsorship/${sponsorshipId}/visitors${qs ? `?${qs}` : ''}`,
          { signal },
        )
        if (!res.ok) throw new Error('Could not load visitors')
        const data = (await res.json()) as SponsorLinkVisitorsBreakdown
        setBreakdown(data)
      } catch (err) {
        if (signal.aborted) return
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
        setLoadFailed(true)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [archiveId, orgSlug, sponsorshipId, toast],
  )

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    void loadBreakdown(controller.signal)
    return () => controller.abort()
  }, [open, loadBreakdown])

  useEffect(() => {
    if (!open) {
      setBreakdown(null)
      setLoadFailed(false)
    }
  }, [open])

  const hasContent =
    breakdown &&
    (breakdown.known.length > 0 || breakdown.guests.visitor_count > 0)

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabelledby="sponsor-visitors-sheet-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sponsor-visitors-sheet-title" className="text-lg font-semibold text-zinc-50">
            Visitors · {sponsorName}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Signed-in participants by name; everyone else is grouped as guests.
            {archiveId ? ' Showing an archived period.' : ' Showing the current period.'}
          </p>
        </div>
        <a href={csvHref} className={`${btnOutline} shrink-0 min-h-9 px-3 py-1.5 text-xs`}>
          Export CSV
        </a>
      </div>

      <div className="mt-4" aria-busy={loading}>
        {loading ? (
          <BottomSheetLoading label="Loading visitors…" rows={4} />
        ) : loadFailed ? (
          <p className="text-sm text-zinc-500">Could not load visitor breakdown.</p>
        ) : !hasContent ? (
          <p className="text-sm text-zinc-500">No visits recorded for this period yet.</p>
        ) : (
          <ul className="space-y-2">
            {breakdown?.known.map((visitor) => (
              <ConsoleCard key={visitor.participant_id} className="min-w-0 text-sm">
                <div className="break-words font-medium text-zinc-100">{visitor.display_name}</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {visitor.first_name} {visitor.last_name}
                  {visitor.phone ? ` · ${visitor.phone}` : ''}
                </div>
                <div className="mt-0.5 text-xs text-zinc-600">{visitLabel(visitor.visit_count)}</div>
              </ConsoleCard>
            ))}
            {breakdown && breakdown.guests.visitor_count > 0 ? (
              <ConsoleCard className="min-w-0 text-sm">
                <div className="font-medium text-zinc-100">Guests</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {breakdown.guests.visitor_count} anonymous visitor
                  {breakdown.guests.visitor_count === 1 ? '' : 's'}
                </div>
                <div className="mt-0.5 text-xs text-zinc-600">
                  {visitLabel(breakdown.guests.visit_count)}
                </div>
              </ConsoleCard>
            ) : null}
          </ul>
        )}
      </div>
    </BottomSheet>
  )
}
