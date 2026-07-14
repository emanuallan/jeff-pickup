'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  approveSponsorship,
  cancelSponsorship,
  declineSponsorship,
} from '../../sponsorship-actions'
import { btnOutline, btnPrimary, ConsoleSection } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import {
  formatSponsorshipConsoleDate,
  formatTierPrice,
  type SponsorshipCancelMode,
  sponsorshipHistoryDateIso,
  sponsorshipHistoryStatusLabel,
} from '@/lib/sponsorship'
import type { SponsorshipRow } from '@/lib/sponsorship.server'

type BusyAction = {
  id: string
  action: 'approve' | 'decline' | 'cancel'
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

  async function handleCancel(id: string, mode: SponsorshipCancelMode) {
    if (busy) return

    const confirmed =
      mode === 'refund_now'
        ? window.confirm(
            'End this sponsorship now? Their logo comes down immediately, and their latest payment is refunded (minus platform and card fees).',
          )
        : window.confirm(
            'End billing after this period? Their logo stays up until the period ends. Past payments are not refunded.',
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
          ? 'Sponsorship ended and latest payment refunded.'
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
        description="Live sponsors on your public pages. End a sponsorship when you need to."
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
                    ending ? null : (
                      <EndSponsorshipMenu
                        disabled={Boolean(busy)}
                        busy={isBusy(row.id, 'cancel')}
                        onSelect={(mode) => void handleCancel(row.id, mode)}
                      />
                    )
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

function EndSponsorshipMenu({
  disabled,
  busy,
  onSelect,
}: {
  disabled: boolean
  busy: boolean
  onSelect: (mode: SponsorshipCancelMode) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (disabled || busy) setOpen(false)
  }, [disabled, busy])

  function choose(mode: SponsorshipCancelMode) {
    setOpen(false)
    onSelect(mode)
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        className={`${btnOutline} w-full gap-2 sm:w-auto`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {busy ? 'Ending…' : 'End sponsorship'}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`size-4 shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 w-[min(100vw-2.5rem,18rem)] overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/40 sm:w-72"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full flex-col gap-0.5 px-3.5 py-3 text-left transition hover:bg-white/5"
            onClick={() => choose('end_of_period')}
          >
            <span className="text-sm font-medium text-zinc-100">Let it finish this period</span>
            <span className="text-xs leading-relaxed text-zinc-500">
              Logo stays until the paid period ends. No refund.
            </span>
          </button>
          <div className="border-t border-white/5" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full flex-col gap-0.5 px-3.5 py-3 text-left transition hover:bg-white/5"
            onClick={() => choose('refund_now')}
          >
            <span className="text-sm font-medium text-zinc-100">End now and refund</span>
            <span className="text-xs leading-relaxed text-zinc-500">
              Logo comes down immediately. Latest payment refunded (fees kept).
            </span>
          </button>
        </div>
      ) : null}
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:justify-end">
          {actions}
        </div>
      ) : null}
    </li>
  )
}
