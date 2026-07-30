import {
  buildAbandonedCheckouts,
  buildSessionPaymentOverview,
  formatPriceCents,
  STRIPE_PROCESSING_FEES_URL,
} from '@/lib/session-payment'
import type { EventPaymentRow } from '@/lib/session-payment.server'
import { formatPlatformFeePercent, DEFAULT_PLATFORM_FEE_PERCENT } from '@/lib/sponsorship'
import { ConsoleSection, btnOutline } from '../../../_components/console-ui'
import { AbandonedCheckoutsButton } from './abandoned-checkouts-button'

type Props = {
  priceCents: number
  payments: EventPaymentRow[]
  orgSlug: string
  stripeReady: boolean
  timezone: string
}

export function SessionPaymentsSection({
  priceCents,
  payments,
  orgSlug,
  stripeReady,
  timezone,
}: Props) {
  const overview = buildSessionPaymentOverview(payments)
  const abandoned = buildAbandonedCheckouts(payments)
  const feeLabel = formatPlatformFeePercent(DEFAULT_PLATFORM_FEE_PERCENT)
  const payoutsPath = `/api/console/${orgSlug}/sponsorship/payouts`

  const items = [
    {
      label: 'Collected',
      value: formatPriceCents(overview.collectedCents),
      hint:
        overview.completedCount > 0
          ? `${overview.completedCount} payment${overview.completedCount === 1 ? '' : 's'}`
          : 'No completed payments yet',
    },
    {
      label: 'Paid spots',
      value: String(overview.paidHeadcount),
      hint: `${formatPriceCents(priceCents)} per person`,
    },
    {
      label: 'Est. payout',
      value: formatPriceCents(overview.organizerShareCents),
      hint: 'Before Stripe card fees',
    },
  ]

  const statusHints: string[] = []
  if (overview.failedCount > 0) {
    statusHints.push(`${overview.failedCount} failed`)
  }
  if (overview.refundedCount > 0) {
    statusHints.push(`${overview.refundedCount} refunded`)
  }

  return (
    <ConsoleSection
      title="Payments"
      description="Checkout totals for this session. Bank payouts live in Stripe."
      action={
        stripeReady ? (
          <a
            href={payoutsPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            Open Stripe
          </a>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-3"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {item.label}
            </p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-50">{item.value}</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <AbandonedCheckoutsButton people={abandoned} timezone={timezone} />

      {statusHints.length > 0 ? (
        <p className="mt-3 text-xs text-zinc-500">{statusHints.join(' · ')}</p>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        A {feeLabel}% platform fee applies to each payment. Stripe also deducts{' '}
        <a
          href={STRIPE_PROCESSING_FEES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-300 underline-offset-2 hover:underline"
        >
          card processing fees
        </a>
        . Bank balances and transfers are managed in Stripe.
      </p>

      {stripeReady ? (
        <div className="mt-4">
          <a
            href={payoutsPath}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnOutline} w-full sm:w-auto`}
          >
            View balances in Stripe
          </a>
        </div>
      ) : null}
    </ConsoleSection>
  )
}

/** Completed payment amount for a roster signup, if any. */
export function completedPaymentForSignup(
  payments: EventPaymentRow[],
  signupId: string,
  participantId: string,
): EventPaymentRow | null {
  const bySignup = payments.find(
    (payment) => payment.status === 'completed' && payment.signup_id === signupId,
  )
  if (bySignup) return bySignup

  return (
    payments.find(
      (payment) => payment.status === 'completed' && payment.participant_id === participantId,
    ) ?? null
  )
}
