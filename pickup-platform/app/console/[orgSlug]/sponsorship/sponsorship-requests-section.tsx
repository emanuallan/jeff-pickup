'use client'

import type { ReactNode } from 'react'
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

  async function handleApprove(id: string) {
    const result = await approveSponsorship(orgSlug, id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Sponsor approved.')
  }

  async function handleDecline(id: string) {
    const result = await declineSponsorship(orgSlug, id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Sponsor declined and payment refunded.')
  }

  async function handleHidden(id: string, hidden: boolean) {
    const result = await setSponsorshipHidden(orgSlug, id, hidden)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(hidden ? 'Sponsor hidden.' : 'Sponsor shown again.')
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium text-zinc-200">Pending requests</h3>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No pending sponsor requests.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((row) => (
              <SponsorshipRowCard
                key={row.id}
                row={row}
                actions={
                  <>
                    <button type="button" className={btnPrimary} onClick={() => handleApprove(row.id)}>
                      Approve
                    </button>
                    <button type="button" className={btnOutline} onClick={() => handleDecline(row.id)}>
                      Decline
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200">Active sponsors</h3>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No approved sponsors yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {active.map((row) => (
              <SponsorshipRowCard
                key={row.id}
                row={row}
                actions={
                  row.status === 'hidden' ? (
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() => handleHidden(row.id, false)}
                    >
                      Show
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() => handleHidden(row.id, true)}
                    >
                      Hide
                    </button>
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SponsorshipRowCard({
  row,
  actions,
}: {
  row: SponsorshipRow
  actions: React.ReactNode
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/30 p-4 sm:flex-row sm:items-center">
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
