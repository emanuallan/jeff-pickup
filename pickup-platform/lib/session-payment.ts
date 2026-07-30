import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { clampGuestCount } from '@/lib/guest-signups'
import {
  DEFAULT_PLATFORM_FEE_PERCENT,
  formatPlatformFeePercent,
} from '@/lib/sponsorship'

export async function completePaidEventJoinFromCheckout(
  session: Stripe.Checkout.Session,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (session.metadata?.checkout_kind !== 'session_payment') {
    return { ok: false, reason: 'not_session_payment' }
  }

  const checkoutSessionId = session.id
  if (!checkoutSessionId) {
    return { ok: false, reason: 'missing_session_id' }
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  const admin = createAdminClient()
  const { error } = await admin.rpc('complete_paid_event_join', {
    p_stripe_checkout_session_id: checkoutSessionId,
    p_stripe_payment_intent_id: paymentIntentId,
  })

  if (error) {
    console.error('complete_paid_event_join failed', error.message)
    return { ok: false, reason: error.message }
  }

  return { ok: true }
}

/** Backup when Connect webhooks lag — sync checkout completion on return URL. */
export async function syncSessionPaymentCheckoutForOrg(
  orgId: string,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = createAdminClient()
  const { data: stripeAccount } = await admin
    .from('org_stripe_accounts')
    .select('stripe_account_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!stripeAccount?.stripe_account_id) {
    return { ok: false, reason: 'stripe_account_missing' }
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: stripeAccount.stripe_account_id },
  )

  if (session.status !== 'complete' && session.payment_status !== 'paid') {
    return { ok: false, reason: 'incomplete' }
  }

  if (session.metadata?.org_id !== orgId) {
    return { ok: false, reason: 'org_mismatch' }
  }

  return completePaidEventJoinFromCheckout(session)
}

export function formatPriceCents(cents: number, currency = 'usd'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export function isPaidSession(priceCents: number | null | undefined): boolean {
  return (priceCents ?? 0) > 0
}

/** Joiner + guests — paid sessions charge per person. */
export function paidSessionHeadcount(guestCount: number): number {
  return 1 + clampGuestCount(guestCount)
}

/** Total charge in cents: session fee × (you + guests). */
export function sessionPaymentTotalCents(
  priceCentsPerPerson: number,
  guestCount: number,
): number {
  if (!Number.isFinite(priceCentsPerPerson) || priceCentsPerPerson <= 0) return 0
  return Math.round(priceCentsPerPerson) * paidSessionHeadcount(guestCount)
}

/** Platform cut taken from the connected account via Stripe application_fee_amount. */
export function sessionPaymentPlatformFeeCents(
  amountCents: number,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  const pct = Number.isFinite(platformFeePercent)
    ? platformFeePercent
    : DEFAULT_PLATFORM_FEE_PERCENT
  return Math.max(0, Math.round((amountCents * pct) / 100))
}

/** What the group keeps after the platform fee (before Stripe card processing). */
export function sessionPaymentOrganizerShareCents(
  amountCents: number,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  return Math.max(
    0,
    Math.round(amountCents) - sessionPaymentPlatformFeeCents(amountCents, platformFeePercent),
  )
}

/** Official Stripe pricing page — fees vary by country and payment method. */
export const STRIPE_PROCESSING_FEES_URL = 'https://stripe.com/pricing'

export type EventPaymentOverviewInput = {
  amount_cents: number
  status: string
  guest_count: number
  signup_id?: string | null
  participant_id?: string | null
}

export type SessionPaymentOverview = {
  completedCount: number
  pendingCount: number
  failedCount: number
  refundedCount: number
  collectedCents: number
  platformFeeCents: number
  organizerShareCents: number
  /** People covered by completed payments (payer + guests). */
  paidHeadcount: number
}

/** Quick-glance console stats from event_payments rows (not a Stripe ledger). */
export function buildSessionPaymentOverview(
  payments: EventPaymentOverviewInput[],
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): SessionPaymentOverview {
  let completedCount = 0
  let pendingCount = 0
  let failedCount = 0
  let refundedCount = 0
  let collectedCents = 0
  let paidHeadcount = 0

  for (const payment of payments) {
    switch (payment.status) {
      case 'completed':
        completedCount += 1
        collectedCents += Math.max(0, Math.round(payment.amount_cents))
        paidHeadcount += paidSessionHeadcount(payment.guest_count)
        break
      case 'pending':
        pendingCount += 1
        break
      case 'failed':
        failedCount += 1
        break
      case 'refunded':
        refundedCount += 1
        break
      default:
        break
    }
  }

  return {
    completedCount,
    pendingCount,
    failedCount,
    refundedCount,
    collectedCents,
    platformFeeCents: sessionPaymentPlatformFeeCents(collectedCents, platformFeePercent),
    organizerShareCents: sessionPaymentOrganizerShareCents(collectedCents, platformFeePercent),
    paidHeadcount,
  }
}

export type AbandonedCheckoutInput = {
  id: string
  status: string
  participant_id: string | null
  guest_count: number
  amount_cents: number
  created_at: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

export type AbandonedCheckoutPerson = {
  paymentId: string
  participantId: string | null
  displayName: string
  firstName: string
  lastName: string
  phone: string
  guestCount: number
  amountCents: number
  abandonedAt: string
}

/**
 * Pending checkouts for people who never completed payment on this session.
 * Dedupes by participant (latest pending wins). Excludes anyone with a completed payment.
 */
export function buildAbandonedCheckouts(
  payments: AbandonedCheckoutInput[],
): AbandonedCheckoutPerson[] {
  const completedParticipantIds = new Set<string>()
  for (const payment of payments) {
    if (payment.status === 'completed' && payment.participant_id) {
      completedParticipantIds.add(payment.participant_id)
    }
  }

  const latestByKey = new Map<string, AbandonedCheckoutInput>()
  let anonymousIndex = 0

  for (const payment of payments) {
    if (payment.status !== 'pending') continue
    if (payment.participant_id && completedParticipantIds.has(payment.participant_id)) {
      continue
    }

    const key = payment.participant_id ?? `anon:${payment.id}:${anonymousIndex++}`
    const existing = latestByKey.get(key)
    if (!existing || payment.created_at > existing.created_at) {
      latestByKey.set(key, payment)
    }
  }

  return [...latestByKey.values()]
    .map((payment) => {
      const firstName = (payment.first_name ?? '').trim()
      const lastName = (payment.last_name ?? '').trim()
      const displayName =
        (payment.display_name ?? '').trim() ||
        [firstName, lastName].filter(Boolean).join(' ') ||
        'Unknown'
      return {
        paymentId: payment.id,
        participantId: payment.participant_id,
        displayName,
        firstName,
        lastName,
        phone: (payment.phone ?? '').trim(),
        guestCount: payment.guest_count,
        amountCents: payment.amount_cents,
        abandonedAt: payment.created_at,
      }
    })
    .sort((a, b) => b.abandonedAt.localeCompare(a.abandonedAt))
}

/** Console copy for organizers setting a per-person session fee (link Stripe fees in UI). */
export function sessionFeeOrganizerPayoutHint(
  priceCents: number | null,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): string {
  const feeLabel = formatPlatformFeePercent(platformFeePercent)
  if (priceCents == null || priceCents <= 0) {
    return `Leave blank for free. For paid sessions, players pay the fee you set. Organizr keeps ${feeLabel}% from each payment; Stripe also deducts card processing fees from your payout.`
  }

  const charge = formatPriceCents(priceCents)
  const platformFee = formatPriceCents(
    sessionPaymentPlatformFeeCents(priceCents, platformFeePercent),
  )
  const share = formatPriceCents(
    sessionPaymentOrganizerShareCents(priceCents, platformFeePercent),
  )
  return `Players pay ${charge}. Organizr keeps ${feeLabel}% (${platformFee}), so about ${share} reaches your Stripe balance before Stripe deducts card processing fees.`
}
