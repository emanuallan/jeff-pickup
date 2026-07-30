'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { formatPriceCents } from '@/lib/session-payment'
import type { SessionRefundPolicy } from '@/lib/stripe-connect'
import { btnOutline } from '../../../_components/console-ui'
import { useConsoleToast } from '../../../_components/console-toast'
import { removeSessionRosterSignup } from './edit/roster-actions'
import { refundSessionSignupPayment } from './payment-actions'

type Props = {
  orgSlug: string
  eventRef: string
  paymentId: string
  signupId: string
  participantName: string
  amountCents: number
  status: string
}

export function SessionPaymentBadge({
  orgSlug,
  eventRef,
  paymentId,
  signupId,
  participantName,
  amountCents,
  status,
}: Props) {
  const router = useRouter()
  const toast = useConsoleToast()
  const titleId = useId()
  const [phase, setPhase] = useState<'refund' | 'remove' | null>(null)
  const [busy, setBusy] = useState(false)
  const [locallyRefunded, setLocallyRefunded] = useState(status === 'refunded')
  const [refundedAmountCents, setRefundedAmountCents] = useState<number | null>(null)

  async function handleRefund(policy: SessionRefundPolicy) {
    setBusy(true)
    try {
      const result = await refundSessionSignupPayment(orgSlug, eventRef, paymentId, policy)
      if ('error' in result) {
        toast.error(result.error)
        return
      }

      setLocallyRefunded(true)
      setRefundedAmountCents(result.refundedAmountCents)
      setPhase('remove')
      toast.success('Payment refunded.')
    } catch {
      toast.error('Could not refund this payment. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function finishWithoutRemoval() {
    setPhase(null)
    router.refresh()
  }

  async function handleRemove() {
    setBusy(true)
    try {
      const result = await removeSessionRosterSignup(orgSlug, eventRef, signupId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setPhase(null)
      toast.success('Participant removed from the roster.')
      router.refresh()
    } catch {
      toast.error('Could not remove this participant.')
    } finally {
      setBusy(false)
    }
  }

  if (locallyRefunded) {
    return (
      <>
        <span className="shrink-0 rounded-md bg-zinc-500/10 px-2 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-inset ring-white/10">
          Refunded
        </span>
        <BottomSheet
          open={phase === 'remove'}
          onClose={finishWithoutRemoval}
          dismissDisabled={busy}
          ariaLabelledby={titleId}
        >
          <h2 id={titleId} className="text-lg font-semibold text-zinc-50">
            Remove {participantName}?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {refundedAmountCents != null
              ? `${formatPriceCents(refundedAmountCents)} was refunded. `
              : 'The payment was refunded. '}
            Removing them will open their roster spot. It will not automatically add anyone else.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemove()}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-500/25 transition hover:bg-red-500/25 disabled:opacity-50"
            >
              {busy ? 'Removing…' : 'Remove from roster'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={finishWithoutRemoval}
              className={`${btnOutline} flex-1`}
            >
              Keep on roster
            </button>
          </div>
        </BottomSheet>
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase('refund')}
        className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/20 transition hover:bg-emerald-500/20"
      >
        Paid {formatPriceCents(amountCents)}
      </button>

      <BottomSheet
        open={phase === 'refund'}
        onClose={() => setPhase(null)}
        dismissDisabled={busy}
        ariaLabelledby={titleId}
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-50">
          Refund {participantName}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Their checkout covered {formatPriceCents(amountCents)}. Choose what they receive back.
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRefund('retain_fees')}
            className="flex min-h-11 w-full flex-col rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10 disabled:opacity-50"
          >
            <span className="text-sm font-medium text-zinc-100">
              {busy ? 'Refunding…' : 'Refund minus fees'}
            </span>
            <span className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Returns the participant&apos;s portion. Platform and Stripe card fees stay deducted.
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRefund('full')}
            className="flex min-h-11 w-full flex-col rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left transition hover:bg-red-500/10 disabled:opacity-50"
          >
            <span className="text-sm font-medium text-red-300">Full refund</span>
            <span className="mt-0.5 text-xs leading-relaxed text-red-300/70">
              Returns the full charge and platform fee. The group will likely absorb Stripe&apos;s
              card fee.
            </span>
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
