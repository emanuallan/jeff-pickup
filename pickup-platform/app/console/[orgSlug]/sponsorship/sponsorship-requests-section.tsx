'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  approveSponsorship,
  cancelSponsorship,
  declineSponsorship,
  setSponsorshipHidden,
} from '../../sponsorship-actions'
import { btnOutline, btnPrimary, ConsoleSection } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import {
  formatSponsorshipConsoleDate,
  formatTierPrice,
  isSponsorshipCancelMode,
  sponsorshipHistoryDateIso,
  sponsorshipHistoryStatusLabel,
  type SponsorshipCancelMode,
} from '@/lib/sponsorship'
import type { SponsorshipRow } from '@/lib/sponsorship.server'

type BusyAction = {
  id: string
  action: 'approve' | 'decline' | 'hide' | 'show' | 'cancel'
}

export function SponsorshipRequestsSection({
  orgSlug,
  pending,
  active,
  history,
}: {
  orgSlug: string
  pending: SponsorshipRow[]
  active: SponsorshipRow[]
  history: SponsorshipRow[]
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

  async function handleCancel(id: string, mode: SponsorshipCancelMode) {
    if (busy) return

    const confirmed =
      mode === 'refund_now'
        ? window.confirm(
            'Remove this sponsor now and refund their latest payment (minus platform and card fees)? Their logo comes down immediately.',
          )
        : window.confirm(
            'Stop future billing but keep their logo up until the current subscription period ends? Past payments are not refunded.',
          )
    if (!confirmed) return

    setBusy({ id, action: 'cancel' })
    try {
      const result = await cancelSponsorship(orgSlug, id, mode)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        mode === 'refund_now'
          ? 'Sponsor removed and latest payment refunded.'
          : 'Sponsorship will end after this period. Logo stays until then.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <ConsoleSection
        title={pending.length > 0 ? `Pending (${pending.length})` : 'Pending'}
        description="Approve a request before their logo goes live."
      >
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending sponsor requests.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((row) => {
              const rowBusy = isBusy(row.id)
              return (
                <SponsorshipRowCard
                  key={row.id}
                  row={row}
                  meta={`Requested ${formatSponsorshipConsoleDate(row.created_at)}`}
                  actions={
                    <>
                      <button
                        type="button"
                        className={`${btnPrimary} w-full sm:w-auto`}
                        disabled={Boolean(busy)}
                        onClick={() => handleApprove(row.id)}
                      >
                        {isBusy(row.id, 'approve') ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className={`${btnOutline} w-full sm:w-auto`}
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
      </ConsoleSection>

      <ConsoleSection
        title={active.length > 0 ? `Active (${active.length})` : 'Active'}
        description="Live sponsors on your public pages. Hide a logo anytime, or end the sponsorship."
      >
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">No approved sponsors yet.</p>
        ) : (
          <ul className="space-y-3">
            {active.map((row) => {
              const rowBusy = isBusy(row.id)
              const showing = row.status === 'hidden'
              const ending = Boolean(row.cancel_at_period_end)
              const endingLabel =
                ending && row.current_period_end
                  ? `Ends ${formatSponsorshipConsoleDate(row.current_period_end)}`
                  : ending
                    ? 'Ending after this period'
                    : null
              return (
                <SponsorshipRowCard
                  key={row.id}
                  row={row}
                  badge={
                    showing && endingLabel
                      ? `Hidden · ${endingLabel}`
                      : showing
                        ? 'Hidden'
                        : endingLabel
                  }
                  meta={
                    row.approved_at
                      ? `Approved ${formatSponsorshipConsoleDate(row.approved_at)}`
                      : undefined
                  }
                  actions={
                    <>
                      {showing ? (
                        <button
                          type="button"
                          className={`${btnOutline} w-full sm:w-auto`}
                          disabled={Boolean(busy)}
                          onClick={() => handleHidden(row.id, false)}
                        >
                          {isBusy(row.id, 'show') ? 'Showing…' : 'Show'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${btnOutline} w-full sm:w-auto`}
                          disabled={Boolean(busy)}
                          onClick={() => handleHidden(row.id, true)}
                        >
                          {isBusy(row.id, 'hide') ? 'Hiding…' : 'Hide'}
                        </button>
                      )}
                      {ending ? null : (
                        <label className="block w-full sm:w-auto">
                          <span className="sr-only">End sponsorship</span>
                          <select
                            className={`${btnOutline} w-full appearance-none sm:w-auto`}
                            disabled={Boolean(busy)}
                            defaultValue=""
                            onChange={(event) => {
                              const value = event.target.value
                              event.target.value = ''
                              if (!isSponsorshipCancelMode(value)) return
                              void handleCancel(row.id, value)
                            }}
                          >
                            <option value="" disabled>
                              {isBusy(row.id, 'cancel') ? 'Ending…' : 'End sponsorship…'}
                            </option>
                            <option value="refund_now">
                              Remove now + refund last payment
                            </option>
                            <option value="end_of_period">
                              Keep until period ends (no refund)
                            </option>
                          </select>
                        </label>
                      )}
                    </>
                  }
                  dimmed={rowBusy}
                />
              )
            })}
          </ul>
        )}
      </ConsoleSection>

      <ConsoleSection
        title={history.length > 0 ? `History (${history.length})` : 'History'}
        description="Declined, canceled, and failed requests."
        collapsible
        defaultOpen={false}
      >
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No past sponsorship requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((row) => (
              <SponsorshipRowCard
                key={row.id}
                row={row}
                badge={sponsorshipHistoryStatusLabel(row.status)}
                meta={formatSponsorshipConsoleDate(sponsorshipHistoryDateIso(row))}
              />
            ))}
          </ul>
        )}
      </ConsoleSection>
    </div>
  )
}

function SponsorshipRowCard({
  row,
  actions,
  badge,
  meta,
  dimmed = false,
}: {
  row: SponsorshipRow
  actions?: ReactNode
  badge?: string | null
  meta?: string
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
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate font-medium text-zinc-100">{row.sponsor_name}</p>
            {badge ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500">
            {row.tier_name} · {formatTierPrice(row.monthly_amount_cents, row.currency)}/month
            {meta ? ` · ${meta}` : ''}
          </p>
          {row.sponsor_message ? (
            <p className="mt-1 text-xs text-zinc-400">{row.sponsor_message}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row">{actions}</div>
      ) : null}
    </li>
  )
}
