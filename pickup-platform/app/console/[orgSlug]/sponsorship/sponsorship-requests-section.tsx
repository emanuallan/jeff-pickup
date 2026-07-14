'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  approveSponsorship,
  declineSponsorship,
  setSponsorshipHidden,
} from '../../sponsorship-actions'
import { btnOutline, btnPrimary } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import { formatTierPrice } from '@/lib/sponsorship'
import type { SponsorshipRow } from '@/lib/sponsorship.server'

type BusyAction = {
  id: string
  action: 'approve' | 'decline' | 'hide' | 'show'
}

export function SponsorshipRequestsSection({
  orgSlug,
  pending,
  active,
}: {
  orgSlug: string
  pending: SponsorshipRow[]
  active: SponsorshipRow[]
}) {
  const toast = useConsoleToast()
  const [busy, setBusy] = useState<BusyAction | null>(null)

  function isBusy(id: string, action?: BusyAction['action']) {
    if (!busy || busy.id !== id) return false
    return action ? busy.action === action : true
  }

  async function handleApprove(id: string) {
    if (busy) return
    setBusy({ id, action: 'approve' })
    try {
      const result = await approveSponsorship(orgSlug, id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Sponsor approved.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDecline(id: string) {
    if (busy) return
    setBusy({ id, action: 'decline' })
    try {
      const result = await declineSponsorship(orgSlug, id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Sponsor declined and payment refunded.')
    } finally {
      setBusy(null)
    }
  }

  async function handleHidden(id: string, hidden: boolean) {
    if (busy) return
    setBusy({ id, action: hidden ? 'hide' : 'show' })
    try {
      const result = await setSponsorshipHidden(orgSlug, id, hidden)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(hidden ? 'Sponsor hidden.' : 'Sponsor shown again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium text-zinc-200">Pending requests</h3>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No pending sponsor requests.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((row) => {
              const rowBusy = isBusy(row.id)
              return (
                <SponsorshipRowCard
                  key={row.id}
                  row={row}
                  actions={
                    <>
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={Boolean(busy)}
                        onClick={() => handleApprove(row.id)}
                      >
                        {isBusy(row.id, 'approve') ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className={btnOutline}
                        disabled={Boolean(busy)}
                        onClick={() => handleDecline(row.id)}
                      >
                        {isBusy(row.id, 'decline') ? 'Declining…' : 'Decline'}
                      </button>
                    </>
                  }
                  dimmed={rowBusy}
                />
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200">Active sponsors</h3>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No approved sponsors yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {active.map((row) => {
              const rowBusy = isBusy(row.id)
              const showing = row.status === 'hidden'
              return (
                <SponsorshipRowCard
                  key={row.id}
                  row={row}
                  actions={
                    showing ? (
                      <button
                        type="button"
                        className={btnOutline}
                        disabled={Boolean(busy)}
                        onClick={() => handleHidden(row.id, false)}
                      >
                        {isBusy(row.id, 'show') ? 'Showing…' : 'Show'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btnOutline}
                        disabled={Boolean(busy)}
                        onClick={() => handleHidden(row.id, true)}
                      >
                        {isBusy(row.id, 'hide') ? 'Hiding…' : 'Hide'}
                      </button>
                    )
                  }
                  dimmed={rowBusy}
                />
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function SponsorshipRowCard({
  row,
  actions,
  dimmed = false,
}: {
  row: SponsorshipRow
  actions: ReactNode
  dimmed?: boolean
}) {
  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/30 p-4 sm:flex-row sm:items-center ${
        dimmed ? 'opacity-70' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Image
          src={row.logo_url}
          alt={row.sponsor_name}
          width={120}
          height={32}
          className="h-8 w-auto max-w-[120px] object-contain"
          unoptimized
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-100">{row.sponsor_name}</p>
          <p className="text-xs text-zinc-500">
            {row.tier_name} · {formatTierPrice(row.monthly_amount_cents, row.currency)}/month
          </p>
          {row.sponsor_message ? (
            <p className="mt-1 text-xs text-zinc-400">{row.sponsor_message}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">{actions}</div>
    </li>
  )
}
